import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// GET: List all users (crossed with profiles table to ensure correct Suite Codes)
export async function GET(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // 1. Verificar autorización del administrador
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    const masterPassword = process.env.ADMIN_PASSWORD || "BreezeGoMaster2026";

    if (passcode !== masterPassword) {
      logger.warn("Intento de acceso no autorizado a la API de administración de usuarios", { ip, userAgent });
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 2. Ruta A: Si está configurado el SUPABASE_SERVICE_ROLE_KEY, listar de Supabase Auth cruzado con perfiles
    if (serviceRoleKey && serviceRoleKey !== "undefined" && serviceRoleKey.length > 0) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

        // Obtener usuarios de Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) {
          throw authError;
        }

        // Obtener perfiles de la base de datos (con service role key se salta RLS)
        const { data: profilesData, error: profilesError } = await supabaseAdmin
          .from("profiles")
          .select("*");

        if (profilesError) {
          logger.error("Error al consultar tabla profiles para cruce de datos en admin users API", profilesError);
        }

        const profilesMap = new Map();
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap.set(p.id, p);
          });
        }

        const formattedUsers = (authData?.users || []).map((u) => {
          const meta = u.user_metadata || {};
          const p = profilesMap.get(u.id) || {};

          return {
            id: u.id,
            email: u.email || p.email || "",
            fullName: p.full_name || meta.fullName || meta.full_name || "Cliente Real",
            lastName: p.last_name || meta.lastName || meta.last_name || "",
            phone: p.phone || meta.phone || meta.phone_number || u.phone || "",
            idCard: p.id_card || meta.idCard || meta.id_card || "",
            address: p.address || meta.address || "",
            deliveryMethod: p.delivery_method || meta.deliveryMethod || "gam",
            speedPreference: p.speed_preference || meta.speedPreference || "standard",
            suiteCode: p.suite_code || meta.suiteCode || "BEZG-XX",
            createdAt: u.created_at || p.created_at || new Date().toISOString(),
          };
        });

        // Ordenar de más reciente a más antiguo
        formattedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        logger.info("Usuarios de administración listados y cruzados con profiles (Service Role)", {
          ip,
          context: "admin-users-list-auth-crossed",
          metadata: { count: formattedUsers.length }
        });

        return NextResponse.json({ success: true, users: formattedUsers });

      } catch (authAdminError) {
        logger.error("Error al listar usuarios mediante Supabase Auth API, intentando fallback a base de datos...", authAdminError, { ip });
      }
    }

    // 3. Ruta B: Fallback - Listar desde profiles usando RPC seguro, o directo si no
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmxqdHZpbmRtcWpxaWF1bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTkzNzksImV4cCI6MjA5NTI5NTM3OX0.EXnJEaq9eT3vc67y7kaDD7tsInwzSZtdXDs9RN6GBIg";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    let profiles: any[] | null = null;
    let dbError: any = null;

    try {
      const { data, error } = await supabaseClient.rpc("get_all_profiles");
      if (!error && data) {
        profiles = data;
      } else {
        const { data: rawData, error: rawError } = await supabaseClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        profiles = rawData;
        dbError = rawError;
      }
    } catch (err) {
      const { data: rawData, error: rawError } = await supabaseClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      profiles = rawData;
      dbError = rawError;
    }

    if (dbError) {
      logger.error("Error al consultar la tabla profiles en Supabase", dbError, { ip });
      return NextResponse.json({ success: false, error: "Error al cargar perfiles de la base de datos." }, { status: 500 });
    }

    const formattedUsers = (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name || p.fullName || "Cliente Real",
      lastName: p.last_name || p.lastName || "",
      phone: p.phone || "",
      idCard: p.id_card || p.idCard || "",
      address: p.address || "",
      deliveryMethod: p.delivery_method || p.deliveryMethod || "gam",
      speedPreference: p.speed_preference || p.speedPreference || "standard",
      suiteCode: p.suite_code || p.suiteCode || "BEZG-XX",
      createdAt: p.created_at || new Date().toISOString(),
    }));

    logger.info("Usuarios de administración listados desde tabla 'profiles'", {
      ip,
      context: "admin-users-list-db",
      metadata: { count: formattedUsers.length }
    });

    return NextResponse.json({ success: true, users: formattedUsers });

  } catch (err: any) {
    logger.error("Error crítico en endpoint de administración de usuarios", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}

// POST: Create a new user (via admin)
export async function POST(req: Request) {
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

    const body = await req.json();
    const {
      email,
      fullName: rawFullName,
      phone,
      idCard,
      address,
      deliveryMethod,
      speedPreference,
      suiteCode,
      lastName: rawLastName
    } = body;

    const cleanName = (rawFullName || "").replace(/^(?:[bB][rR][gG]|[bB][eE][zZ][gG]|[bB][zZ][gG])\s+/i, "").trim();
    const fullName = `BEZG ${cleanName}`;
    const lastName = (rawLastName || "").trim();

    if (!email || !fullName || !lastName || !phone || !idCard) {
      return NextResponse.json({ success: false, error: "Faltan campos obligatorios para el registro (incluyendo Apellido)." }, { status: 400 });
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

    // Crear contraseña predeterminada para el nuevo usuario
    const defaultPassword = Math.random().toString(36).slice(-8) + "Aa1!";

    // 0.5. Generar o verificar suiteCode de manera segura en el servidor
    let finalSuiteCode = suiteCode;
    if (
      !finalSuiteCode || 
      finalSuiteCode === "BZG-001" || 
      finalSuiteCode === "BZG-XX" ||
      finalSuiteCode === "BEZG-001" || 
      finalSuiteCode === "BEZG-XX" ||
      finalSuiteCode === "BRG-001" || 
      finalSuiteCode === "BRG-XX"
    ) {
      let nextNum = 1;
      try {
        const { data: rpcNum, error: rpcError } = await supabaseAdmin.rpc("get_next_suite_number");
        if (!rpcError && rpcNum !== null) {
          nextNum = Number(rpcNum);
        } else {
          const { count, error: countError } = await supabaseAdmin
            .from("profiles")
            .select("id", { count: "exact", head: true });
          if (!countError && count !== null) {
            nextNum = count + 1;
          }
        }
      } catch (countErr) {
        logger.error("Error al contar perfiles para suiteCode en admin users API", countErr);
      }
      finalSuiteCode = `BEZG-${String(nextNum).padStart(3, "0")}`;
    }

    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        fullName: fullName.trim(),
        lastName: lastName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        idCard: idCard.trim(),
        address: address?.trim() || "",
        deliveryMethod: deliveryMethod || "gam",
        speedPreference: speedPreference || "standard",
        suiteCode: finalSuiteCode
      }
    });

    if (authError) {
      logger.error("Error al registrar cliente desde CRM en Supabase Auth", authError, { email });
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    const newUser = authData.user;

    // 2. Insertar el perfil en la tabla 'profiles'
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.id,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        id_card: idCard.trim(),
        address: address?.trim() || "",
        delivery_method: deliveryMethod || "gam",
        speed_preference: speedPreference || "standard",
        suite_code: finalSuiteCode
      }, { onConflict: "id" });

    if (profileError) {
      logger.error("Error al guardar perfil de usuario creado en CRM", profileError, { userId: newUser.id });
    }

    logger.info("Cliente creado con éxito desde el CRM", {
      userId: newUser.id,
      email,
      ip
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: fullName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        idCard: idCard.trim(),
        address: address?.trim() || "",
        deliveryMethod: deliveryMethod || "gam",
        speedPreference: speedPreference || "standard",
        suiteCode: finalSuiteCode || "BEZG-XX",
        createdAt: newUser.created_at
      }
    });

  } catch (err: any) {
    logger.error("Error crítico en endpoint POST de administración de usuarios", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}

// PUT: Update an existing user
export async function PUT(req: Request) {
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

    const body = await req.json();
    const {
      id,
      fullName: rawFullName,
      lastName: rawLastName,
      phone,
      idCard,
      address,
      deliveryMethod,
      speedPreference
    } = body;

    const cleanName = (rawFullName || "").replace(/^(?:[bB][rR][gG]|[bB][eE][zZ][gG]|[bB][zZ][gG])\s+/i, "").trim();
    const fullName = `BEZG ${cleanName}`;
    const lastName = (rawLastName || "").trim();

    if (!id || !fullName || !lastName || !phone || !idCard) {
      return NextResponse.json({ success: false, error: "Faltan campos obligatorios para actualizar el perfil." }, { status: 400 });
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

    // 1. Actualizar la tabla profiles en base de datos
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        id_card: idCard.trim(),
        address: address?.trim() || "",
        delivery_method: deliveryMethod || "gam",
        speed_preference: speedPreference || "standard"
      })
      .eq("id", id);

    if (profileError) {
      logger.error("Error al actualizar la tabla profiles en Supabase", profileError, { userId: id });
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    // 2. Actualizar user_metadata en Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        fullName: fullName.trim(),
        lastName: lastName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        idCard: idCard.trim(),
        address: address?.trim() || "",
        deliveryMethod: deliveryMethod || "gam",
        speedPreference: speedPreference || "standard"
      }
    });

    if (authError) {
      logger.error("Error al actualizar la metadata del usuario en Supabase Auth", authError, { userId: id });
    }

    logger.info("Cliente actualizado con éxito en CRM y Supabase", {
      userId: id,
      ip
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    logger.error("Error crítico en endpoint PUT de administración de usuarios", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}

// DELETE: Delete user
export async function DELETE(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // 1. Verificar autorización del administrador
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    const masterPassword = process.env.ADMIN_PASSWORD || "BreezeGoMaster2026";

    if (passcode !== masterPassword) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    // 2. Obtener el ID del usuario a eliminar
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Falta el ID del usuario." }, { status: 400 });
    }

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

    // 3. Obtener paquetes (packages) asociados al usuario para borrar sus facturas
    const { data: userPackages, error: fetchPkgsError } = await supabaseClient
      .from("packages")
      .select("id")
      .eq("user_id", id);

    if (fetchPkgsError) {
      logger.error("Error al obtener paquetes del usuario para eliminar", fetchPkgsError, { userId: id });
    }

    const pkgIds = userPackages?.map(p => p.id) || [];

    // 4. Eliminar facturas (invoices) asociadas a los paquetes del usuario
    if (pkgIds.length > 0) {
      const { error: invPkgError } = await supabaseClient
        .from("invoices")
        .delete()
        .in("package_id", pkgIds);
      if (invPkgError) {
        logger.error("Error al eliminar facturas por package_id", invPkgError, { pkgIds });
      }
    }

    // 5. Eliminar facturas (invoices) asociadas al usuario directamente (como fallback)
    const { error: invError } = await supabaseClient
      .from("invoices")
      .delete()
      .eq("user_id", id);
      
    if (invError) {
      logger.error("Error al eliminar facturas asociadas en Supabase", invError, { ip, userId: id });
    }

    // 6. Eliminar paquetes (packages) asociados al usuario
    const { error: pkgError } = await supabaseClient
      .from("packages")
      .delete()
      .eq("user_id", id);

    if (pkgError) {
      logger.error("Error al eliminar paquetes asociados en Supabase", pkgError, { ip, userId: id });
    }

    // 7. Eliminar perfil (profiles) en Supabase
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      logger.error("Error al eliminar perfil en Supabase", profileError, { ip, userId: id });
      return NextResponse.json({ success: false, error: `Error al eliminar perfil: ${profileError.message}` }, { status: 500 });
    }

    // 8. Eliminar el usuario de Supabase Auth (solo si es el cliente real y se tiene la service role key)
    if (serviceRoleKey && serviceRoleKey !== "undefined" && serviceRoleKey.length > 0) {
      try {
        const { error: authError } = await supabaseClient.auth.admin.deleteUser(id);
        if (authError) {
          logger.error("Error al eliminar usuario de Supabase Auth", authError, { ip, userId: id });
        }
      } catch (authErr) {
        logger.error("Fallo crítico eliminando de Supabase Auth", authErr, { ip, userId: id });
      }
    }

    logger.info("Usuario y todos sus datos relacionados eliminados con éxito", { ip, userId: id });
    return NextResponse.json({ success: true });

  } catch (err: any) {
    logger.error("Error crítico en endpoint DELETE de administración de usuarios", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
