import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { verifyTurnstileToken, IS_TURNSTILE_ENABLED } from "@/lib/turnstile";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

// Esquema de validación estricto con Zod
const loginSchema = z.object({
  email: z.string().email("Formato de correo electrónico inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  captchaToken: z.string().optional(),
});

export async function POST(req: Request) {
  // Obtener IP del cliente
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const rawBody = await req.json();
    
    // 1. Validar e inputs con Zod
    const validationResult = loginSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: validationResult.error.errors[0].message 
      }, { status: 400 });
    }

    // Sanitizar datos validados
    const { email: rawEmail, password, captchaToken } = validationResult.data;
    const email = sanitize(rawEmail.toLowerCase().trim());

    // 2. Control de Rate Limit e Intentos de Login (máx 5 por 15 min)
    const attemptsLimit = await checkRateLimit(`login:attempts:${ip}`, 5, 900);
    const attemptsCount = 5 - attemptsLimit.remaining;

    // Si excede el máximo de intentos, bloquear directamente
    if (!attemptsLimit.success) {
      logger.warn("Bloqueo de login por exceso de intentos (429)", {
        ip,
        userAgent,
        context: "auth-login-lockout",
        metadata: { email }
      });
      return NextResponse.json({ 
        success: false, 
        error: "Demasiados intentos fallidos. Tu acceso de login está bloqueado por 15 minutos." 
      }, { status: 429 });
    }

    // 3. CAPTCHA Inteligente Condicional (Exigir tras 3 o más intentos)
    const needsCaptcha = attemptsCount >= 3 && IS_TURNSTILE_ENABLED;
    if (needsCaptcha) {
      if (!captchaToken) {
        return NextResponse.json({
          success: false,
          error: "Validación de seguridad requerida (CAPTCHA). Por favor resuelve el desafío.",
          showCaptcha: true
        }, { status: 400 });
      }

      const isCaptchaValid = await verifyTurnstileToken(captchaToken, ip);
      if (!isCaptchaValid) {
        return NextResponse.json({
          success: false,
          error: "Desafío CAPTCHA inválido. Por favor intenta de nuevo.",
          showCaptcha: true
        }, { status: 400 });
      }
    }

    // 4. Intentar autenticar con Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmxqdHZpbmRtcWpxaWF1bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTkzNzksImV4cCI6MjA5NTI5NTM3OX0.EXnJEaq9eT3vc67y7kaDD7tsInwzSZtdXDs9RN6GBIg";

    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

    const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const remainingAttempts = attemptsLimit.remaining;
      const nextAttemptsWillNeedCaptcha = ((attemptsCount + 1) >= 3) && IS_TURNSTILE_ENABLED;

      logger.warn("Intento de inicio de sesión fallido", {
        ip,
        userAgent,
        context: "auth-login-failed",
        metadata: { email, error: authError.message, remainingAttempts }
      });

      return NextResponse.json({ 
        success: false, 
        error: "Credenciales de acceso incorrectas.",
        showCaptcha: nextAttemptsWillNeedCaptcha
      }, { status: 400 });
    }

    // Login Exitoso
    logger.info("Usuario inició sesión exitosamente", {
      ip,
      userAgent,
      userId: authData.user.id,
      context: "auth-login-success",
      metadata: { email }
    });

    return NextResponse.json({ 
      success: true, 
      user: authData.user, 
      session: authData.session 
    });

  } catch (err: any) {
    logger.error("Error interno en el endpoint de login", err, { ip, userAgent });
    return NextResponse.json({ 
      success: false, 
      error: "Error interno del servidor al procesar el inicio de sesión." 
    }, { status: 500 });
  }
}
