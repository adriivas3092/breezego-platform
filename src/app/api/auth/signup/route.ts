import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

// Esquema de validación estricto para registro
const signupSchema = z.object({
  email: z.string().email("Formato de correo electrónico inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  fullName: z.string().min(2, "El nombre es obligatorio y debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "El apellido es obligatorio y debe tener al menos 2 caracteres."),
  phone: z.string().min(8, "El número de teléfono debe tener al menos 8 dígitos."),
  idCard: z.string().min(5, "La cédula o identificación debe tener al menos 5 caracteres."),
  address: z.string().min(5, "La dirección de entrega es obligatoria."),
  deliveryMethod: z.string().optional(),
  speedPreference: z.string().optional(),
  suiteCode: z.string().optional(),
  captchaToken: z.string().optional(),
});

export async function POST(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const rawBody = await req.json();

    // 1. Validar inputs con Zod
    const validationResult = signupSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: validationResult.error.errors[0].message 
      }, { status: 400 });
    }

    // 2. Sanitizar inputs para mitigar XSS/inyecciones
    const validatedData = validationResult.data;
    const email = sanitize(validatedData.email.toLowerCase().trim());
    const password = validatedData.password; // No sanitizar contraseñas para evitar alteración de caracteres válidos
    const rawFullName = sanitize(validatedData.fullName.trim());
    const rawLastName = sanitize(validatedData.lastName.trim());
    const cleanName = rawFullName.replace(/^(?:[bB][rR][gG]|[bB][eE][zZ][gG]|[bB][zZ][gG])\s+/i, "").trim();
    const fullName = `BEZG ${cleanName}`;
    const lastName = rawLastName;
    const phone = sanitize(validatedData.phone.trim());
    const idCard = sanitize(validatedData.idCard.trim());
    const address = sanitize(validatedData.address.trim());
    const deliveryMethod = sanitize(validatedData.deliveryMethod || "gam");
    const speedPreference = sanitize(validatedData.speedPreference || "standard");
    const captchaToken = validatedData.captchaToken;

    // 3. Verificación de Turnstile CAPTCHA (Obligatoria para registros)
    const isCaptchaValid = await verifyTurnstileToken(captchaToken || "", ip);
    if (!isCaptchaValid) {
      logger.warn("Registro rechazado: CAPTCHA inválido o ausente", {
        ip,
        userAgent,
        context: "auth-signup-captcha-failed",
        metadata: { email }
      });
      return NextResponse.json({ 
        success: false, 
        error: "Verificación de seguridad (CAPTCHA) fallida. Intenta nuevamente." 
      }, { status: 400 });
    }

    // 4. Registrar en Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmxqdHZpbmRtcWpxaWF1bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTkzNzksImV4cCI6MjA5NTI5NTM3OX0.EXnJEaq9eT3vc67y7kaDD7tsInwzSZtdXDs9RN6GBIg";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
    const profileClient = (serviceRoleKey && serviceRoleKey !== "undefined" && serviceRoleKey.length > 0)
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
      : supabaseServer;

    // Generar el código suite (suiteCode) de manera secuencial y segura a nivel de servidor.
    let nextNum = 1;
    try {
      // Intentamos llamar a la función RPC que evite problemas de políticas RLS
      const { data: rpcNum, error: rpcError } = await profileClient.rpc("get_next_suite_number");
      if (!rpcError && rpcNum !== null) {
        nextNum = Number(rpcNum);
      } else {
        // Fallback al conteo clásico de perfiles si no se ha aplicado el parche de BD
        const { count, error: countError } = await profileClient
          .from("profiles")
          .select("id", { count: "exact", head: true });
        if (!countError && count !== null) {
          nextNum = count + 1;
        }
      }
    } catch (countErr) {
      logger.error("Error al contar perfiles para suiteCode en el servidor", countErr);
    }
    const suiteCode = `BEZG-${String(nextNum).padStart(3, "0")}`;

    const { data: authData, error: authError } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(req.url).origin}/dashboard`,
        data: {
          fullName,
          lastName,
          last_name: lastName,
          phone,
          idCard,
          address,
          deliveryMethod,
          speedPreference,
          suiteCode,
        }
      }
    });

    if (authError) {
      logger.error("Error al registrar usuario en Supabase", authError, {
        ip,
        userAgent,
        context: "auth-signup-supabase-error",
        metadata: { email }
      });
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    // 5. Insertar o actualizar perfil del usuario en la tabla 'profiles' de Supabase
    if (authData.user) {
      try {
        const { error: profileDbError } = await profileClient
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email,
            full_name: fullName,
            last_name: lastName,
            phone,
            id_card: idCard,
            address,
            delivery_method: deliveryMethod,
            speed_preference: speedPreference,
            suite_code: suiteCode,
          }, { onConflict: 'id' });

        if (profileDbError) {
          logger.error("Error al insertar/actualizar perfil en la tabla de Supabase (profiles)", profileDbError, {
            userId: authData.user.id,
            email
          });
        }
      } catch (dbErr) {
        logger.error("Error crítico de red al intentar insertar perfil en Supabase", dbErr, {
          userId: authData.user.id,
          email
        });
      }
    }

    logger.info("Nuevo usuario registrado con éxito", {
      ip,
      userAgent,
      userId: authData.user?.id,
      context: "auth-signup-success",
      metadata: { email, fullName, suiteCode }
    });

    return NextResponse.json({ 
      success: true, 
      user: authData.user, 
      session: authData.session 
    });

  } catch (err: any) {
    logger.error("Error interno en el endpoint de registro", err, { ip, userAgent });
    return NextResponse.json({ 
      success: false, 
      error: "Error interno del servidor al procesar el registro de casillero." 
    }, { status: 500 });
  }
}
