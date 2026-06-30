import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { TilopayTransactionStatus } from "@/types";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { getPaymentByOrder, updatePaymentByOrder, markInvoicePaid, sendPaymentReceiptForInvoice } from "@/lib/paymentsDb";

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
    const rawBody = await request.text();

    // 1. Validar firma HMAC-SHA256. Sin secreto configurado, se rechaza (no hay fallback inseguro).
    const incomingSignature = request.headers.get("x-tilopay-signature") || "";
    const webhookSecret = process.env.TILOPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("TILOPAY_WEBHOOK_SECRET no configurado: webhook rechazado", null, { ip });
      return NextResponse.json({ success: false, error: "Webhook no configurado." }, { status: 503 });
    }
    const calculatedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

    const sigOk =
      incomingSignature.length === calculatedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(incomingSignature), Buffer.from(calculatedSignature));
    if (!sigOk) {
      logger.warn("Webhook con firma inválida", { ip, userAgent, context: "payment-webhook-invalid-signature" });
      return NextResponse.json({ success: false, error: "Firma inválida." }, { status: 401 });
    }

    // 2. Validar JSON y esquema
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: "JSON inválido." }, { status: 400 });
    }
    const validationResult = webhookSchema.safeParse(parsedBody);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: "Datos del webhook inválidos." }, { status: 400 });
    }

    const orderNumber = sanitize(validationResult.data.orderNumber);
    const status = sanitize(validationResult.data.status);
    const transactionId = validationResult.data.transactionId ? sanitize(validationResult.data.transactionId) : "";

    // 3. Buscar el pago en el ledger persistente
    const payment = await getPaymentByOrder(orderNumber);
    if (!payment) {
      logger.error("Webhook: orden no encontrada en el ledger", null, { ip, context: "payment-webhook-tx-not-found", metadata: { orderNumber } });
      return NextResponse.json({ success: false, error: "Transacción no encontrada." }, { status: 404 });
    }

    let finalStatus: TilopayTransactionStatus = "pending";
    if (status === "approved" || status === "paid") finalStatus = "paid";
    else if (status === "rejected" || status === "failed") finalStatus = "rejected";
    else if (status === "refunded") finalStatus = "refunded";

    // 4. Actualizar el pago y, si fue aprobado, marcar la factura como pagada
    await updatePaymentByOrder(orderNumber, {
      status: finalStatus,
      tilopayTransactionId: transactionId,
      paidAt: finalStatus === "paid" ? new Date().toISOString() : null,
    });

    if (finalStatus === "paid" && payment.invoice_id) {
      // Devuelve true solo si esta llamada hizo la transición pendiente -> pagada.
      const justPaid = await markInvoicePaid(payment.invoice_id);
      if (justPaid) {
        // Comprobante de pago al cliente (idempotente: confirm y webhook no duplican).
        await sendPaymentReceiptForInvoice(payment.invoice_id, transactionId);
      }
    }

    logger.info("Webhook de pago procesado", {
      ip, userAgent, context: "payment-webhook-success",
      metadata: { orderNumber, invoiceId: payment.invoice_id, newStatus: finalStatus, tilopayTxId: transactionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error crítico procesando webhook de Tilopay", error, { ip, userAgent });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
