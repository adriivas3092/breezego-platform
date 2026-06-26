import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code") || searchParams.get("tracking");

    if (!code) {
      return NextResponse.json({ success: false, error: "Falta el código de rastreo." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

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

    const { data: pkg, error: dbError } = await supabaseClient
      .from("packages")
      .select("*")
      .eq("tracking_number", cleanCode)
      .maybeSingle();

    if (dbError) {
      logger.error("Error al consultar código de rastreo en Supabase", dbError, { ip, code: cleanCode });
      return NextResponse.json({ success: false, error: "Error en la consulta de base de datos." }, { status: 500 });
    }

    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paquete no encontrado en la base de datos." }, { status: 404 });
    }

    // 2. Mapeo de estados y construcción del payload de tracking compatible con el frontend
    const status = pkg.status;
    let statusLabel = "Prealertado";
    let statusClass = "miami";
    let icon = "📝";
    let pulseColor = "#f59e0b";
    let progressWidth = 10;
    let activeStepIndex = 0;
    let eta = "Pendiente";
    let statusText = "El cliente ha registrado la prealerta del paquete. Esperando recepción en Miami Hub.";
    let coordinates = { lat: 25.7617, lon: -80.1918, speed: 0, cx: 50, cy: 160, offset: 900 };
    let driver = null;

    const formattedDate = (dateStr: string | null) => {
      if (!dateStr) return "Pendiente";
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-CR", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
    };

    if (status === "prealerted") {
      statusLabel = "Prealertado";
      statusClass = "miami";
      icon = "📝";
      pulseColor = "#f59e0b";
      progressWidth = 10;
      activeStepIndex = 0;
      eta = "En espera en origen";
      statusText = "El cliente ha registrado la prealerta de compra. Esperando arribo en las bodegas de Miami.";
      coordinates = { lat: 25.7617, lon: -80.1918, speed: 0, cx: 50, cy: 160, offset: 900 };
    } else if (status === "received") {
      statusLabel = "Recibido en Miami";
      statusClass = "miami";
      icon = "📦";
      pulseColor = "#a78bfa";
      progressWidth = 25;
      activeStepIndex = 1;
      eta = "Próximo vuelo consolidado";
      statusText = "El paquete ingresó a bodega en Miami. Se encuentra clasificado en contenedor listo para exportación.";
      coordinates = { lat: 25.7617, lon: -80.1918, speed: 0, cx: 50, cy: 160, offset: 900 };
    } else if (status === "in_transit") {
      const isSea = pkg.shipping_mode === "sea";
      statusLabel = isSea ? "Tránsito Marítimo" : "Tránsito Internacional";
      statusClass = "in-transit";
      icon = isSea ? "🚢" : "✈️";
      pulseColor = "#38bdf8";
      progressWidth = 50;
      activeStepIndex = 2;
      eta = isSea ? "Arribando a puerto nacional" : "Arribando pronto a aduanas";
      statusText = isSea
        ? "Cargamento consolidado marítimo BreezeGo en tránsito marítimo hacia Costa Rica."
        : "Cargamento en vuelo de carga consolidado BreezeGo directo a San José (SJO).";
      coordinates = isSea
        ? { lat: 14.5422, lon: -82.4411, speed: 25, cx: 158, cy: 100, offset: 600 }
        : { lat: 14.5422, lon: -82.4411, speed: 650, cx: 158, cy: 100, offset: 600 };
    } else if (status === "customs") {
      statusLabel = "Proceso de Aduanas";
      statusClass = "in-transit";
      icon = "🛂";
      pulseColor = "#06b6d4";
      progressWidth = 70;
      activeStepIndex = 3;
      eta = "Aforo simplificado en curso";
      statusText = "Paquete en trámite de nacionalización y aforo de impuestos por sistema TICA local.";
      coordinates = { lat: 9.9880, lon: -84.2185, speed: 0, cx: 250, cy: 110, offset: 350 };
    } else if (status === "out_for_delivery") {
      statusLabel = "En Reparto Local";
      statusClass = "in-transit";
      icon = "🚚";
      pulseColor = "#3b82f6";
      progressWidth = 85;
      activeStepIndex = 4;
      eta = "Hoy en camino";
      statusText = "Paquete clasificado y a bordo de la unidad de reparto local para entrega domiciliar.";
      coordinates = { lat: 9.9352, lon: -84.0722, speed: 45, cx: 280, cy: 120, offset: 150 };
      
      if (pkg.driver_name) {
        driver = {
          name: pkg.driver_name,
          plate: pkg.driver_plate || "Unidad de Reparto",
          rating: "⭐ 4.90 Calificación",
          avatar: pkg.driver_name.substring(0, 2).toUpperCase(),
          initialMsg: `¡Hola! Llevo tu paquete con tracking ${cleanCode}. Estoy en ruta de reparto y estimo llegar a tu dirección en el transcurso del día. ¿Se encontrará alguien disponible para recibirlo?`
        };
      }
    } else if (status === "delivered") {
      statusLabel = "Entregado con Éxito";
      statusClass = "delivered";
      icon = "🎉";
      pulseColor = "#10b981";
      progressWidth = 100;
      activeStepIndex = 5;
      eta = formattedDate(pkg.delivered_at || pkg.updated_at);
      statusText = "El paquete fue entregado y firmado conforme por el destinatario.";
      coordinates = { lat: 9.9333, lon: -84.0833, speed: 0, cx: 350, cy: 140, offset: 0 };
    }

    // 3. Construcción dinámica de hitos (milestones)
    const milestones = [
      {
        title: "Prealerta Registrada",
        time: formattedDate(pkg.created_at),
        desc: "Prealerta del casillero debidamente registrada por el cliente.",
        state: "completed"
      },
      {
        title: "Recibido en Miami, FL",
        time: pkg.miami_received_at ? formattedDate(pkg.miami_received_at) : "Pendiente",
        desc: "Ingreso procesado con pesaje electrónico verificado en Miami Hub.",
        state: status === "prealerted" ? "upcoming" : (status === "received" ? "active" : "completed")
      },
      {
        title: pkg.shipping_mode === "sea" ? "Tránsito Marítimo" : "Tránsito Internacional",
        time: pkg.sjo_arrived_at ? formattedDate(pkg.sjo_arrived_at) : "Pendiente",
        desc: pkg.shipping_mode === "sea"
          ? "Flete marítimo internacional consolidado directo a puerto de Costa Rica."
          : "Flete aéreo internacional consolidado directo a San José (SJO).",
        state: ["prealerted", "received"].includes(status) ? "upcoming" : (status === "in_transit" ? "active" : "completed")
      },
      {
        title: "Proceso de Aduanas (SJO)",
        time: pkg.sjo_arrived_at ? formattedDate(pkg.sjo_arrived_at) : "Pendiente",
        desc: "Aforo fiscal arancelario simplificado finalizado sin contratiempos.",
        state: ["prealerted", "received", "in_transit"].includes(status) ? "upcoming" : (status === "customs" ? "active" : "completed")
      },
      {
        title: "En Reparto Local",
        time: pkg.delivered_at ? formattedDate(pkg.delivered_at) : "Pendiente",
        desc: "En camioneta de distribución asignado a ruta domiciliar.",
        state: ["prealerted", "received", "in_transit", "customs"].includes(status) ? "upcoming" : (status === "out_for_delivery" ? "active" : "completed")
      },
      {
        title: "Entregado con éxito",
        time: pkg.delivered_at ? formattedDate(pkg.delivered_at) : "Pendiente",
        desc: "Paquete entregado satisfactoriamente en destino.",
        state: status === "delivered" ? "completed" : "upcoming"
      }
    ];

    const trackerData = {
      code: cleanCode,
      status: statusLabel,
      statusClass,
      icon,
      pulseColor,
      progressWidth,
      activeStepIndex,
      eta,
      statusText,
      coordinates,
      driver,
      info: {
        desc: pkg.description || "Envío Comercial",
        sender: pkg.vendor || "Warehouse Global Hub",
        weight: `${pkg.weight || 0} Kg`,
        shippingMode: pkg.shipping_mode === "sea" ? "Marítimo 🚢" : "Aéreo ✈️",
        taxCat: "Consumo General (13% - 29.95%)",
        suite: "BZG Suite",
        address: pkg.address || "Dirección del Cliente registrado"
      },
      milestones
    };

    return NextResponse.json({ success: true, tracking: trackerData });

  } catch (err: any) {
    logger.error("Error crítico en endpoint público de rastreo", err, { ip });
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
