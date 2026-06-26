import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { isTilopayConfigured, tilopayLogin, tilopayProcessPayment } from "@/lib/tilopay";
import { createPayment } from "@/lib/paymentsDb";

const checkoutSchema = z.object({
  invoiceId: z.string().min(1, "El ID de factura es obligatorio."),
});

export async function POST(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "";

  try {
    // 1. Autenticación del usuario (token de sesión de Supabase)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "No autorizado. Token faltante." }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "No autorizado. Token inválido o sesión expirada." }, { status: 401 });
    }
    const userId = user.id;

    // 2. Rate limit de pagos (5 por minuto por usuario)
    const paymentLimit = await checkRateLimit(`checkout:user:${userId}`, 5, 60);
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
    if (invoice.user_id !== userId) {
      logger.warn("Usuario intentó pagar una factura ajena", { userId, invoiceUserId: invoice.user_id, invoiceId });
      return NextResponse.json({ success: false, error: "No tienes permiso para pagar esta factura." }, { status: 403 });
    }
    if (invoice.is_paid) {
      return NextResponse.json({ success: false, error: "Esta factura ya ha sido pagada." }, { status: 400 });
    }

    const amountUsd = Number(invoice.total_cost_usd);

    // Datos de facturación del cliente desde su perfil (email se guarda para validar el OrderHash de retorno)
    const { data: profile } = await supabaseClient
      .from("profiles").select("full_name, last_name, phone, address, email").eq("id", userId).single();
    const billingEmail = profile?.email || user.email || "cliente@breezego.net";

    // 6. Registrar el pago en el ledger persistente (estado pendiente)
    await createPayment({ orderNumber: txId, userId, invoiceId, amount: amountUsd, currency: "USD", status: "pending", customerEmail: billingEmail });

    logger.info("Iniciando checkout de pago", {
      ip, userAgent, userId,
      context: "payment-checkout-init",
      metadata: { invoiceId, amountUsd, txId },
    });

    // 7. Cobro real vía Tilopay
    if (isTilopayConfigured()) {
      const tlToken = await tilopayLogin();
      if (tlToken) {
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

        if ("url" in result) {
          logger.info("URL de pago Tilopay generada", { ip, userId, context: "payment-checkout-tilopay", metadata: { txId, invoiceId } });
          return NextResponse.json({ success: true, redirectUrl: result.url, sandbox: false });
        }
        logger.error("Tilopay processPayment falló, usando sandbox", null, { txId, invoiceId, metadata: { error: result.error } });
      } else {
        logger.error("No se pudo autenticar con Tilopay, usando sandbox", null, { txId, invoiceId });
      }
    }

    // 8. Fallback: simulador sandbox (cuando Tilopay no está configurado o falla)
    return NextResponse.json({ success: true, redirectUrl: `/payments/tilopay-sandbox?orderId=${txId}`, sandbox: true });

  } catch (error) {
    logger.error("Error crítico en checkout de pagos", error, { ip, userAgent });
    return NextResponse.json({ success: false, error: "Error en el servidor al inicializar el checkout." }, { status: 500 });
  }
}
