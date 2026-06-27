import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_ANON_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmxqdHZpbmRtcWpxaWF1bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTkzNzksImV4cCI6MjA5NTI5NTM3OX0.EXnJEaq9eT3vc67y7kaDD7tsInwzSZtdXDs9RN6GBIg";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_FALLBACK;
  const key = (serviceRoleKey && serviceRoleKey !== "undefined" && serviceRoleKey.length > 0) ? serviceRoleKey : anonKey;
  return createClient(supabaseUrl, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET: lista completa de facturas (service role, ignora RLS). El panel admin no tiene
// sesión de Supabase, por eso necesita esta ruta en vez de leer con la anon key.
export async function GET(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    if (!verifyAdminAuth(passcode)) {
      logger.warn("Intento de acceso no autorizado a la API de administración de facturas", { ip, userAgent });
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const supabaseClient = getServiceClient();

    const { data: invs, error: dbError } = await supabaseClient
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("Error al consultar la tabla invoices en Supabase", dbError, { ip });
      return NextResponse.json({ success: false, error: "Falló la consulta de facturas." }, { status: 500 });
    }

    const formatted = (invs || []).map((inv: any) => ({
      id: inv.id,
      packageId: inv.package_id,
      userId: inv.user_id,
      fleteCost: Number(inv.flete_cost || 0),
      taxesCost: Number(inv.taxes_cost || 0),
      deliveryCost: Number(inv.delivery_cost || 0),
      totalCostUsd: Number(inv.total_cost_usd || 0),
      totalCostCrc: Number(inv.total_cost_crc || 0),
      isPaid: inv.is_paid,
      createdAt: inv.created_at,
    }));

    return NextResponse.json({ success: true, invoices: formatted });
  } catch (err: any) {
    logger.error("Error crítico en endpoint GET de administración de facturas", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}

// PATCH: marcar una factura como pagada / pendiente (service role). No hay política de
// UPDATE en invoices, así que el toggle desde el cliente con anon key estaba bloqueado.
export async function PATCH(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";

  try {
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    if (!verifyAdminAuth(passcode)) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const isPaid = body?.isPaid;
    if (!id || typeof isPaid !== "boolean") {
      return NextResponse.json({ success: false, error: "Parámetros inválidos (id, isPaid)." }, { status: 400 });
    }

    const supabaseClient = getServiceClient();
    const { data, error: dbError } = await supabaseClient
      .from("invoices")
      .update({ is_paid: isPaid })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      logger.error("Error al actualizar estado de pago de factura en Supabase", dbError, { ip });
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    logger.info("Estado de pago de factura actualizado por admin", { ip, metadata: { invoiceId: id, isPaid } });
    return NextResponse.json({ success: true, invoice: { id: data.id, isPaid: data.is_paid } });
  } catch (err: any) {
    logger.error("Error crítico en endpoint PATCH de administración de facturas", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
