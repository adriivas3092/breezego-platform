// Ledger de pagos persistente sobre la tabla public.payments (vía service role).
// Reemplaza el almacenamiento en memoria (no fiable en serverless).
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

export async function markInvoicePaid(invoiceId: string): Promise<boolean> {
  const db = admin();
  if (!db || !invoiceId) return false;
  const { error } = await db.from("invoices").update({ is_paid: true }).eq("id", invoiceId);
  return !error;
}
