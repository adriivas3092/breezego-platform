import { NextResponse } from "next/server";

export async function GET(req: Request) {
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
      return NextResponse.json({ success: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    }

    const resSpec = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    const schema = await resSpec.json();
    
    return NextResponse.json({
      success: true,
      profilesDefinition: schema.definitions?.profiles || null,
      packagesDefinition: schema.definitions?.packages || null,
      invoicesDefinition: schema.definitions?.invoices || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
