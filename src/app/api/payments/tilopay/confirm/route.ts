import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { verifyTilopayOrderHash, computeTilopayOrderHash } from "@/lib/tilopay";
import { getPaymentByOrder, updatePaymentByOrder, markInvoicePaid, sendPaymentReceiptForInvoice } from "@/lib/paymentsDb";

// Parámetros que Tilopay agrega a la URL de retorno tras un pago hosted.
const confirmSchema = z.object({
  order: z.string().min(1),       // external_orden_id (nuestro orderNumber)
  tpt: z.string().min(1),         // id de transacción Tilopay
  code: z.string().min(1),        // responseCode ("00" = aprobada)
  auth: z.string().optional().default(""),
  orderHash: z.string().min(1),   // firma HMAC-SHA256 de Tilopay
});

export async function POST(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";

  try {
    const parsed = confirmSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Parámetros de retorno inválidos." }, { status: 400 });
    }
    const order = sanitize(parsed.data.order);
    const tpt = sanitize(parsed.data.tpt);
    const code = sanitize(parsed.data.code);
    const auth = sanitize(parsed.data.auth);
    const orderHash = sanitize(parsed.data.orderHash);

    // 1. Buscar el pago en el ledger
    const payment = await getPaymentByOrder(order);
    if (!payment) {
      logger.error("Confirm: orden no encontrada", null, { ip, metadata: { order } });
      return NextResponse.json({ success: false, error: "Orden no encontrada." }, { status: 404 });
    }

    // Idempotencia: si ya está pagada, no reprocesar
    if (payment.status === "paid") {
      return NextResponse.json({ success: true, paid: true, alreadyProcessed: true });
    }

    // 2. Validar la firma OrderHash V2 (única fuente de verdad: prueba que viene de Tilopay)
    const validHash = verifyTilopayOrderHash({
      tpt,
      order,
      code,
      auth,
      amount: Number(payment.amount),
      currency: payment.currency || "USD",
      email: payment.customer_email || "",
      orderHash,
    });

    if (!validHash) {
      // DIAGNÓSTICO (primera transacción real): permite validar el formato del hash desde los logs.
      const expected = computeTilopayOrderHash({
        tpt, order, code, auth,
        amount: Number(payment.amount),
        currency: payment.currency || "USD",
        email: payment.customer_email || "",
      });
      logger.warn("Confirm: OrderHash inválido", {
        ip,
        metadata: {
          order, tpt, code, auth,
          amount: Number(payment.amount), currency: payment.currency, email: payment.customer_email,
          receivedHash: orderHash, expectedHash: expected,
        },
      });
      return NextResponse.json({ success: false, error: "Firma de pago inválida." }, { status: 401 });
    }

    // 3. Firma válida: aplicar el resultado
    const approved = code === "00";
    await updatePaymentByOrder(order, {
      status: approved ? "paid" : "rejected",
      tilopayTransactionId: tpt,
      paidAt: approved ? new Date().toISOString() : null,
    });

    if (approved && payment.invoice_id) {
      // Devuelve true solo si esta llamada hizo la transición pendiente -> pagada.
      const justPaid = await markInvoicePaid(payment.invoice_id);
      if (justPaid) {
        // Comprobante de pago al cliente (idempotente: solo en la primera transición).
        await sendPaymentReceiptForInvoice(payment.invoice_id, tpt);
      }
    }

    logger.info("Confirm: pago procesado", {
      ip, context: "payment-confirm",
      metadata: { order, tpt, code, approved, invoiceId: payment.invoice_id },
    });

    return NextResponse.json({ success: true, paid: approved, code });
  } catch (error) {
    logger.error("Error en confirmación de pago Tilopay", error, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
