import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { isTilopayConfigured, tilopayLogin, tilopayProcessPayment } from "@/lib/tilopay";
import { createPayment } from "@/lib/paymentsDb";
import { verifyAdminAuth } from "@/lib/adminAuth";

const checkoutSchema = z.object({
  invoiceId: z.string().min(1, "El ID de factura es obligatorio."),
});

export async function POST(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "";

  try {
    // 1. Autenticación: o un admin del CRM (passcode) o el cliente dueño (token de Supabase).
    //    El admin puede generar el enlace de pago de cualquier factura; el cliente solo la suya.
    const adminPasscode = request.headers.get("x-admin-passcode") || "";
    const isAdmin = adminPasscode ? verifyAdminAuth(adminPasscode) : false;

    let sessionUserId: string | null = null;
    let sessionUserEmail: string | null = null;
    if (!isAdmin) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader) {
        return NextResponse.json({ success: false, error: "No autorizado. Token faltante." }, { status: 401 });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json({ success: false, error: "No autorizado. Token inválido o sesión expirada." }, { status: 401 });
      }
      sessionUserId = user.id;
      sessionUserEmail = user.email || null;
    }

    // 2. Rate limit de pagos (cliente: 5/min; admin: 30/min para emitir varios enlaces).
    const rateLimitKey = isAdmin ? "checkout:admin" : `checkout:user:${sessionUserId}`;
    const paymentLimit = await checkRateLimit(rateLimitKey, isAdmin ? 30 : 5, 60);
    if (!paymentLimit.success) {
      return NextResponse.json({ success: false, error: "Has excedido el límite de transacciones por minuto. Espera unos instantes." }, { status: 429 });
    }

    // 3. Validar input
    const validationResult = checkoutSchema.safeParse(await request.json());
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: validationResult.error.errors[0].message }, { status: 400 });
    }
    const invoiceId = sanitize(validationResult.data.invoiceId);

    const txId = `tx_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // 4. Cliente Supabase con service role para leer factura y perfil
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      logger.error("Falta configuración de Supabase service role en checkout", null, { invoiceId });
      return NextResponse.json({ success: false, error: "Error de configuración del servidor." }, { status: 500 });
    }
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // 5. Validar la factura real (previene manipulación de montos)
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices").select("*").eq("id", invoiceId).single();
    if (invoiceError || !invoice) {
      return NextResponse.json({ success: false, error: "La factura no existe." }, { status: 404 });
    }
    // El cliente solo puede pagar su propia factura; el admin puede emitir el enlace de cualquiera.
    if (!isAdmin && invoice.user_id !== sessionUserId) {
      logger.warn("Usuario intentó pagar una factura ajena", { userId: sessionUserId || undefined, metadata: { invoiceUserId: invoice.user_id, invoiceId } });
      return NextResponse.json({ success: false, error: "No tienes permiso para pagar esta factura." }, { status: 403 });
    }
    if (invoice.is_paid) {
      return NextResponse.json({ success: false, error: "Esta factura ya ha sido pagada." }, { status: 400 });
    }

    // El pago se atribuye al dueño real de la factura (no al admin que genera el enlace).
    const ownerUserId = invoice.user_id;
    const amountUsd = Number(invoice.total_cost_usd);

    // Datos de facturación del cliente desde su perfil (email se guarda para validar el OrderHash de retorno)
    const { data: profile } = await supabaseClient
      .from("profiles").select("full_name, last_name, phone, address, email").eq("id", ownerUserId).single();
    const billingEmail = profile?.email || sessionUserEmail || "cliente@breezego.net";

    // 6. Registrar el pago en el ledger persistente (estado pendiente)
    await createPayment({ orderNumber: txId, userId: ownerUserId, invoiceId, amount: amountUsd, currency: "USD", status: "pending", customerEmail: billingEmail });

    logger.info("Iniciando checkout de pago", {
      ip, userAgent, userId: ownerUserId,
      context: "payment-checkout-init",
      metadata: { invoiceId, amountUsd, txId, viaAdmin: isAdmin },
    });

    // 7. Cobro real vía Tilopay (OBLIGATORIO: sin fallback simulado en producción.
    //    Antes caía a una página sandbox que firmaba un webhook con un secreto
    //    hardcodeado; eso se eliminó para evitar cualquier ruta de "pago" sin cobro real.)
    if (!isTilopayConfigured()) {
      logger.error("Tilopay no está configurado: no se puede iniciar el cobro", null, { txId, invoiceId });
      return NextResponse.json({ success: false, error: "El sistema de pagos no está disponible temporalmente. Intenta más tarde." }, { status: 503 });
    }

    const tlToken = await tilopayLogin();
    if (!tlToken) {
      logger.error("No se pudo autenticar con Tilopay", null, { txId, invoiceId });
      return NextResponse.json({ success: false, error: "No se pudo conectar con la pasarela de pago. Intenta de nuevo en unos minutos." }, { status: 502 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://breezego.net";
    const result = await tilopayProcessPayment({
      token: tlToken,
      amount: amountUsd,
      currency: "USD",
      orderNumber: txId,
      redirect: `${siteUrl}/payments/tilopay-return`,
      billing: {
        firstName: (profile?.full_name || "Cliente").replace(/^BEZG\s+/i, "").trim() || "Cliente",
        lastName: profile?.last_name || "BreezeGo",
        address: profile?.address || "San Jose",
        city: "San Jose",
        state: "SJ",
        zip: "10101",
        country: "CR",
        phone: profile?.phone || "00000000",
        email: billingEmail,
      },
    });

    if (!("url" in result)) {
      logger.error("Tilopay processPayment falló", null, { txId, invoiceId, metadata: { error: result.error } });
      return NextResponse.json({ success: false, error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 502 });
    }

    logger.info("URL de pago Tilopay generada", { ip, userId: ownerUserId, context: "payment-checkout-tilopay", metadata: { txId, invoiceId } });
    return NextResponse.json({ success: true, redirectUrl: result.url, sandbox: false });

  } catch (error) {
    logger.error("Error crítico en checkout de pagos", error, { ip, userAgent });
    return NextResponse.json({ success: false, error: "Error en el servidor al inicializar el checkout." }, { status: 500 });
  }
}
