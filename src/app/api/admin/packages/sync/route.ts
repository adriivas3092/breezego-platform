import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { calculateRealCosts, generateInvoicePdf, sendInvoiceEmail } from "@/lib/invoiceHelper";


function mapProviderStatus(statusStr: string): string {
  if (!statusStr) return "prealerted";
  const clean = statusStr.toLowerCase().trim();
  if (clean.includes("mia") || clean.includes("miami") || clean === "received" || clean.includes("bodega_mia")) {
    return "received";
  }
  if (clean.includes("transito") || clean.includes("vuelo") || clean === "in_transit") {
    return "in_transit";
  }
  if (clean.includes("aduana") || clean === "customs") {
    return "customs";
  }
  if (clean.includes("cr") || clean.includes("sjo") || clean.includes("reparto") || clean === "out_for_delivery" || clean.includes("bodega_cr")) {
    return "out_for_delivery";
  }
  if (clean.includes("entrega") || clean === "delivered" || clean === "entregado") {
    return "delivered";
  }
  return "prealerted";
}

async function processInvoiceForPackage(
  supabaseClient: any,
  packageObj: any,
  profile: any,
  status: string
) {
  if (!packageObj.user_id) return;
  
  const eligibleStatuses = ["received", "in_transit", "customs", "out_for_delivery", "delivered"];
  if (!eligibleStatuses.includes(status)) return;

  try {
    const costs = calculateRealCosts({
      weight: Number(packageObj.weight || 0),
      category: packageObj.category || "general",
      declaredValue: Number(packageObj.declared_value || 0),
      deliveryMethod: profile?.delivery_method || "locker",
      shippingMode: packageObj.shipping_mode || "air",
      isRegularTariff: false,
      wantsDelivery: packageObj.wants_delivery !== false,
      wantsInsurance: packageObj.wants_insurance !== false
    });

    const { data: existingInvoice } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("package_id", packageObj.id)
      .maybeSingle();

    const invoiceData = {
      package_id: packageObj.id,
      user_id: packageObj.user_id,
      flete_cost: costs.freightCost,
      taxes_cost: costs.taxesCost,
      delivery_cost: costs.deliveryCost,
      total_cost_usd: costs.totalCostUsd,
      total_cost_crc: costs.totalCostCrc,
      is_paid: existingInvoice ? existingInvoice.is_paid : false
    };

    const { data: newInvoice, error: invError } = await supabaseClient
      .from("invoices")
      .upsert(invoiceData, { onConflict: "package_id" })
      .select()
      .single();

    if (!invError && newInvoice && (!existingInvoice || (status === "received" && existingInvoice.flete_cost === 0))) {
      // Esperamos el envío (sin await el correo no se completa en serverless).
      try {
        const pdfBuffer = await generateInvoicePdf(newInvoice, packageObj, {
          fullName: profile?.full_name || "Cliente BreezeGo",
          email: profile?.email,
          phone: profile?.phone,
          address: profile?.address,
          suiteCode: profile?.suite_code
        });
        const pdfFilename = `BreezeGo_Factura_${newInvoice.id.substring(0, 8).toUpperCase()}.pdf`;

        if (profile?.email) {
          await sendInvoiceEmail(
            profile.email,
            profile.full_name || "Cliente",
            newInvoice,
            pdfBuffer,
            pdfFilename,
            packageObj
          );
        } else {
          logger.warn("Sync: factura generada sin email de cliente: correo omitido", { metadata: { invoiceId: newInvoice.id, packageId: packageObj.id } });
        }
      } catch (mailErr) {
        logger.error("Error al generar PDF o enviar correo desde Sync helper", mailErr);
      }
    }
  } catch (err) {
    logger.error("Error procesando factura para el paquete en Sync", err, { metadata: { packageId: packageObj.id } });
  }
}

export async function POST(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // 1. Verificar autorización del administrador
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    if (!verifyAdminAuth(passcode)) {
      logger.warn("Intento de acceso no autorizado a la API de sincronización de paquetes", { ip });
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const requestUrl = new URL(req.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    // 2. Inicializar Supabase Client
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

    // Obtener los perfiles de usuarios locales para mapeo de teléfonos
    const { data: profiles, error: profilesErr } = await supabaseClient
      .from("profiles")
      .select("*");

    if (profilesErr) {
      logger.error("Error al obtener perfiles en API Sync", profilesErr);
    }

    // 3. Login contra ACS Logística
    const acsEmail = process.env.ACS_API_EMAIL || "logistics@breezego.net";
    const acsPassword = process.env.ACS_API_PASSWORD || "123456";

    logger.info("Iniciando sesión en ACS Logística...", { acsEmail });
    const loginRes = await fetch("https://acs.logistica.cr/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: acsEmail,
        password: acsPassword
      })
    });

    if (!loginRes.ok) {
      logger.error(`Error de login en ACS Logística. Status: ${loginRes.status}`);
      return NextResponse.json({ success: false, error: "Fallo al iniciar sesión en ACS Logística." }, { status: 502 });
    }

    const loginData = await loginRes.json();
    const token = loginData.token || loginData.data?.token || loginData.accessToken || loginData.data?.accessToken;

    if (!token) {
      logger.error("ACS Logística no retornó ningún token válido.");
      return NextResponse.json({ success: false, error: "Token de sesión no devuelto por ACS Logística." }, { status: 502 });
    }

    // 4. Descargar paquetes desde ACS Logística
    logger.info("Obteniendo paquetes desde ACS Logística...");
    const packagesRes = await fetch("https://acs.logistica.cr/api/paquetes?page=1&limit=50", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Cookie": `auth-token=${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!packagesRes.ok) {
      logger.error(`Error al obtener paquetes de ACS. Status: ${packagesRes.status}`);
      return NextResponse.json({ success: false, error: "Fallo al consultar paquetes de ACS Logística." }, { status: 502 });
    }

    const packagesData = await packagesRes.json();
    const acsPackages = packagesData.data?.paquetes || packagesData.paquetes || [];

    logger.info(`Se obtuvieron ${acsPackages.length} paquetes desde ACS Logística.`);

    let updatedCount = 0;
    let autoRegisteredCount = 0;
    let unassignedCount = 0;

    // 5. Iterar y procesar cada paquete
    for (const p of acsPackages) {
      const trackingNumber = p.trackingNumber?.trim().toUpperCase();
      if (!trackingNumber) continue;

      const status = mapProviderStatus(p.estado);
      const weight = Number(p.peso || 0);
      const shippingMode = p.tipo === "maritimo" ? "sea" : "air";

      // Buscar si el paquete ya existe en Supabase
      const { data: existingPkg, error: selectErr } = await supabaseClient
        .from("packages")
        .select("*")
        .eq("tracking_number", trackingNumber)
        .maybeSingle();

      if (selectErr) {
        logger.error(`Error de consulta en Supabase para tracking ${trackingNumber}`, selectErr);
        continue;
      }

      if (existingPkg) {
        // Paquete existente: Comprobar si hay cambios
        const statusChanged = existingPkg.status !== status;
        const weightChanged = Number(existingPkg.weight) !== weight;

        if (statusChanged || weightChanged) {
          const updateData: any = {
            weight: weight,
            status: status,
            shipping_mode: shippingMode,
            updated_at: new Date().toISOString()
          };

          // Actualizar marcas temporales según el nuevo estado
          if (status === "received" && !existingPkg.miami_received_at) {
            updateData.miami_received_at = new Date().toISOString();
          } else if (status === "customs" && !existingPkg.sjo_arrived_at) {
            updateData.sjo_arrived_at = new Date().toISOString();
          } else if (status === "delivered" && !existingPkg.delivered_at) {
            updateData.delivered_at = new Date().toISOString();
          }

          const { data: updatedPkg, error: updateErr } = await supabaseClient
            .from("packages")
            .update(updateData)
            .eq("id", existingPkg.id)
            .select()
            .single();

          if (updateErr || !updatedPkg) {
            logger.error(`Error al actualizar paquete ${trackingNumber}`, updateErr);
            continue;
          }

          // Procesar factura en la base de datos si corresponde
          const clientProfile = profiles ? profiles.find((u: any) => u.id === existingPkg.user_id) : null;
          await processInvoiceForPackage(supabaseClient, updatedPkg, clientProfile, status);

          updatedCount++;

          // Disparar notificación por WhatsApp en caso de cambio de estado
          if (statusChanged && existingPkg.user_id && profiles) {
            const clientProfile = profiles.find((u: any) => u.id === existingPkg.user_id);
            if (clientProfile) {
              try {
                const notifyUrl = `${baseUrl}/api/notifications/whatsapp`;
                await fetch(notifyUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-admin-passcode": passcode
                  },
                  body: JSON.stringify({
                    packageId: existingPkg.id,
                    trackingNumber: trackingNumber,
                    status: status,
                    clientName: clientProfile.full_name,
                    clientPhone: clientProfile.phone || "+506 8899-4455",
                    details: {
                      weight: weight
                    }
                  })
                });
              } catch (notifyErr) {
                logger.error(`Error al gatillar notificación de WhatsApp para paquete ${trackingNumber}`, notifyErr);
              }
            }
          }
        }
      } else {
        // Paquete nuevo (Sin prealerta): Buscar usuario por teléfono
        const providerPhone = p.cliente?.telefono;
        let matchedUserId: string | null = null;
        let matchedClientProfile: any = null;

        if (providerPhone && profiles) {
          const cleanProviderPhone = providerPhone.replace(/\D/g, "").slice(-8);
          if (cleanProviderPhone.length === 8) {
            const matchedProfile = profiles.find((prof: any) => {
              const cleanUserPhone = (prof.phone || "").replace(/\D/g, "").slice(-8);
              return cleanUserPhone === cleanProviderPhone;
            });
            if (matchedProfile) {
              matchedUserId = matchedProfile.id;
              matchedClientProfile = matchedProfile;
            }
          }
        }

        // Obtener valor FOB y categoría de ACS o por defecto
        const declaredValue = Number(p.valor || p.value || 0);
        const category = p.categoria || p.category || "general";

        // Insertar en Supabase
        const insertData: any = {
          user_id: matchedUserId,
          tracking_number: trackingNumber,
          vendor: p.cliente?.empresa || p.cliente?.nombre || "ACS Logística",
          description: p.descripcion || "Artículo Importado",
          weight: weight,
          status: status,
          shipping_mode: shippingMode,
          declared_value: declaredValue,
          category: category,
          created_at: p.fechaCreacion || new Date().toISOString()
        };

        if (status === "received") {
          insertData.miami_received_at = new Date().toISOString();
        } else if (status === "customs" || status === "out_for_delivery") {
          insertData.sjo_arrived_at = new Date().toISOString();
        } else if (status === "delivered") {
          insertData.delivered_at = new Date().toISOString();
        }

        const { data: newPkg, error: insertErr } = await supabaseClient
          .from("packages")
          .insert(insertData)
          .select()
          .single();

        if (insertErr || !newPkg) {
          logger.error(`Error al auto-registrar paquete ${trackingNumber}`, insertErr);
          continue;
        }

        // Procesar factura en la base de datos si corresponde
        if (matchedUserId) {
          await processInvoiceForPackage(supabaseClient, newPkg, matchedClientProfile, status);
        }

        if (matchedUserId) {
          autoRegisteredCount++;

          // Disparar notificación por WhatsApp
          if (matchedClientProfile && newPkg) {
            try {
              const notifyUrl = `${baseUrl}/api/notifications/whatsapp`;
              await fetch(notifyUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-admin-passcode": passcode
                },
                body: JSON.stringify({
                  packageId: newPkg.id,
                  trackingNumber: trackingNumber,
                  status: status,
                  clientName: matchedClientProfile.full_name,
                  clientPhone: matchedClientProfile.phone || "+506 8899-4455",
                  details: {
                    weight: weight
                  }
                })
              });
            } catch (notifyErr) {
              logger.error(`Error al gatillar notificación para paquete auto-registrado ${trackingNumber}`, notifyErr);
            }
          }
        } else {
          unassignedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        updated: updatedCount,
        autoRegistered: autoRegisteredCount,
        unassigned: unassignedCount
      }
    });

  } catch (err: any) {
    logger.error("Error crítico en API Sync de ACS Logística", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor de sincronización." }, { status: 500 });
  }
}
