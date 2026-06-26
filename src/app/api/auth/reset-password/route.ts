import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

const resetPasswordSchema = z.object({
  token: z.string().uuid("Token de recuperación inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  captchaToken: z.string().optional(),
});

export async function POST(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const rawBody = await req.json();

    // 1. Validar inputs con Zod
    const validationResult = resetPasswordSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: validationResult.error.errors[0].message 
      }, { status: 400 });
    }

    const { token, password, captchaToken } = validationResult.data;

    // 2. Verificación de CAPTCHA
    const isCaptchaValid = await verifyTurnstileToken(captchaToken || "", ip);
    if (!isCaptchaValid) {
      logger.warn("Restablecimiento rechazado: CAPTCHA inválido", {
        ip,
        userAgent,
        context: "auth-reset-captcha-failed"
      });
      return NextResponse.json({ 
        success: false, 
        error: "Verificación de seguridad (CAPTCHA) fallida. Intenta nuevamente." 
      }, { status: 400 });
    }

    // 3. Inicializar cliente de Supabase (Admin / Service Role)
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

    // 4. Buscar usuario en base de datos por reset_token
    const { data: profile, error: dbError } = await supabaseClient
      .from("profiles")
      .select("id, email, reset_token_expires_at")
      .eq("reset_token", token)
      .maybeSingle();

    if (dbError || !profile) {
      logger.warn("Intento de restablecimiento fallido: token no encontrado o inválido", { ip, token });
      return NextResponse.json({
        success: false,
        error: "El enlace de recuperación es inválido o ha expirado."
      }, { status: 400 });
    }

    // 5. Verificar expiración
    const now = new Date();
    const expiresAt = new Date(profile.reset_token_expires_at);

    if (now > expiresAt) {
      logger.warn("Intento de restablecimiento fallido: token expirado", {
        userId: profile.id,
        email: profile.email,
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString()
      });
      return NextResponse.json({
        success: false,
        error: "El enlace de recuperación ha expirado. Por favor, solicita uno nuevo."
      }, { status: 400 });
    }

    // 6. Actualizar contraseña en Supabase Auth vía Admin API
    if (!serviceRoleKey || serviceRoleKey === "undefined" || serviceRoleKey.length === 0) {
      logger.error("Error al restablecer contraseña: SUPABASE_SERVICE_ROLE_KEY no está configurado", null);
      return NextResponse.json({
        success: false,
        error: "Error del servidor: La clave de administrador de base de datos no está configurada."
      }, { status: 500 });
    }

    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(profile.id, {
      password: password,
    });

    if (updateError) {
      logger.error("Error al actualizar la contraseña en Supabase Auth vía Admin API", updateError, {
        userId: profile.id,
        email: profile.email
      });
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    // 7. Limpiar token en la base de datos para que sea de un solo uso
    await supabaseClient
      .from("profiles")
      .update({
        reset_token: null,
        reset_token_expires_at: null
      })
      .eq("id", profile.id);

    logger.info("Contraseña restablecida con éxito mediante token seguro por correo", {
      userId: profile.id,
      email: profile.email,
      ip
    });

    return NextResponse.json({
      success: true,
      message: "Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión."
    });

  } catch (err: any) {
    logger.error("Error interno en endpoint de restablecimiento por token", err, { ip, userAgent });
    return NextResponse.json({ 
      success: false, 
      error: "Error interno del servidor al restablecer tu contraseña." 
    }, { status: 500 });
  }
}
