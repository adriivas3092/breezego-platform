import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // 1. Verificar autorización del administrador
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    const masterPassword = process.env.ADMIN_PASSWORD || "BreezeGoMaster2026";

    if (passcode !== masterPassword) {
      logger.warn("Intento de acceso no autorizado a la API de actualización de suite codes", { ip, userAgent });
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey || serviceRoleKey === "undefined" || serviceRoleKey.length === 0) {
      logger.error("Error: SUPABASE_SERVICE_ROLE_KEY no está definido.");
      return NextResponse.json({
        success: false,
        error: "El servidor no tiene configurada la clave de acceso de administrador (SUPABASE_SERVICE_ROLE_KEY)."
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 2. Obtener todos los perfiles
    const { data: profiles, error: pError } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (pError) {
      logger.error("Error al obtener perfiles para actualización", pError);
      return NextResponse.json({ success: false, error: "Error al obtener perfiles." }, { status: 500 });
    }

    const updatedUsers: any[] = [];
    let updatedCount = 0;

    // 3. Recorrer y actualizar perfiles y auth users
    for (const p of profiles || []) {
      const oldSuiteCode = p.suite_code || "";
      if (oldSuiteCode.includes("BZG") || oldSuiteCode.includes("BRG")) {
        const newSuiteCode = oldSuiteCode.replace("BZG", "BRG");

        // A. Actualizar la tabla profiles en la DB
        const { error: dbUpdateError } = await supabaseAdmin
          .from("profiles")
          .update({ suite_code: newSuiteCode })
          .eq("id", p.id);

        if (dbUpdateError) {
          logger.error(`Error al actualizar profile DB para usuario ${p.id}`, dbUpdateError);
        }

        // B. Actualizar auth.users metadata
        let authUpdateSuccess = false;
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(p.id);
          if (userData?.user) {
            const currentMeta = userData.user.user_metadata || {};
            const updatedMeta = { 
              ...currentMeta,
              suiteCode: newSuiteCode,
              suite_code: newSuiteCode
            };

            const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(p.id, {
              user_metadata: updatedMeta
            });

            if (authUpdateError) {
              logger.error(`Error al actualizar metadata de Auth para usuario ${p.id}`, authUpdateError);
            } else {
              authUpdateSuccess = true;
            }
          }
        } catch (authErr) {
          logger.error(`Excepción al actualizar auth para usuario ${p.id}`, authErr);
        }

        updatedCount++;
        updatedUsers.push({
          id: p.id,
          email: p.email,
          oldSuiteCode,
          newSuiteCode,
          authUpdated: authUpdateSuccess
        });
      }
    }

    logger.info("Actualización masiva de suite codes de clientes completada", {
      ip,
      updatedCount
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      updatedUsers
    });

  } catch (err: any) {
    logger.error("Error crítico en endpoint de actualización de suite codes", err, { ip });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
