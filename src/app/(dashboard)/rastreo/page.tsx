"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { mockDb } from "@/lib/supabase";
import { supabase, isRealSupabaseActive } from "@/lib/supabaseClient";
import { Package } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Search, 
  MapPin, 
  Truck, 
  Scale, 
  Loader2, 
  Compass, 
  ArrowRight,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function RastreoPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Retrieve code from URL if present
  useEffect(() => {
    async function loadPackages() {
      try {
        let pkgs: Package[] = [];
        if (isRealSupabaseActive) {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;
          
          if (userId) {
            const { data: dbPkgs, error: dbError } = await supabase
              .from("packages")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false });

            if (!dbError && dbPkgs) {
              pkgs = dbPkgs.map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                trackingNumber: p.tracking_number,
                vendor: p.vendor,
                description: p.description,
                weight: Number(p.weight || 0),
                shippingMode: p.shipping_mode,
                status: p.status,
                miamiReceivedAt: p.miami_received_at,
                sjoArrivedAt: p.sjo_arrived_at,
                deliveredAt: p.delivered_at,
                createdAt: p.created_at,
              }));
            }
          }
        } else {
          pkgs = await mockDb.packages.select();
          if (user) {
            pkgs = pkgs.filter(p => p.userId === user.id);
          }
        }
        setPackages(pkgs);

        // Pre-select package from URL search param if matching
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const codeParam = params.get("code");
          if (codeParam) {
            const matchedPkg = pkgs.find(p => p.trackingNumber.toLowerCase() === codeParam.toLowerCase());
            if (matchedPkg) {
              setSelectedPackageId(matchedPkg.id);
            } else if (pkgs.length > 0) {
              setSelectedPackageId(pkgs[0].id);
            }
          } else if (pkgs.length > 0) {
            setSelectedPackageId(pkgs[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading tracking packages:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadPackages();
    }
  }, [user]);

  // Filter packages based on search query
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => 
      pkg.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pkg.description && pkg.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pkg.vendor && pkg.vendor.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [packages, searchQuery]);

  const selectedPkg = useMemo(() => {
    return packages.find(p => p.id === selectedPackageId) || null;
  }, [packages, selectedPackageId]);

  // Helper formatting function for dates
  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return "Pendiente";
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-CR", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  };

  // Generate tracking details object
  const trackingData = useMemo(() => {
    if (!selectedPkg) return null;
    const status = selectedPkg.status;
    let statusLabel = "Prealertado";
    let statusClass = "miami";
    let icon = "📝";
    let pulseColor = "#f59e0b";
    let progressWidth = 10;
    let activeStepIndex = 0;
    let eta = "Pendiente";
    let statusText = "El cliente ha registrado la prealerta del paquete. Esperando recepción en Miami Hub.";
    let coordinates = { lat: 25.7617, lon: -80.1918, cx: 50, cy: 160, offset: 900 };
    let driver = null;

    if (status === "prealerted") {
      statusLabel = "Prealertado";
      statusClass = "miami";
      icon = "📝";
      pulseColor = "#f59e0b";
      progressWidth = 10;
      activeStepIndex = 0;
      eta = "En espera en origen";
      statusText = "El cliente ha registrado la prealerta de compra. Esperando arribo en las bodegas de Miami.";
      coordinates = { lat: 25.7617, lon: -80.1918, cx: 50, cy: 160, offset: 900 };
    } else if (status === "received") {
      statusLabel = "Recibido en Miami";
      statusClass = "miami";
      icon = "📦";
      pulseColor = "#a78bfa";
      progressWidth = 25;
      activeStepIndex = 1;
      eta = "Próximo vuelo consolidado";
      statusText = "El paquete ingresó a bodega en Miami. Se encuentra clasificado en contenedor listo para exportación.";
      coordinates = { lat: 25.7617, lon: -80.1918, cx: 50, cy: 160, offset: 900 };
    } else if (status === "in_transit") {
      const isSea = selectedPkg.shippingMode === "sea";
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
      coordinates = { lat: 14.5422, lon: -82.4411, cx: 158, cy: 100, offset: 600 };
    } else if (status === "customs") {
      statusLabel = "Proceso de Aduanas";
      statusClass = "in-transit";
      icon = "🛂";
      pulseColor = "#06b6d4";
      progressWidth = 70;
      activeStepIndex = 3;
      eta = "Aforo simplificado en curso";
      statusText = "Paquete en trámite de nacionalización y aforo de impuestos por sistema TICA local.";
      coordinates = { lat: 9.9880, lon: -84.2185, cx: 250, cy: 110, offset: 350 };
    } else if (status === "out_for_delivery") {
      statusLabel = "En Reparto Local";
      statusClass = "in-transit";
      icon = "🚚";
      pulseColor = "#3b82f6";
      progressWidth = 85;
      activeStepIndex = 4;
      eta = "Hoy en camino";
      statusText = "Paquete clasificado y a bordo de la unidad de reparto local para entrega domiciliar.";
      coordinates = { lat: 9.9352, lon: -84.0722, cx: 280, cy: 120, offset: 150 };
      
      const driverName = (selectedPkg as any).driverName || (selectedPkg as any).driver_name;
      if (driverName) {
        driver = {
          name: driverName,
          plate: (selectedPkg as any).driverPlate || (selectedPkg as any).driver_plate || "Unidad de Reparto",
          rating: "⭐ 4.90 Calificación",
          avatar: driverName.substring(0, 2).toUpperCase(),
          initialMsg: `¡Hola! Llevo tu paquete con tracking ${selectedPkg.trackingNumber}. Estoy en ruta de reparto y estimo llegar en el transcurso del día.`
        };
      }
    } else if (status === "delivered") {
      statusLabel = "Entregado con Éxito";
      statusClass = "delivered";
      icon = "🎉";
      pulseColor = "#10b981";
      progressWidth = 100;
      activeStepIndex = 5;
      eta = formattedDate(selectedPkg.deliveredAt);
      statusText = "El paquete fue entregado y firmado conforme por el destinatario.";
      coordinates = { lat: 9.9333, lon: -84.0833, cx: 350, cy: 140, offset: 0 };
    }

    const milestones = [
      {
        title: "Prealerta Registrada",
        time: formattedDate(selectedPkg.createdAt),
        desc: "Prealerta del casillero debidamente registrada por el cliente.",
        state: "completed"
      },
      {
        title: "Recibido en Miami, FL",
        time: selectedPkg.miamiReceivedAt ? formattedDate(selectedPkg.miamiReceivedAt) : "Pendiente",
        desc: "Ingreso procesado con pesaje electrónico verificado en Miami Hub.",
        state: status === "prealerted" ? "upcoming" : (status === "received" ? "active" : "completed")
      },
      {
        title: selectedPkg.shippingMode === "sea" ? "Tránsito Marítimo" : "Tránsito Internacional",
        time: selectedPkg.sjoArrivedAt ? formattedDate(selectedPkg.sjoArrivedAt) : "Pendiente",
        desc: selectedPkg.shippingMode === "sea"
          ? "Flete marítimo internacional consolidado directo a puerto de Costa Rica."
          : "Flete aéreo internacional consolidado directo a San José (SJO).",
        state: ["prealerted", "received"].includes(status) ? "upcoming" : (status === "in_transit" ? "active" : "completed")
      },
      {
        title: "Proceso de Aduanas (SJO)",
        time: selectedPkg.sjoArrivedAt ? formattedDate(selectedPkg.sjoArrivedAt) : "Pendiente",
        desc: "Aforo fiscal arancelario simplificado finalizado sin contratiempos.",
        state: ["prealerted", "received", "in_transit"].includes(status) ? "upcoming" : (status === "customs" ? "active" : "completed")
      },
      {
        title: "En Reparto Local",
        time: selectedPkg.deliveredAt ? formattedDate(selectedPkg.deliveredAt) : "Pendiente",
        desc: "En camioneta de distribución asignado a ruta domiciliar.",
        state: ["prealerted", "received", "in_transit", "customs"].includes(status) ? "upcoming" : (status === "out_for_delivery" ? "active" : "completed")
      },
      {
        title: "Entregado con éxito",
        time: selectedPkg.deliveredAt ? formattedDate(selectedPkg.deliveredAt) : "Pendiente",
        desc: "Paquete entregado satisfactoriamente en destino.",
        state: status === "delivered" ? "completed" : "upcoming"
      }
    ];

    return {
      code: selectedPkg.trackingNumber,
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
        desc: selectedPkg.description || "Envío Comercial",
        sender: selectedPkg.vendor || "Warehouse Global Hub",
        weight: selectedPkg.shippingMode === "sea" ? `${selectedPkg.weight || 0} CFT` : `${selectedPkg.weight || 0} Kg`,
        shippingMode: selectedPkg.shippingMode === "sea" ? "Marítimo 🚢" : selectedPkg.shippingMode === "air_colombia" ? "Aéreo Colombia ✈️" : "Aéreo ✈️",
        taxCat: "Consumo General (13% IVA)",
        suite: selectedPkg.userId ? `BEZG-${selectedPkg.userId.substring(0,4).toUpperCase()}` : "BEZG Suite",
        address: (selectedPkg as any).address || "Dirección del Cliente registrado"
      },
      milestones
    };
  }, [selectedPkg]);

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header and overview */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-teal/20 bg-brand-teal/5 text-brand-cyan text-[10px] font-heading font-extrabold uppercase tracking-widest mb-3 animate-pulse">
          <Compass className="h-3 w-3" />
          Rastreo de Casillero en Tiempo Real
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-white">Centro de Monitoreo Satelital</h1>
        <p className="text-slate-400 text-xs mt-1">
          Visualiza el tránsito en vivo, estimaciones de entrega e hitos de aduanas de tus importaciones consolidadas.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
          <Loader2 className="h-8 w-8 text-brand-cyan animate-spin" />
          <span className="text-xs">Sincronizando feed de GPS de cargas consolidadas...</span>
        </div>
      ) : packages.length === 0 ? (
        <Card className="border border-white/5 bg-[#111827]/40 backdrop-blur-sm p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <AlertCircle className="h-12 w-12 text-brand-orange mx-auto opacity-75" />
            <h3 className="text-white font-heading font-extrabold text-sm uppercase tracking-wider">No se encontraron casilleros</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              No tienes ningún paquete en tránsito o prealertado actualmente en tu cuenta de casillero.
            </p>
            <div className="pt-2">
              <Link href="/prealerts">
                <Button className="bg-brand-cyan hover:bg-brand-cyan/90 text-[#0b0f19] font-bold text-xs rounded-xl px-5 py-2.5">
                  Crear Primera Prealerta
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Package selector */}
          <div className="lg:col-span-4 space-y-4 w-full">
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por tracking o tienda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/5 bg-[#0a0f18] text-xs text-white placeholder-slate-500 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/20 transition-all"
              />
            </div>

            <Card className="max-h-[500px] overflow-y-auto">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-400 font-bold">Listado de Paquetes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredPackages.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">Ningún casillero coincide con la búsqueda.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-all duration-200 ${
                          selectedPackageId === pkg.id
                            ? "bg-[#16223f]/40 border-l-2 border-l-brand-cyan"
                            : "hover:bg-white/[0.01]"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <strong className="text-slate-200 block text-xs font-bold truncate">{pkg.description || "Envío Comercial"}</strong>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-mono block truncate">#{pkg.trackingNumber.substring(0, 12)}...</span>
                            <span className={`px-1 py-0.2 rounded text-[7px] font-bold uppercase inline-block leading-none ${
                              pkg.shippingMode === "sea" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : pkg.shippingMode === "air_colombia" ? "bg-brand-orange/10 text-brand-orange border border-brand-orange/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            }`}>
                              {pkg.shippingMode === "sea" ? "🚢 Mar" : pkg.shippingMode === "air_colombia" ? "✈️ Col" : "✈️ USA"}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold font-heading text-[8px] uppercase tracking-wider shrink-0 ${
                          pkg.status === "prealerted" && "bg-white/5 text-slate-400 border border-white/5"
                        } ${
                          pkg.status === "received" && "bg-brand-orange/10 text-brand-orange border border-brand-orange/20"
                        } ${
                          (pkg.status === "in_transit" || pkg.status === "customs" || pkg.status === "out_for_delivery") && "bg-brand-teal/15 text-brand-cyan border border-brand-cyan/20"
                        } ${
                          pkg.status === "delivered" && "bg-green-500/10 text-green-400 border border-green-500/20"
                        }`}>
                          {pkg.status === "out_for_delivery" ? "Reparto" : pkg.status === "in_transit" ? "Tránsito" : pkg.status === "customs" ? "Aduanas" : pkg.status === "received" ? "Miami" : pkg.status === "prealerted" ? "Alerta" : "Entregado"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Map + timeline */}
          <div className="lg:col-span-8 space-y-6 w-full">
            {trackingData ? (
              <Card className="border border-white/5 bg-[#111827]/40 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-[#172237]/20 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-heading font-extrabold text-white uppercase tracking-wider">
                        Detalle de Rastreo Satelital
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400 mt-0.5">
                        Estado en vivo de tu compra: <span className="text-brand-cyan font-mono font-bold">{trackingData.code}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
                      </span>
                      <span className="text-[10px] font-heading font-extrabold uppercase tracking-wider text-brand-cyan">
                        LIVE SENSOR
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Meta details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Remitente / Comercio</span>
                      <span className="text-slate-200 font-semibold block mt-0.5">{trackingData.info.sender}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Descripción del Contenido</span>
                      <span className="text-slate-200 font-semibold block mt-0.5 truncate">{trackingData.info.desc}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Volumen / Peso</span>
                      <span className="text-slate-200 font-semibold block mt-0.5 flex items-center gap-1">
                        <Scale className="h-3 w-3 text-brand-cyan" />
                        {trackingData.info.weight}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Modo de Distribución</span>
                      <span className="text-slate-200 font-semibold block mt-0.5">{trackingData.info.shippingMode}</span>
                    </div>
                  </div>

                  {/* SVG Map view */}
                  <div className="relative h-48 w-full rounded-xl bg-[#0a0f18] border border-white/5 overflow-hidden flex items-center justify-center p-2">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:14px_14px]"></div>
                    <svg className="w-full h-full max-w-[400px]" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <linearGradient id="map-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#1e293b" />
                          <stop offset="100%" stopColor={trackingData.pulseColor} />
                        </linearGradient>
                      </defs>

                      <path
                        d="M 50,140 Q 150,50 250,90 T 350,120"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      <path
                        d="M 50,140 Q 150,50 250,90 T 350,120"
                        fill="none"
                        stroke="url(#map-gradient)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray="400"
                        strokeDashoffset={trackingData.coordinates.offset}
                        filter="url(#map-glow)"
                        className="transition-all duration-1000 ease-in-out"
                      />

                      <circle cx="50" cy="140" r="5" fill="#a78bfa" />
                      <circle cx="50" cy="140" r="10" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="animate-pulse" />
                      <text x="32" y="160" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        MIA HUB
                      </text>

                      {trackingData.activeStepIndex > 0 && trackingData.activeStepIndex < 5 && (
                        <g>
                          <circle cx={trackingData.coordinates.cx} cy={trackingData.coordinates.cy} r="5" fill={trackingData.pulseColor} />
                          <circle cx={trackingData.coordinates.cx} cy={trackingData.coordinates.cy} r="10" fill="none" stroke={trackingData.pulseColor} strokeWidth="1" className="animate-ping" />
                          <text x={trackingData.coordinates.cx - 20} y={trackingData.coordinates.cy - 12} fill={trackingData.pulseColor} fontSize="8" fontFamily="sans-serif" fontWeight="extrabold">
                            {selectedPkg?.shippingMode === "sea" ? "🚢 CARGO" : "✈️ BZ-730"}
                          </text>
                        </g>
                      )}

                      <circle cx="250" cy="90" r="5" fill="#06b6d4" />
                      <text x="232" y="75" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        ADUANA
                      </text>

                      <circle cx="350" cy="120" r="5" fill="#10b981" />
                      {trackingData.activeStepIndex === 5 && (
                        <circle cx="350" cy="120" r="10" fill="none" stroke="#10b981" strokeWidth="1.5" className="animate-pulse" />
                      )}
                      <text x="325" y="140" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        ENTREGA
                      </text>
                    </svg>
                  </div>

                  {/* Driver information */}
                  {trackingData.driver && (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/10 animate-fade-in">
                      <div className="h-10 w-10 rounded-xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-heading font-extrabold text-sm border border-brand-cyan/20">
                        {trackingData.driver.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-heading font-extrabold text-white uppercase">{trackingData.driver.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{trackingData.driver.plate} • {trackingData.driver.rating}</p>
                      </div>
                      <a
                        href={`https://wa.me/50688994455?text=${encodeURIComponent(trackingData.driver.initialMsg)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" className="rounded-lg text-[10px] font-heading font-extrabold uppercase bg-brand-cyan text-[#0b0f19] hover:bg-brand-cyan/90 h-8">
                          Contactar Chofer
                        </Button>
                      </a>
                    </div>
                  )}

                  {/* Detailed milestones timeline */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <h4 className="text-xs font-heading font-extrabold text-white uppercase tracking-wider">
                        Bitácora Detallada de Tránsito
                      </h4>
                    </div>
                    <div className="relative border-l border-white/5 pl-4 ml-2 space-y-5 text-xs">
                      {trackingData.milestones.map((m, idx) => (
                        <div key={idx} className="relative">
                          <span className={`absolute -left-[21px] top-0.5 rounded-full h-2.5 w-2.5 flex items-center justify-center ${
                            m.state === "completed" ? "bg-green-500 ring-4 ring-green-500/10" :
                            m.state === "active" ? "bg-brand-cyan ring-4 ring-brand-cyan/20 animate-pulse" :
                            "bg-slate-700"
                          }`} />
                          
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <h5 className={`font-bold ${m.state === "upcoming" ? "text-slate-500" : "text-slate-200"}`}>
                                {m.title}
                              </h5>
                              <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">{m.desc}</p>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">{m.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-48 border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs">
                Selecciona un paquete del listado para ver su historial de rastreo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
