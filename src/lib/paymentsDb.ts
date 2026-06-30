// Ledger de pagos persistente sobre la tabla public.payments (vía service role).
// Reemplaza el almacenamiento en memoria (no fiable en serverless).
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateInvoicePdf, sendPaymentReceiptEmail } from "./invoiceHelper";
import { logger } from "./logger";

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "undefined") return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface PaymentRow {
  order_number: string;
  invoice_id: string | null;
  user_id: string | null;
  amount: number;
  currency: string;
  status: string;
  tilopay_transaction_id: string | null;
  customer_email: string | null;
  created_at?: string;
  paid_at?: string | null;
}

export async function createPayment(p: {
  orderNumber: string;
  userId: string;
  invoiceId: string;
  amount: number;
  currency?: string;
  status?: string;
  customerEmail?: string;
}): Promise<boolean> {
  const db = admin();
  if (!db) return false;
  const { error } = await db.from("payments").insert({
    order_number: p.orderNumber,
    user_id: p.userId,
    invoice_id: p.invoiceId,
    amount: p.amount,
    currency: p.currency || "USD",
    status: p.status || "pending",
    customer_email: p.customerEmail || null,
  });
  return !error;
}

export async function getPaymentByOrder(orderNumber: string): Promise<PaymentRow | null> {
  const db = admin();
  if (!db) return null;
  const { data } = await db.from("payments").select("*").eq("order_number", orderNumber).single();
  return (data as PaymentRow) || null;
}

export async function updatePaymentByOrder(
  orderNumber: string,
  fields: { status?: string; tilopayTransactionId?: string; paidAt?: string | null }
): Promise<boolean> {
  const db = admin();
  if (!db) return false;
  const patch: Record<string, unknown> = {};
  if (fields.status !== undefined) patch.status = fields.status;
  if (fields.tilopayTransactionId !== undefined) patch.tilopay_transaction_id = fields.tilopayTransactionId;
  if (fields.paidAt !== undefined) patch.paid_at = fields.paidAt;
  const { error } = await db.from("payments").update(patch).eq("order_number", orderNumber);
  return !error;
}

/**
 * Marca una factura como pagada SOLO si estaba pendiente (transición unpaid -> paid).
 * Devuelve true únicamente cuando esta llamada realizó la transición, lo que permite
 * disparar el comprobante de pago una sola vez (idempotencia entre confirm y webhook).
 */
export async function markInvoicePaid(invoiceId: string): Promise<boolean> {
  const db = admin();
  if (!db || !invoiceId) return false;
  const { data, error } = await db
    .from("invoices")
    .update({ is_paid: true })
    .eq("id", invoiceId)
    .eq("is_paid", false)
    .select("id");
  if (error) {
    logger.error("Error al marcar factura como pagada", error, { metadata: { invoiceId } });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Carga la factura, su paquete y el perfil del cliente, genera el PDF (ya en estado
 * PAGADA) y envía el comprobante de pago por correo. Pensado para ejecutarse tras una
 * transición exitosa a "paid". No lanza: cualquier fallo se registra y devuelve false.
 */
export async function sendPaymentReceiptForInvoice(
  invoiceId: string,
  transactionId?: string
): Promise<boolean> {
  const db = admin();
  if (!db || !invoiceId) return false;

  try {
    const { data: invoice, error: invErr } = await db
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();
    if (invErr || !invoice) {
      logger.error("Comprobante: factura no encontrada", invErr, { metadata: { invoiceId } });
      return false;
    }

    const { data: pkg } = await db
      .from("packages")
      .select("*")
      .eq("id", invoice.package_id)
      .single();

    const { data: profile } = await db
      .from("profiles")
      .select("*")
      .eq("id", invoice.user_id)
      .single();

    const toEmail = profile?.email || invoice.customer_email;
    if (!toEmail) {
      logger.warn("Comprobante: sin email de destino, envío omitido", { metadata: { invoiceId } });
      return false;
    }

    const pdfBuffer = await generateInvoicePdf(invoice, pkg, {
      fullName: profile?.full_name || "Cliente BreezeGo",
      email: profile?.email,
      phone: profile?.phone,
      address: profile?.address,
      suiteCode: profile?.suite_code,
    });
    const pdfFilename = `BreezeGo_Comprobante_${invoice.id.substring(0, 8).toUpperCase()}.pdf`;

    return await sendPaymentReceiptEmail(
      toEmail,
      profile?.full_name || "Cliente",
      invoice,
      pdfBuffer,
      pdfFilename,
      pkg,
      transactionId
    );
  } catch (err) {
    logger.error("Error al generar/enviar el comprobante de pago", err, { metadata: { invoiceId } });
    return false;
  }
}
