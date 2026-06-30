import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Devuelve la factura comercial que el cliente subió en la prealerta, mediante un
// enlace firmado temporal (bucket privado). Acceso: admin (passcode) o el dueño.
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const packageId = params.id;
  const { searchParams } = new URL(request.url);
  const passcode = searchParams.get("passcode") || request.headers.get("x-admin-passcode");

  try {
    let userId: string | null = null;
    let isAdmin = false;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    // 1. Auth: admin por passcode, o cliente por token/cookie
    if (passcode && verifyAdminAuth(passcode)) {
      isAdmin = true;
    } else {
      let token = searchParams.get("token") || "";
      if (!token) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.replace("Bearer ", "");
        } else {
          const cookieHeader = request.headers.get("cookie") || "";
          const match = cookieHeader.match(/bz_auth_session=([^;]+)/);
          if (match) token = match[1];
        }
      }
      if (token && supabaseAnonKey) {
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error } = await authClient.auth.getUser(token);
        if (!error && user) userId = user.id;
      }
    }

    if (!isAdmin && !userId) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    // 2. Service role para leer el paquete y firmar el archivo (ignora RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseKey = (serviceRoleKey && serviceRoleKey !== "undefined" && serviceRoleKey.length > 0)
      ? serviceRoleKey
      : supabaseAnonKey;
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: pkg, error: pkgError } = await supabaseClient
      .from("packages")
      .select("id, user_id, invoice_url")
      .eq("id", packageId)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json({ success: false, error: "Paquete no encontrado." }, { status: 404 });
    }
    if (!isAdmin && pkg.user_id !== userId) {
      return NextResponse.json({ success: false, error: "No autorizado para ver este paquete." }, { status: 403 });
    }
    if (!pkg.invoice_url) {
      return NextResponse.json({ success: false, error: "Este paquete no tiene factura comercial adjunta." }, { status: 404 });
    }

    // 3. Compatibilidad: si es una URL completa (legado/público) se redirige directo.
    if (/^https?:\/\//i.test(pkg.invoice_url)) {
      return NextResponse.redirect(pkg.invoice_url);
    }

    // 4. Bucket privado: generar enlace firmado temporal (5 min) sobre la ruta guardada
    const { data: signed, error: signError } = await supabaseClient.storage
      .from("invoices")
      .createSignedUrl(pkg.invoice_url, 300);

    if (signError || !signed?.signedUrl) {
      logger.error("No se pudo firmar la factura comercial", signError, { metadata: { packageId } });
      return NextResponse.json({ success: false, error: "No se pudo generar el enlace de la factura." }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl);
  } catch (error) {
    logger.error("Error al obtener la factura comercial del paquete", error, { metadata: { packageId } });
    return NextResponse.json({ success: false, error: "Error interno." }, { status: 500 });
  }
}
