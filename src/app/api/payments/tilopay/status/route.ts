import { NextResponse } from "next/server";
import { serverTransactions } from "@/lib/serverDb";

import { supabase } from "@/lib/supabaseClient";

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

    const tx = serverTransactions[orderId];

    if (!tx) {
      return NextResponse.json({ success: false, error: "Transacción no encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      transaction: tx
    });

  } catch (error) {
    console.error("[Tilopay Status] Error al obtener estado de cobro:", error);
    return NextResponse.json({ success: false, error: "Error en el servidor." }, { status: 500 });
  }
}
