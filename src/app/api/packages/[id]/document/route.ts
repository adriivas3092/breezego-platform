import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { generatePackageDocumentPdf } from "@/lib/invoiceHelper";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const packageId = params.id;
  const { searchParams } = new URL(request.url);
  const passcode = searchParams.get("passcode") || request.headers.get("x-admin-passcode");

  try {
    // 1. Autenticación: admin (passcode) o cliente (token/cookie)
    let userId: string | null = null;
    let isAdmin = false;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
        const { data: { user }, error: authError } = await authClient.auth.getUser(token);
        if (!authError && user) userId = user.id;
      }
    }

    if (!isAdmin && !userId) {
      logger.warn("Intento de descarga de documento de paquete no autorizado", { metadata: { packageId } });
      return NextResponse.json({ success: false, error: "No autorizado. Sesión inválida o expirada." }, { status: 401 });
    }

    // 2. Cliente service-role (ignora RLS) para leer paquete, perfil y factura
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseKey = (serviceRoleKey && serviceRoleKey !== "undefined" && serviceRoleKey.length > 0)
      ? serviceRoleKey
      : supabaseAnonKey;
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 3. Paquete
    const { data: pkg, error: pkgError } = await supabaseClient
      .from("packages")
      .select("*")
      .eq("id", packageId)
      .single();

    if (pkgError || !pkg) {
      logger.error("Documento: paquete no encontrado", pkgError, { metadata: { packageId } });
      return NextResponse.json({ success: false, error: "Paquete no encontrado." }, { status: 404 });
    }

    // Verificar propiedad si no es admin
    if (!isAdmin && pkg.user_id !== userId) {
      logger.warn("Cliente intentó descargar documento de paquete ajeno", { metadata: { userId, pkgUserId: pkg.user_id, packageId } });
      return NextResponse.json({ success: false, error: "No autorizado para ver este paquete." }, { status: 403 });
    }

    // 4. Perfil del cliente
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", pkg.user_id)
      .single();

    // 5. Factura asociada (opcional)
    const { data: invoice } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("package_id", packageId)
      .maybeSingle();

    // 6. Generar PDF
    const pdfBuffer = await generatePackageDocumentPdf(pkg, {
      fullName: profile?.full_name || "Cliente BreezeGo",
      email: profile?.email,
      phone: profile?.phone,
      address: profile?.address,
      suiteCode: profile?.suite_code,
      idCard: profile?.id_card,
    }, invoice || undefined);

    const pdfFilename = `BreezeGo_Paquete_${String(pkg.id).substring(0, 8).toUpperCase()}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfFilename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error("Error crítico al generar documento de paquete", error, { metadata: { packageId } });
    return NextResponse.json({ success: false, error: "Error interno al generar el documento." }, { status: 500 });
  }
}
