import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { serverTransactions } from "@/lib/serverDb";
import { TilopayTransactionStatus } from "@/types";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

// Esquema de validación del payload recibido de Tilopay
const webhookSchema = z.object({
  orderNumber: z.string().min(1, "orderNumber es obligatorio."),
  status: z.string().min(1, "status es obligatorio."),
  transactionId: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  authCode: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "";

  try {
    // 1. Obtener payload crudo para validar la firma criptográfica con precisión
    const rawBody = await request.text();

    logger.info("Notificación de Webhook de pago recibida", {
      ip,
      userAgent,
      context: "payment-webhook-received",
      metadata: { bodyLength: rawBody.length }
    });

    // 2. Validar firma criptográfica HMAC-SHA256
    const incomingSignature = request.headers.get("x-tilopay-signature") || "";
    const webhookSecret = process.env.TILOPAY_WEBHOOK_SECRET || "BreezeGoTilopaySecret2026";

    const calculatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // En producción, es mandatorio que las firmas coincidan
    if (incomingSignature !== calculatedSignature) {
      logger.warn("Intento de Webhook con firma inválida o sospechosa", {
        ip,
        userAgent,
        context: "payment-webhook-invalid-signature",
        metadata: {
          receivedSignature: incomingSignature,
          calculatedSignature: calculatedSignature,
        }
      });
      return NextResponse.json({ success: false, error: "Firma inválida." }, { status: 401 });
    }

    // 3. Validar estructura del JSON
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (e) {
      logger.warn("Webhook recibió JSON malformado", { ip, userAgent, context: "payment-webhook-malformed-json" });
      return NextResponse.json({ success: false, error: "JSON inválido." }, { status: 400 });
    }

    const validationResult = webhookSchema.safeParse(parsedBody);
    if (!validationResult.success) {
      logger.warn("Estructura de Webhook no coincide con el esquema requerido", {
        ip,
        userAgent,
        context: "payment-webhook-schema-invalid",
        metadata: { errors: validationResult.error.errors }
      });
      return NextResponse.json({ success: false, error: "Datos del webhook inválidos." }, { status: 400 });
    }

    // 4. Sanitizar campos del webhook
    const validatedData = validationResult.data;
    const orderNumber = sanitize(validatedData.orderNumber);
    const status = sanitize(validatedData.status);
    const transactionId = validatedData.transactionId ? sanitize(validatedData.transactionId) : "";
    const paymentMethod = validatedData.paymentMethod ? sanitize(validatedData.paymentMethod) : "Credit/Debit Card";
    const authCode = validatedData.authCode ? sanitize(validatedData.authCode) : "";
    const errorMessage = validatedData.errorMessage ? sanitize(validatedData.errorMessage) : "";

    // 5. Buscar transacción coincidente en el ledger de base de datos en memoria
    const tx = serverTransactions[orderNumber];
    if (!tx) {
      logger.error("No se encontró la orden registrada localmente para la orden del Webhook", null, {
        ip,
        userAgent,
        context: "payment-webhook-tx-not-found",
        metadata: { orderNumber, transactionId }
      });
      return NextResponse.json({ success: false, error: "Transacción no encontrada." }, { status: 404 });
    }

    // Mapear estado
    let finalStatus: TilopayTransactionStatus = "pending";
    if (status === "approved" || status === "paid") {
      finalStatus = "paid";
    } else if (status === "rejected" || status === "failed") {
      finalStatus = "rejected";
    } else if (status === "refunded") {
      finalStatus = "refunded";
    }

    // 6. Actualizar registro en base de datos
    serverTransactions[orderNumber] = {
      ...tx,
      status: finalStatus,
      tilopayTxId: transactionId,
      paymentMethod,
      authCode,
      errorMessage,
      updatedAt: new Date().toISOString(),
    };

    // Si la transacción fue aprobada, actualizar la factura en Supabase
    if (finalStatus === "paid") {
      try {
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

        const { error: updateError } = await supabaseClient
          .from("invoices")
          .update({ is_paid: true })
          .eq("id", tx.invoiceId);

        if (updateError) {
          logger.error("Error al marcar factura como pagada en Supabase desde Webhook", updateError, { invoiceId: tx.invoiceId });
        } else {
          logger.info("Factura marcada como pagada en Supabase desde Webhook con éxito", { invoiceId: tx.invoiceId });
        }
      } catch (dbErr) {
        logger.error("Error al inicializar cliente de Supabase o conectar en Webhook", dbErr, { invoiceId: tx.invoiceId });
      }
    }

    logger.info("Transacción de pago actualizada con éxito desde Webhook", {
      ip,
      userAgent,
      context: "payment-webhook-success",
      metadata: {
        orderNumber,
        invoiceId: tx.invoiceId,
        oldStatus: tx.status,
        newStatus: finalStatus,
        tilopayTxId: transactionId,
        authCode
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error("Error crítico procesando Webhook de Tilopay", error, { ip, userAgent });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
