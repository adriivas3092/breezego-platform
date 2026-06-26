import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { calculateRealCosts } from "@/lib/invoiceHelper";

export async function POST(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // 1. Verificar autorización del administrador
    const authHeader = req.headers.get("Authorization");
    const passcode = authHeader?.replace("Bearer ", "") || "";
    const masterPassword = process.env.ADMIN_PASSWORD || "BreezeGoMaster2026";

    if (passcode !== masterPassword) {
      logger.warn("Intento de acceso no autorizado a la API de recalculación de facturas", { ip, userAgent });
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://difljtvindmqjqiaunon.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey || serviceRoleKey === "undefined" || serviceRoleKey.length === 0) {
      logger.error("Error en recalculación: SUPABASE_SERVICE_ROLE_KEY no está definido.");
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

    // 2. Obtener todos los paquetes y perfiles
    const { data: packages, error: pkgsError } = await supabaseAdmin
      .from("packages")
      .select("*");

    if (pkgsError) {
      logger.error("Error al obtener paquetes en recalculación", pkgsError);
      return NextResponse.json({ success: false, error: "Error al obtener paquetes de la base de datos." }, { status: 500 });
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (profilesError) {
      logger.error("Error al obtener perfiles en recalculación", profilesError);
      return NextResponse.json({ success: false, error: "Error al obtener perfiles de la base de datos." }, { status: 500 });
    }

    const profilesMap = new Map();
    if (profiles) {
      profiles.forEach((p: any) => {
        profilesMap.set(p.id, p);
      });
    }

    // 3. Obtener facturas existentes
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from("invoices")
      .select("*");

    if (invoicesError) {
      logger.error("Error al obtener facturas en recalculación", invoicesError);
      return NextResponse.json({ success: false, error: "Error al obtener facturas de la base de datos." }, { status: 500 });
    }

    const invoicesMap = new Map();
    if (invoices) {
      invoices.forEach((inv: any) => {
        invoicesMap.set(inv.package_id, inv);
      });
    }

    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    const details: any[] = [];

    // 4. Recorrer paquetes y procesar facturas
    for (const pkg of packages || []) {
      if (!pkg.user_id) {
        skippedCount++;
        continue;
      }

      const profile = profilesMap.get(pkg.user_id);
      const deliveryMethod = profile?.delivery_method || "locker";

      // Nuevos costos según la fórmula actualizada
      const costs = calculateRealCosts({
        weight: Number(pkg.weight || 0),
        category: pkg.category || "general",
        declaredValue: Number(pkg.declared_value || 0),
        deliveryMethod: deliveryMethod,
        shippingMode: pkg.shipping_mode || "air",
        isRegularTariff: false,
        wantsDelivery: pkg.wants_delivery !== false,
        wantsInsurance: pkg.wants_insurance !== false
      });

      const existingInvoice = invoicesMap.get(pkg.id);
      const isPrealerted = pkg.status === "prealerted";

      // Si es prealertado y NO tiene factura, no creamos factura nueva (se creará cuando se reciba)
      // Pero si ya TIENE factura (o el paquete no es prealertado), creamos/actualizamos la factura
      if (isPrealerted && !existingInvoice) {
        skippedCount++;
        continue;
      }

      const isPaid = existingInvoice ? existingInvoice.is_paid : false;

      const invoiceData = {
        package_id: pkg.id,
        user_id: pkg.user_id,
        flete_cost: costs.freightCost,
        taxes_cost: costs.taxesCost,
        delivery_cost: costs.deliveryCost,
        total_cost_usd: costs.totalCostUsd,
        total_cost_crc: costs.totalCostCrc,
        is_paid: isPaid
      };

      const { data: savedInvoice, error: invError } = await supabaseAdmin
        .from("invoices")
        .upsert(invoiceData, { onConflict: "package_id" })
        .select()
        .single();

      if (invError) {
        logger.error(`Error al actualizar factura para paquete ${pkg.id}`, invError);
        details.push({ packageId: pkg.id, tracking: pkg.tracking_number, success: false, error: invError.message });
      } else {
        if (existingInvoice) {
          updatedCount++;
          details.push({
            packageId: pkg.id,
            tracking: pkg.tracking_number,
            action: "updated",
            oldTotalUsd: existingInvoice.total_cost_usd,
            newTotalUsd: savedInvoice.total_cost_usd,
            isPaid: isPaid
          });
        } else {
          createdCount++;
          details.push({
            packageId: pkg.id,
            tracking: pkg.tracking_number,
            action: "created",
            newTotalUsd: savedInvoice.total_cost_usd,
            isPaid: isPaid
          });
        }
      }
    }

    logger.info("Recalculación de facturas completada con éxito", {
      ip,
      updatedCount,
      createdCount,
      skippedCount
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalPackages: packages?.length || 0,
        updatedInvoices: updatedCount,
        createdInvoices: createdCount,
        skippedPackages: skippedCount
      },
      details
    });

  } catch (err: any) {
    logger.error("Error crítico en endpoint de recalculación de facturas", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
