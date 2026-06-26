import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    // 1. Verificar autorización del administrador (por header o por query parameter)
    const { searchParams } = new URL(req.url);
    const queryPasscode = searchParams.get("passcode") || "";
    
    const authHeader = req.headers.get("Authorization");
    const headerPasscode = authHeader?.replace("Bearer ", "") || "";
    
    const passcode = headerPasscode || queryPasscode;
    const masterPassword = process.env.ADMIN_PASSWORD || "BreezeGoMaster2026";

    if (passcode !== masterPassword) {
      logger.warn("Intento de acceso no autorizado a la API de migración de suites", { passcode });
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey || serviceRoleKey === "undefined" || serviceRoleKey.length === 0) {
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

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (profilesError) {
      return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 });
    }

    const results: any[] = [];

    for (const profile of (profiles || [])) {
      const rawName = (profile.full_name || "").trim();
      
      // Clean name: remove BZG, BRG, BEZG prefixes (case insensitive)
      const cleanName = rawName.replace(/^(?:[bB][rR][gG]|[bB][eE][zZ][gG]|[bB][zZ][gG])\s+/i, "").trim();
      
      // Split clean name into first word (Nombre) and remaining words (Apellido)
      const parts = cleanName.split(/\s+/);
      const firstName = parts[0] || "Cliente";
      const lastName = parts.slice(1).join(" ") || "BreezeGo";

      const targetFullName = `BEZG ${firstName}`;
      const targetLastName = lastName;

      // Suite code prefix update to BEZG
      let targetSuiteCode = profile.suite_code;
      if (targetSuiteCode) {
        targetSuiteCode = targetSuiteCode.replace(/^(?:BZG|BRG|BEZG)-/i, "BEZG-");
      }

      const id = profile.id;
      const changes: any = {
        id,
        email: profile.email,
        old_full_name: profile.full_name,
        old_last_name: profile.last_name,
        new_full_name: targetFullName,
        new_last_name: targetLastName,
        old_suite_code: profile.suite_code,
        new_suite_code: targetSuiteCode
      };

      // 1. Update profiles table
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: targetFullName,
          last_name: targetLastName,
          suite_code: targetSuiteCode
        })
        .eq("id", id);

      if (profileUpdateError) {
        changes.profile_error = profileUpdateError.message;
      }

      // 2. Update Auth metadata
      try {
        const { data: userData, error: fetchUserErr } = await supabaseAdmin.auth.admin.getUserById(id);
        if (fetchUserErr) {
          changes.auth_fetch_error = fetchUserErr.message;
        } else {
          const currentMeta = userData?.user?.user_metadata || {};
          const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: {
              ...currentMeta,
              fullName: targetFullName,
              lastName: targetLastName,
              last_name: targetLastName,
              suiteCode: targetSuiteCode
            }
          });
          if (authUpdateError) {
            changes.auth_update_error = authUpdateError.message;
          }
        }
      } catch (e: any) {
        changes.auth_error = e.message || String(e);
      }

      results.push(changes);
    }

    return NextResponse.json({
      success: true,
      migrated_count: results.length,
      details: results
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}
