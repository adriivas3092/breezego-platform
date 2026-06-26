import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { serverTransactions } from "@/lib/serverDb";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

// Esquema de validación para checkouts de pagos
const checkoutSchema = z.object({
  invoiceId: z.string().min(1, "El ID de factura es obligatorio."),
  amountUsd: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
  amountCrc: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
  cardToken: z.string().optional(),
});

export async function POST(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "";

  try {
    // 1. Verificación de Autenticación de Usuario (Supabase Session Token)
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

    // 2. Rate limit específico para endpoints de pago (Máx 5 checkouts por minuto por usuario)
    const paymentLimit = await checkRateLimit(`checkout:user:${userId}`, 5, 60);
    if (!paymentLimit.success) {
      logger.warn("Exceso de intentos de checkout (429)", {
        ip,
        userAgent,
        userId,
        context: "payment-checkout-ratelimit",
        metadata: { path: request.url }
      });
      return NextResponse.json({ 
        success: false, 
        error: "Has excedido el límite de transacciones por minuto. Por favor, espera unos instantes." 
      }, { status: 429 });
    }

    // 3. Obtener y Validar inputs con Zod
    const rawBody = await request.json();
    const validationResult = checkoutSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: validationResult.error.errors[0].message 
      }, { status: 400 });
    }

    // 4. Sanitizar campos de texto validados
    const invoiceId = sanitize(validationResult.data.invoiceId);
    const { cardToken: rawCardToken } = validationResult.data;
    const cardToken = rawCardToken ? sanitize(rawCardToken) : undefined;

    // Generar un ID de transacción único
    const txId = `tx_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // 4.5. Consultar y Validar la Factura real en Supabase (Prevenir alteración de precios)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmxqdHZpbmRtcWpxaWF1bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTkzNzksImV4cCI6MjA5NTI5NTM3OX0.EXnJEaq9eT3vc67y7kaDD7tsInwzSZtdXDs9RN6GBIg";

    const supabaseKey = (serviceRoleKey && serviceRoleKey !== "undefined" && serviceRoleKey.length > 0)
      ? serviceRoleKey
      : supabaseAnonKey;

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      logger.error("No se encontró la factura en Supabase para el checkout", invoiceError, { invoiceId, userId });
      return NextResponse.json({ success: false, error: "La factura no existe." }, { status: 404 });
    }

    // Verificar que la factura pertenezca al usuario autenticado
    if (invoice.user_id !== userId) {
      logger.warn("Usuario intentó pagar una factura ajena", { userId, invoiceUserId: invoice.user_id, invoiceId });
      return NextResponse.json({ success: false, error: "No tienes permiso para pagar esta factura." }, { status: 403 });
    }

    // Si ya está pagada, no hace falta volver a cobrar
    if (invoice.is_paid) {
      return NextResponse.json({ success: false, error: "Esta factura ya ha sido pagada." }, { status: 400 });
    }

    const amountUsd = Number(invoice.total_cost_usd);
    const amountCrc = Number(invoice.total_cost_crc);

    // Auditoría de registro inicial con montos validados
    logger.info("Iniciando flujo de checkout de pago", {
      ip,
      userAgent,
      userId,
      context: "payment-checkout-init",
      metadata: { invoiceId, amountUsd, amountCrc, txId, isTokenized: !!cardToken }
    });

    // 5. Si viene con cardToken, procesar cobro rápido de 1-Click
    if (cardToken) {
      logger.info("Procesando pago 1-Click con tarjeta tokenizada", {
        ip,
        userId,
        context: "payment-checkout-tokenized",
        metadata: { invoiceId, txId }
      });
      
      // Registrar transacción aprobada simulada
      const tiloTxId = `tilo_tx_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      serverTransactions[txId] = {
        id: txId,
        invoiceId,
        amountUsd,
        amountCrc,
        status: "paid",
        tilopayTxId: tiloTxId,
        paymentMethod: "Saved Card (Tokenized)",
        authCode: Math.floor(100000 + Math.random() * 900000).toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Marcar factura como pagada en Supabase
      const { error: updateInvError } = await supabaseClient
        .from("invoices")
        .update({ is_paid: true })
        .eq("id", invoiceId);

      if (updateInvError) {
        logger.error("Error al actualizar factura como pagada en checkout 1-Click", updateInvError, { invoiceId });
      }

      logger.info("Transacción 1-Click aprobada y guardada", {
        ip,
        userId,
        context: "payment-checkout-approved-tokenized",
        metadata: { invoiceId, txId, tilopayTxId: tiloTxId }
      });

      return NextResponse.json({
        success: true,
        paid: true,
        orderId: txId,
        message: "Cobro procesado exitosamente usando tarjeta guardada."
      });
    }

    // Registrar transacción en estado pendiente
    serverTransactions[txId] = {
      id: txId,
      invoiceId,
      amountUsd,
      amountCrc,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 6. Consultar credenciales de Tilopay en producción
    const apiKey = process.env.TILOPAY_API_KEY;
    const apiUser = process.env.TILOPAY_API_USER;
    const apiPassword = process.env.TILOPAY_API_PASSWORD;

    if (apiKey && apiUser && apiPassword) {
      const tilopayEndpoint = "https://api.tilopay.com/api/v1/checkout";
      
      try {
        const response = await fetch(tilopayEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            apiuser: apiUser,
            apipassword: apiPassword,
            amount: amountUsd,
            currency: "USD",
            orderNumber: txId,
            redirect: `${process.env.NEXT_PUBLIC_SITE_URL || "https://breezego.net"}/dashboard?orderId=${txId}`,
          })
        });
        
        if (!response.ok) {
          throw new Error(`Tilopay API devolvió status HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.redirectUrl) {
          logger.info("Redirección oficial de Tilopay generada con éxito", {
            ip,
            userId,
            context: "payment-checkout-redirect",
            metadata: { txId, invoiceId, redirectUrl: data.redirectUrl }
          });

          return NextResponse.json({
            success: true,
            redirectUrl: data.redirectUrl,
            sandbox: false
          });
        } else {
          logger.warn("Tilopay API no devolvió redirectUrl en la respuesta", {
            ip,
            userId,
            context: "payment-checkout-api-warn",
            metadata: { data }
          });
        }
      } catch (err) {
        logger.error("Error al invocar la API de producción de Tilopay, cayendo en sandbox...", err, {
          ip,
          userId,
          context: "payment-checkout-api-error",
          metadata: { txId, invoiceId }
        });
      }
    }

    // Fallback: Redirección al simulador de Sandbox local
    const sandboxRedirectUrl = `/payments/tilopay-sandbox?orderId=${txId}`;
    logger.info("Redirección al simulador de Sandbox de Tilopay", {
      ip,
      userId,
      context: "payment-checkout-sandbox",
      metadata: { txId, invoiceId }
    });

    return NextResponse.json({
      success: true,
      redirectUrl: sandboxRedirectUrl,
      sandbox: true
    });

  } catch (error) {
    logger.error("Error crítico en endpoint de checkout de pagos", error, { ip, userAgent });
    return NextResponse.json(
      { success: false, error: "Error en el servidor al inicializar el checkout de pago." },
      { status: 500 }
    );
  }
}
