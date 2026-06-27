import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminToken } from "@/lib/adminAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

// Comparación en tiempo constante para evitar timing attacks sobre la clave master.
function timingSafeEqualStr(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // Rate limit estricto contra fuerza bruta de la clave master: 8 intentos / 5 min por IP.
    const limit = await checkRateLimit(`ip:${ip}:admin-auth`, 8, 300);
    if (!limit.success) {
      logger.warn("Límite de intentos de login admin excedido", { ip, userAgent, context: "rate-limit-admin-auth" });
      return NextResponse.json(
        { success: false, error: "Demasiados intentos. Espera unos minutos antes de volver a intentar." },
        { status: 429, headers: { "Retry-After": "300" } }
      );
    }

    const { password } = await req.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Contraseña requerida." }, { status: 400 });
    }

    const masterPassword = process.env.ADMIN_PASSWORD;
    if (masterPassword && timingSafeEqualStr(password, masterPassword)) {
      logger.info("Login admin exitoso", { ip, userAgent, context: "admin-auth-success" });
      // Emitir un token de sesión firmado con expiración (ver lib/adminAuth)
      return NextResponse.json({ success: true, token: createAdminToken() });
    }

    logger.warn("Intento de login admin fallido", { ip, userAgent, context: "admin-auth-fail" });
    return NextResponse.json({ success: false, error: "Contraseña incorrecta." }, { status: 401 });
  } catch (error) {
    logger.error("Error en API de autenticación admin", error, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
