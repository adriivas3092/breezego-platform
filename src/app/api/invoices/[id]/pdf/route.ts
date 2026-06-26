import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateInvoicePdf } from "@/lib/invoiceHelper";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const invoiceId = params.id;
  const { searchParams } = new URL(request.url);
  const passcode = searchParams.get("passcode") || request.headers.get("x-admin-passcode");

  try {
    // 1. Authenticate user
    let userId: string | null = null;
    let isAdmin = false;

    // Check if admin passcode is provided
    const masterPassword = process.env.ADMIN_PASSWORD;
    if (passcode === masterPassword) {
      isAdmin = true;
    } else {
      // Authenticate via search param, Authorization header, or cookies
      let token = searchParams.get("token") || "";
      if (!token) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.replace("Bearer ", "");
        } else {
          // Try to get token from cookies
          const cookieHeader = request.headers.get("cookie") || "";
          const match = cookieHeader.match(/bz_auth_session=([^;]+)/);
          if (match) {
            token = match[1];
          }
        }
      }

      if (token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmxqdHZpbmRtcWpxaWF1bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTkzNzksImV4cCI6MjA5NTI5NTM3OX0.EXnJEaq9eT3vc67y7kaDD7tsInwzSZtdXDs9RN6GBIg";
        
        // Instantiate temporary client to get user from token
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await authClient.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
        }
      }
    }

    if (!isAdmin && !userId) {
      logger.warn("Intento de descarga de PDF no autorizado", { invoiceId });
      return NextResponse.json(
        { success: false, error: "No autorizado. Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    // 2. Fetch invoice and related package & profile using admin/service-role client
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

    // Fetch Invoice
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      logger.error("Error al buscar factura para PDF", invoiceError, { invoiceId });
      return NextResponse.json({ success: false, error: "Factura no encontrada." }, { status: 404 });
    }

    // Verify ownership if not admin
    if (!isAdmin && invoice.user_id !== userId) {
      logger.warn("Usuario intentó descargar PDF de factura ajena", { userId, invoiceUserId: invoice.user_id, invoiceId });
      return NextResponse.json({ success: false, error: "No autorizado para ver esta factura." }, { status: 403 });
    }

    // Fetch Package
    const { data: pkg, error: pkgError } = await supabaseClient
      .from("packages")
      .select("*")
      .eq("id", invoice.package_id)
      .single();

    if (pkgError || !pkg) {
      logger.error("Error al buscar paquete para PDF de factura", pkgError, { packageId: invoice.package_id });
      return NextResponse.json({ success: false, error: "Paquete asociado no encontrado." }, { status: 404 });
    }

    // Fetch Profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", invoice.user_id)
      .single();

    if (profileError || !profile) {
      logger.warn("No se encontró el perfil del cliente para el PDF de factura", { userId: invoice.user_id });
    }

    // 3. Generate PDF Buffer
    const pdfBuffer = await generateInvoicePdf(invoice, pkg, {
      fullName: profile?.full_name || "Cliente BreezeGo",
      email: profile?.email,
      phone: profile?.phone,
      address: profile?.address,
      suiteCode: profile?.suite_code
    });

    const pdfFilename = `BreezeGo_Factura_${invoice.id.substring(0, 8).toUpperCase()}.pdf`;

    // 4. Return PDF response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfFilename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    logger.error("Error crítico al generar PDF de factura", error, { invoiceId });
    return NextResponse.json({ success: false, error: "Error interno al generar el PDF." }, { status: 500 });
  }
}
