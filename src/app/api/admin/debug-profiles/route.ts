import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    const masterPassword = process.env.ADMIN_PASSWORD || "BreezeGoMaster2026";

    if (passcode !== masterPassword) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ success: false, error: "Falta service role key." }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: profiles, error: pError } = await supabaseAdmin
      .from("profiles")
      .select("*");

    const { data: authUsers, error: aError } = await supabaseAdmin.auth.admin.listUsers();

    return NextResponse.json({
      success: true,
      profiles,
      authUsersCount: authUsers?.users?.length || 0,
      authUsers: authUsers?.users?.map(u => ({
        id: u.id,
        email: u.email,
        metadata: u.user_metadata
      })),
      errors: { pError, aError }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
