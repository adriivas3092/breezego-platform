import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sanitize } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import nodemailer from "nodemailer";
import crypto from "crypto";

const recoverRequestSchema = z.object({
  email: z.string().email("Formato de correo electrónico inválido."),
  captchaToken: z.string().optional(),
});

export async function POST(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const rawBody = await req.json();

    // 1. Validar inputs con Zod
    const validationResult = recoverRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: validationResult.error.errors[0].message 
      }, { status: 400 });
    }

    const { email: rawEmail, captchaToken } = validationResult.data;
    const email = sanitize(rawEmail.toLowerCase().trim());

    // 2. Verificación de CAPTCHA
    const isCaptchaValid = await verifyTurnstileToken(captchaToken || "", ip);
    if (!isCaptchaValid) {
      logger.warn("Solicitud de recuperación rechazada: CAPTCHA inválido", {
        ip,
        userAgent,
        context: "auth-recover-captcha-failed",
        metadata: { email }
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

    // 4. Buscar el perfil en la base de datos por email
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .eq("email", email)
      .maybeSingle();

    // Por seguridad (evitar enumeración de usuarios), siempre retornamos éxito aunque el correo no exista
    if (profileError || !profile) {
      logger.info("Solicitud de recuperación para correo inexistente o fallido", {
        email,
        ip,
        error: profileError?.message
      });
      return NextResponse.json({
        success: true,
        message: "Si tu correo está registrado, recibirás un enlace de recuperación en los próximos minutos."
      });
    }

    // 5. Generar token único y expiración (1 hora)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora de validez

    // 6. Guardar en base de datos
    const { error: dbUpdateError } = await supabaseClient
      .from("profiles")
      .update({
        reset_token: token,
        reset_token_expires_at: expiresAt
      })
      .eq("id", profile.id);

    if (dbUpdateError) {
      logger.error("Error al guardar token de recuperación en base de datos", dbUpdateError, { email });
      return NextResponse.json({
        success: false,
        error: "Error interno al procesar el restablecimiento."
      }, { status: 500 });
    }

    // 7. Enviar correo electrónico mediante nodemailer
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"BreezeGo Logística" <noreply@breezego.net>`;

    if (!host || !user || !pass) {
      logger.warn("SMTP no está configurado. Token generado pero el correo no se envió.", {
        email,
        token
      });
      // Para desarrollo/pruebas si no hay SMTP, exponemos el token en consola
      console.log(`[DEV ONLY] Token de recuperación para ${email}: ${token}`);
      return NextResponse.json({
        success: true,
        message: "Solicitud procesada con éxito (Modo Desarrollo)."
      });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://breezego.net";
    const resetLink = `${origin}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    const mailOptions = {
      from,
      to: email,
      subject: "Restablecer tu contraseña - BreezeGo",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Restablecer Contraseña - BreezeGo</title>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 0;">
            <tr>
              <td align="center">
                <!-- Envelope Table -->
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                  
                  <!-- Header Banner -->
                  <tr>
                    <td style="padding: 24px 40px; text-align: center; background-color: #0b0f19; border-bottom: 2px solid #FC7C58;">
                      <img src="https://breezego.net/logo.png" alt="BreezeGo" style="height: 35px; width: auto; display: inline-block;" />
                      <p style="font-family: 'Montserrat', sans-serif; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #FC7C58; margin: 6px 0 0 0;">— CONTROL CENTER —</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 35px 40px; background-color: #ffffff;">
                      <h2 style="font-family: 'Montserrat', sans-serif; color: #0b0f19; font-size: 18px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">Solicitud de Restablecimiento</h2>
                      <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 20px;">
                        Hola, <strong>${profile.full_name}</strong>. Hemos recibido una solicitud para cambiar la contraseña de tu cuenta de BreezeGo.
                      </p>
                      <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 24px;">
                        Para proceder con el restablecimiento y verificar tu identidad, haz clic en el siguiente botón:
                      </p>

                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; margin-bottom: 25px;">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}" target="_blank" style="background-color: #FC7C58; color: #ffffff; text-decoration: none; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 14px 30px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(252, 124, 88, 0.25);">
                              Restablecer Contraseña
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 11px; line-height: 1.4; color: #64748b; margin-bottom: 15px;">
                        Este enlace tiene una validez de <strong>1 hora</strong>. Si el botón no funciona, puedes copiar y pegar la siguiente dirección en tu navegador:
                      </p>
                      <p style="font-size: 11px; font-family: monospace; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; color: #0b0f19; margin-bottom: 25px;">
                        ${resetLink}
                      </p>

                      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
                      <p style="font-size: 11px; color: #94a3b8; line-height: 1.4; margin: 0;">
                        * Si tú no has realizado esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña actual no se modificará.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #0b0f19; text-align: center; color: #64748b; font-size: 10px;">
                      <p style="margin: 0 0 6px 0; color: #cbd5e1;">© ${new Date().getFullYear()} BreezeGo S.A. Todos los derechos reservados.</p>
                      <p style="margin: 0; color: #64748b;">San José, Costa Rica • Miami Hub (Florida) • Doral USA</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info("Correo de restablecimiento enviado con éxito", { email, ip });

    return NextResponse.json({
      success: true,
      message: "Si tu correo está registrado, recibirás un enlace de recuperación en los próximos minutos."
    });

  } catch (err: any) {
    logger.error("Error interno en endpoint de recuperación por correo", err, { ip, userAgent });
    return NextResponse.json({ 
      success: false, 
      error: "Error interno del servidor al procesar el restablecimiento." 
    }, { status: 500 });
  }
}
