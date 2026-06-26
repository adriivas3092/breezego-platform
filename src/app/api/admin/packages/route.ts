import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { calculateRealCosts, generateInvoicePdf, sendInvoiceEmail } from "@/lib/invoiceHelper";

export async function GET(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // 1. Verificar autorización del administrador
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    if (!verifyAdminAuth(passcode)) {
      logger.warn("Intento de acceso no autorizado a la API de administración de paquetes", { ip, userAgent });
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
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

    // 2. Comprobar si se solicita un paquete individual
    const urlObj = new URL(req.url);
    const filterId = urlObj.searchParams.get("id");

    if (filterId) {
      const { data: dbPkg, error: dbPkgError } = await supabaseClient
        .from("packages")
        .select("*")
        .eq("id", filterId)
        .single();

      if (dbPkgError || !dbPkg) {
        logger.error(`Error al consultar paquete individual ${filterId} en Supabase`, dbPkgError, { ip });
        return NextResponse.json({ success: false, error: "No se encontró el paquete en la base de datos." }, { status: 404 });
      }

      const formattedPkg = {
        id: dbPkg.id,
        userId: dbPkg.user_id,
        trackingNumber: dbPkg.tracking_number,
        vendor: dbPkg.vendor,
        description: dbPkg.description,
        weight: Number(dbPkg.weight || 0),
        status: dbPkg.status,
        shippingMode: dbPkg.shipping_mode || "air",
        declaredValue: Number(dbPkg.declared_value || 0),
        category: dbPkg.category || "general",
        invoiceUrl: dbPkg.invoice_url || "",
        driverName: dbPkg.driver_name || "",
        driverPlate: dbPkg.driver_plate || "",
        driverPhone: dbPkg.driver_phone || "",
        miamiReceivedAt: dbPkg.miami_received_at,
        sjoArrivedAt: dbPkg.sjo_arrived_at,
        deliveredAt: dbPkg.delivered_at,
        createdAt: dbPkg.created_at,
        wantsDelivery: dbPkg.wants_delivery !== false,
        wantsInsurance: dbPkg.wants_insurance !== false,
      };

      let clientData = null;
      if (dbPkg.user_id) {
        const { data: dbUser, error: userError } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", dbPkg.user_id)
          .single();

        if (!userError && dbUser) {
          clientData = {
            id: dbUser.id,
            email: dbUser.email,
            fullName: dbUser.full_name,
            phone: dbUser.phone,
            idCard: dbUser.id_card,
            address: dbUser.address,
            deliveryMethod: dbUser.delivery_method,
            speedPreference: dbUser.speed_preference,
            suiteCode: dbUser.suite_code,
            createdAt: dbUser.created_at,
          };
        }
      }

      return NextResponse.json({ success: true, package: formattedPkg, client: clientData });
    }

    // 3. Obtener lista completa de paquetes
    const { data: pkgs, error: dbError } = await supabaseClient
      .from("packages")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("Error al consultar la tabla packages en Supabase", dbError, { ip });
      return NextResponse.json({ 
        success: false, 
        error: "La tabla packages no existe en Supabase o falló la consulta." 
      }, { status: 500 });
    }

    const formattedPkgs = (pkgs || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      trackingNumber: p.tracking_number,
      vendor: p.vendor,
      description: p.description,
      weight: Number(p.weight || 0),
      status: p.status,
      shippingMode: p.shipping_mode || "air",
      declaredValue: Number(p.declared_value || 0),
      category: p.category || "general",
      invoiceUrl: p.invoice_url || "",
      driverName: p.driver_name || "",
      driverPlate: p.driver_plate || "",
      driverPhone: p.driver_phone || "",
      miamiReceivedAt: p.miami_received_at,
      sjoArrivedAt: p.sjo_arrived_at,
      deliveredAt: p.delivered_at,
      createdAt: p.created_at,
      wantsDelivery: p.wants_delivery !== false,
      wantsInsurance: p.wants_insurance !== false,
    }));

    return NextResponse.json({ success: true, packages: formattedPkgs });

  } catch (err: any) {
    logger.error("Error crítico en endpoint GET de administración de paquetes", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    // 2. Obtener y sanitizar inputs
    const body = await req.json();
    const {
      id,
      userId,
      trackingNumber,
      vendor,
      description,
      weight,
      status,
      shippingMode,
      driverName,
      driverPlate,
      driverPhone,
      declaredValue,
      category,
      invoiceUrl,
      wantsDelivery,
      wantsInsurance
    } = body;

    if (!trackingNumber || !vendor || !description) {
      return NextResponse.json({ success: false, error: "Faltan campos obligatorios." }, { status: 400 });
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

    // 3. Formatear datos de inserción/actualización
    const updateData: any = {
      user_id: userId || null,
      tracking_number: trackingNumber.trim().toUpperCase(),
      vendor: vendor.trim(),
      description: description.trim(),
      weight: Number(weight || 0),
      status: status || "prealerted",
      shipping_mode: shippingMode || "air",
      driver_name: driverName ? driverName.trim() : null,
      driver_plate: driverPlate ? driverPlate.trim() : null,
      driver_phone: driverPhone ? driverPhone.trim() : null,
      declared_value: Number(declaredValue || 0),
      category: category || "general",
      invoice_url: invoiceUrl || null,
      updated_at: new Date().toISOString()
    };

    if (wantsDelivery !== undefined) {
      updateData.wants_delivery = wantsDelivery;
    } else if (!id) {
      updateData.wants_delivery = true;
    }

    if (wantsInsurance !== undefined) {
      updateData.wants_insurance = wantsInsurance;
    } else if (!id) {
      updateData.wants_insurance = true;
    }

    if (id) {
      updateData.id = id;
    }

    // Actualizar timestamps dinámicamente según el estado
    if (status === "received") {
      updateData.miami_received_at = new Date().toISOString();
    } else if (status === "customs") {
      updateData.sjo_arrived_at = new Date().toISOString();
    } else if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    // 4. Ejecutar Upsert
    const { data, error: dbError } = await supabaseClient
      .from("packages")
      .upsert(updateData, { onConflict: "id" })
      .select()
      .single();

    if (dbError) {
      logger.error("Error al guardar/actualizar paquete en Supabase", dbError, { ip });
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    logger.info("Paquete insertado/actualizado con éxito en Supabase", {
      ip,
      packageId: data?.id,
      trackingNumber
    });

    // 4.5. Generar o actualizar factura en Supabase si el paquete es "received" o posterior
    if (data.user_id && (status === "received" || status === "in_transit" || status === "customs" || status === "out_for_delivery" || status === "delivered")) {
      try {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", data.user_id)
          .single();

        const costs = calculateRealCosts({
          weight: Number(data.weight || 0),
          category: data.category || "general",
          declaredValue: Number(data.declared_value || 0),
          deliveryMethod: profile?.delivery_method || "locker",
          shippingMode: data.shipping_mode || "air",
          isRegularTariff: false,
          wantsDelivery: data.wants_delivery !== false,
          wantsInsurance: data.wants_insurance !== false
        });

        const { data: existingInvoice } = await supabaseClient
          .from("invoices")
          .select("*")
          .eq("package_id", data.id)
          .maybeSingle();

        const invoiceData = {
          package_id: data.id,
          user_id: data.user_id,
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
          // Generar PDF y enviar correo en segundo plano
          (async () => {
            try {
              const pdfBuffer = await generateInvoicePdf(newInvoice, data, {
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
                  data
                );
              }
            } catch (mailErr) {
              logger.error("Error al generar o enviar correo de factura", mailErr);
            }
          })();
        }
      } catch (billingErr) {
        logger.error("Error en el flujo de facturación automatizada", billingErr);
      }
    }

    const formattedPackage = {
      id: data.id,
      userId: data.user_id,
      trackingNumber: data.tracking_number,
      vendor: data.vendor,
      description: data.description,
      weight: Number(data.weight || 0),
      status: data.status,
      shippingMode: data.shipping_mode || "air",
      driverName: data.driver_name || "",
      driverPlate: data.driver_plate || "",
      driverPhone: data.driver_phone || "",
      declaredValue: Number(data.declared_value || 0),
      category: data.category || "general",
      miamiReceivedAt: data.miami_received_at,
      sjoArrivedAt: data.sjo_arrived_at,
      deliveredAt: data.delivered_at,
      createdAt: data.created_at,
      wantsDelivery: data.wants_delivery !== false,
    };

    return NextResponse.json({ success: true, package: formattedPackage });

  } catch (err: any) {
    logger.error("Error crítico en endpoint POST de administración de paquetes", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // 1. Verificar autorización del administrador
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    if (!verifyAdminAuth(passcode)) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    // 2. Obtener el ID del paquete a eliminar
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Falta el ID del paquete." }, { status: 400 });
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

    // 3. Eliminar el paquete
    const { error: dbError } = await supabaseClient
      .from("packages")
      .delete()
      .eq("id", id);

    if (dbError) {
      logger.error("Error al eliminar paquete en Supabase", dbError, { ip });
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    logger.info("Paquete eliminado con éxito en Supabase", { ip, packageId: id });
    return NextResponse.json({ success: true });

  } catch (err: any) {
    logger.error("Error crítico en endpoint DELETE de administración de paquetes", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
