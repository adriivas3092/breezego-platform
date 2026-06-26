import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getPaymentByOrder } from "@/lib/paymentsDb";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "No autorizado. Token faltante." }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "No autorizado. Token inválido." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Falta el ID de orden." }, { status: 400 });
    }

    const payment = await getPaymentByOrder(orderId);
    if (!payment || payment.user_id !== user.id) {
      return NextResponse.json({ success: false, error: "Transacción no encontrada." }, { status: 404 });
    }

    // Monto en CRC desde la factura asociada (para mostrar al usuario)
    let amountCrc = 0;
    if (payment.invoice_id) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
        const { data: inv } = await db.from("invoices").select("total_cost_crc").eq("id", payment.invoice_id).single();
        amountCrc = Number(inv?.total_cost_crc || 0);
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: payment.order_number,
        invoiceId: payment.invoice_id,
        status: payment.status,
        amountUsd: Number(payment.amount),
        amountCrc,
        tilopayTxId: payment.tilopay_transaction_id,
      },
    });
  } catch (error) {
    console.error("[Tilopay Status] Error:", error);
    return NextResponse.json({ success: false, error: "Error en el servidor." }, { status: 500 });
  }
}
