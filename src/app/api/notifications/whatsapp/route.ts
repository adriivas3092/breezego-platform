import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const passcode = req.headers.get("x-admin-passcode");
    const masterPassword = process.env.ADMIN_PASSWORD || "BreezeGoMaster2026";
    if (passcode !== masterPassword) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const { 
      packageId, 
      trackingNumber, 
      status, 
      clientName, 
      clientPhone, 
      details 
    } = await req.json();

    console.log(`[Notification Router] Iniciando envío de correo para ${clientName}`);
    console.log(`[Notification Details] Paquete: ${trackingNumber}, Estado: ${status}`);

    // --- 1. CONFIGURAR SUPABASE Y OBTENER CORREO DEL CLIENTE ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmxqdHZpbmRtcWpxaWF1bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTkzNzksImV4cCI6MjA5NTI5NTM3OX0.EXnJEaq9eT3vc67y7kaDD7tsInwzSZtdXDs9RN6GBIg";

    const supabaseKey = (serviceRoleKey && serviceRoleKey !== "undefined" && serviceRoleKey.length > 0)
      ? serviceRoleKey
      : supabaseAnonKey;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let clientEmail = "";
    let clientSuite = "";

    try {
      let userId = "";
      if (packageId) {
        const { data: pkgData } = await supabase
          .from("packages")
          .select("user_id")
          .eq("id", packageId)
          .single();
        if (pkgData?.user_id) {
          userId = pkgData.user_id;
        }
      } else if (trackingNumber) {
        const { data: pkgData } = await supabase
          .from("packages")
          .select("user_id")
          .eq("tracking_number", trackingNumber)
          .single();
        if (pkgData?.user_id) {
          userId = pkgData.user_id;
        }
      }

      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, suite_code")
          .eq("id", userId)
          .single();
        if (profileData) {
          clientEmail = profileData.email || "";
          clientSuite = profileData.suite_code || "";
        }
      }
    } catch (dbErr) {
      console.error("[Notification Router] Error al consultar datos del cliente en Supabase", dbErr);
    }

    // --- 2. CONFIGURAR ESTADOS E ICONOS EN ESPAÑOL ---
    let statusTextSpanish = "";
    let statusIcon = "📦";
    
    switch (status) {
      case "prealerted":
        statusTextSpanish = "Prealertado";
        statusIcon = "⚡";
        break;
      case "received":
        statusTextSpanish = "Listo en Miami";
        statusIcon = "📦";
        break;
      case "in_transit":
        statusTextSpanish = "En Tránsito a Costa Rica";
        statusIcon = "✈️";
        break;
      case "customs":
        statusTextSpanish = "En Aduana Costa Rica";
        statusIcon = "🏛️";
        break;
      case "out_for_delivery":
        statusTextSpanish = "En Reparto Local";
        statusIcon = "🚚";
        break;
      case "delivered":
        statusTextSpanish = "Entregado con éxito";
        statusIcon = "🎉";
        break;
      default:
        statusTextSpanish = "Actualizado";
        statusIcon = "📦";
    }

    const trackerLink = `https://breezego.net/tracking?code=${trackingNumber}`;
    const messageBody = `¡Hola ${clientName}! Tu paquete de BreezeGo ${trackingNumber} cambió de estado a: ${statusIcon} ${statusTextSpanish}. Peso: ${details?.weight || "N/A"} Kg.`;

    // --- 3. ENVÍO DE CORREO ELECTRÓNICO (NODEMAILER) ---
    let emailStatus = "skipped";
    let emailResponse: any = null;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `"BreezeGo Logística" <noreply@breezego.net>`;

    if (clientEmail && smtpHost && smtpUser && smtpPass) {
      try {
        console.log(`[Notification Router] Enviando correo electrónico a ${clientEmail}`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        let currentStepIndex = 0;
        if (status === "prealerted" || status === "received") {
          currentStepIndex = 0;
        } else if (status === "in_transit") {
          currentStepIndex = 1;
        } else if (status === "customs") {
          currentStepIndex = 2;
        } else if (status === "out_for_delivery") {
          currentStepIndex = 3;
        } else if (status === "delivered") {
          currentStepIndex = 4;
        }

        const timelineSteps = [
          { label: "Miami", icon: "📦" },
          { label: "Vuelo", icon: "✈️" },
          { label: "Aduana", icon: "🏛️" },
          { label: "Reparto", icon: "🚚" },
          { label: "Entregado", icon: "🎉" }
        ];

        let timelineHtml = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 15px; margin-bottom: 5px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;"><tr>`;
        timelineSteps.forEach((step, idx) => {
          const isActive = idx <= currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const dotColor = isCurrent ? "#FC7C58" : (isActive ? "#46C7D2" : "#e2e8f0");
          const textColor = isActive ? "#0b0f19" : "#94a3b8";
          const fontWeight = isActive ? "bold" : "normal";

          timelineHtml += `
            <td align="center" style="width: 20%; padding: 0 2px;">
              <div style="width: 32px; height: 32px; line-height: 32px; border-radius: 16px; background-color: ${dotColor}; text-align: center; font-size: 15px; margin: 0 auto 6px auto; display: block; border: 1px solid ${isActive ? dotColor : '#cbd5e1'};">
                ${step.icon}
              </div>
              <span style="font-size: 9px; color: ${textColor}; font-weight: ${fontWeight}; display: block; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">${step.label}</span>
            </td>
          `;
        });
        timelineHtml += `</tr></table>`;

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Actualización de Paquete - BreezeGo</title>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 0;">
            <tr>
              <td align="center">
                <!-- Outer Envelope Table -->
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                  
                  <!-- Dark Header -->
                  <tr>
                    <td style="padding: 24px 40px; text-align: center; background-color: #0b0f19; border-bottom: 2px solid #46C7D2;">
                      <img src="https://breezego.net/logo.png" alt="BreezeGo" style="height: 35px; width: auto; display: inline-block;" />
                      <p style="font-family: 'Montserrat', sans-serif; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #46C7D2; margin: 6px 0 0 0;">— TUS PAQUETES EN MOVIMIENTO —</p>
                    </td>
                  </tr>
                  
                  <!-- Main Content Area -->
                  <tr>
                    <td style="padding: 35px 40px; background-color: #ffffff;">
                      <h2 style="font-family: 'Montserrat', sans-serif; color: #0b0f19; font-size: 18px; font-weight: 800; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">¡Hola, ${clientName}!</h2>
                      <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 24px; margin-top: 0;">
                        Queremos informarte que tu paquete ha registrado un cambio en nuestro sistema logístico. A continuación te presentamos el estado actual de tu guía de envío:
                      </p>
                      
                      <!-- Waybill Sticker Card (Digital Shipping Label) -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 2px dashed #46C7D2; border-radius: 12px; margin-bottom: 24px; border-collapse: separate;">
                        <tr>
                          <td style="padding: 20px;">
                            
                            <!-- Sticker Header -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px;">
                              <tr>
                                <td valign="middle">
                                  <strong style="font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 800; color: #0b0f19; text-transform: uppercase; letter-spacing: 0.5px; display: block; line-height: 1.1;">BreezeGo Logistics</strong>
                                  <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 2px;">GUÍA DE IMPORTACIÓN CR</span>
                                </td>
                                <td align="right" valign="middle">
                                  <span style="background-color: ${status === 'delivered' ? '#10b981' : '#FC7C58'}; color: #ffffff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; display: inline-block;">
                                    ${statusTextSpanish}
                                  </span>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- Barcode Representation -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px;">
                              <tr>
                                <td align="center" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                                  <div style="font-family: monospace; font-size: 15px; font-weight: bold; color: #0b0f19; letter-spacing: 3px; display: inline-block;">*${trackingNumber}*</div>
                                  <span style="font-size: 9px; color: #64748b; font-weight: 600; display: block; margin-top: 4px; letter-spacing: 0.5px;">TRACKING: ${trackingNumber}</span>
                                </td>
                              </tr>
                            </table>

                            <!-- Details Table -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 12px; color: #334155; margin-bottom: 10px;">
                              ${clientSuite ? `<tr>
                                <td width="110" valign="top" style="color: #64748b; font-weight: 600;">Suite de Casillero:</td>
                                <td valign="top" style="color: #0b0f19; font-weight: bold;">${clientSuite}</td>
                              </tr>` : ''}
                              <tr>
                                <td width="110" valign="top" style="color: #64748b; font-weight: 600;">Peso Registrado:</td>
                                <td valign="top" style="color: #0b0f19; font-weight: bold;">${details?.weight ? `${details.weight} Kg` : "Pendiente de aforo"}</td>
                              </tr>
                              ${details?.description ? `<tr>
                                <td width="110" valign="top" style="color: #64748b; font-weight: 600;">Descripción:</td>
                                <td valign="top" style="color: #0b0f19; font-weight: 600;">${details.description}</td>
                              </tr>` : ''}
                              <tr>
                                <td width="110" valign="top" style="color: #64748b; font-weight: 600;">Bodega Origen:</td>
                                <td valign="top" style="color: #0b0f19; font-weight: 600;">Miami Hub, Florida, USA</td>
                              </tr>
                            </table>

                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
                            
                            <!-- Timeline -->
                            ${timelineHtml}

                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; margin-bottom: 25px;">
                        <tr>
                          <td align="center">
                            <a href="${trackerLink}" target="_blank" style="background-color: #46C7D2; color: #0b0f19; text-decoration: none; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 14px 30px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(70, 199, 210, 0.25);">
                              Rastrear en Vivo en la Web
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 25px; margin-bottom: 0; line-height: 1.4;">
                        Si tienes alguna duda sobre esta importación, puedes contactarnos respondiendo a este correo o mediante nuestro canal de WhatsApp.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Dark Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #0b0f19; text-align: center; color: #64748b; font-size: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
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
        `;

        const info = await transporter.sendMail({
          from: smtpFrom,
          to: clientEmail,
          subject: `Actualización de Paquete: ${statusTextSpanish} (${trackingNumber}) - BreezeGo`,
          html: htmlContent
        });

        emailStatus = "success";
        emailResponse = info;
        console.log(`[Notification Router] Correo enviado con éxito. MessageId: ${info.messageId}`);
      } catch (err) {
        emailStatus = "error";
        emailResponse = err instanceof Error ? err.message : err;
        console.error("[Notification Router] Fallo en el envío de correo por SMTP", err);
      }
    } else {
      console.log("[Notification Router] Envío de correo omitido (falta configurar SMTP o correo del cliente es nulo)", {
        clientEmail: !!clientEmail,
        smtpConfigured: !!(smtpHost && smtpUser && smtpPass)
      });
    }

    return NextResponse.json({
      success: emailStatus === "success" || emailStatus === "skipped",
      preview: messageBody,
      email: {
        status: emailStatus,
        recipient: clientEmail,
        response: emailResponse
      }
    });

  } catch (error) {
    console.error("Error in Notification Router", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
