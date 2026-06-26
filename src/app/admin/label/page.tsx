"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, isRealSupabaseActive } from "@/lib/supabaseClient";
import { mockDb } from "@/lib/supabase";
import { Package, User } from "@/types";
import { Printer, ArrowLeft } from "lucide-react";

function ShippingLabelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const autoPrint = searchParams.get("print") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pkg, setPkg] = useState<Package | null>(null);
  const [client, setClient] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // 1. Verify admin authorization
    if (typeof window !== "undefined") {
      const isAuthorized = sessionStorage.getItem("breezego_admin_authorized") === "true";
      if (!isAuthorized) {
        setError("Acceso denegado. Debes iniciar sesión como administrador.");
        setLoading(false);
        return;
      }
      setAuthorized(true);
    }
  }, []);

  useEffect(() => {
    if (!authorized || !id) return;

    async function loadData() {
      try {
        let pkgData: Package | null = null;
        let userData: User | null = null;

        if (isRealSupabaseActive) {
          const adminPasscode = sessionStorage.getItem("breezego_admin_passcode") || "";
          const res = await fetch(`/api/admin/packages?id=${id}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${adminPasscode}`
            }
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "No se encontró el paquete en la base de datos.");
          }
          pkgData = data.package;
          userData = data.client;
        } else {
          // Mock data fallback
          const pkgs = await mockDb.packages.select();
          const foundPkg = pkgs.find(p => p.id === id);
          if (foundPkg) {
            pkgData = foundPkg;
            const users = await mockDb.users.select();
            const foundUser = users.find(u => u.id === foundPkg.userId);
            if (foundUser) {
              userData = foundUser;
            }
          }
        }

        if (!pkgData) {
          throw new Error("El paquete solicitado no existe.");
        }

        setPkg(pkgData);
        setClient(userData);

        // Auto print trigger
        if (autoPrint) {
          setTimeout(() => {
            window.print();
          }, 800);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar los datos de la etiqueta.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [authorized, id, autoPrint]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-xs">
        Generando etiqueta de envío...
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 border border-red-500/20 bg-red-500/10 rounded-xl text-red-400 text-xs max-w-md">
          {error || "Error al generar la etiqueta."}
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Consola
        </button>
      </div>
    );
  }

  const trackingCode = pkg.trackingNumber.trim().toUpperCase();
  const barcodeValue = `*${trackingCode}*`;
  const trackingLength = trackingCode.length;

  // Ajustar tamaño del código de barras y texto para que no se desborde en trackings largos (USPS, etc.)
  let barcodeSizeClass = "text-[44px]";
  let trackingSizeClass = "text-[10px] tracking-widest";

  if (trackingLength > 12 && trackingLength <= 18) {
    barcodeSizeClass = "text-[36px]";
    trackingSizeClass = "text-[9px] tracking-wider";
  } else if (trackingLength > 18) {
    barcodeSizeClass = "text-[28px]";
    trackingSizeClass = "text-[8px] tracking-normal";
  }

  // QR Code URL (points to our tracking tool)
  const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `https://breezego.net/tracking?code=${trackingCode}`
  )}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 print:p-0 print:bg-white">
      {/* Google Fonts linking directly */}
      <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet" />

      {/* Control panel (not printed) */}
      <div className="w-[100mm] mb-4 flex justify-between gap-3 no-print">
        <button
          onClick={() => router.back()}
          className="flex-1 h-10 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 h-10 px-4 bg-brand-orange text-white hover:bg-brand-orange/95 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Imprimir Sticker
        </button>
      </div>

      {/* 4x6 Printable Waybill Sticker */}
      <div className="print-area w-[100mm] h-[150mm] bg-white text-black border-2 border-black p-4 flex flex-col justify-between overflow-hidden shadow-md font-sans text-xs box-border leading-tight relative">
        
        {/* Style block inside JSX for robust print sizing overrides */}
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-area {
              border: none !important;
              box-shadow: none !important;
              width: 100mm !important;
              height: 150mm !important;
              margin: 0 !important;
              padding: 4mm !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
            }
          }
        `}</style>

        {/* Section 1: Header */}
        <div className="border-b-2 border-black pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="BreezeGo Logo" 
              className="h-7 w-auto object-contain shrink-0" 
            />
            <div>
              <h1 className="text-xs font-black tracking-tighter uppercase text-black leading-none">BREEZEGO LOGISTICS</h1>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">LOGÍSTICA INTERNACIONAL</span>
              <span className="text-[8px] font-bold text-black block mt-0.5">Fecha: {new Date(pkg.createdAt).toLocaleDateString("es-CR")}</span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[8px] font-bold text-slate-500 uppercase">Destino</span>
            <div className="text-xl font-black border-2 border-black px-2 py-0.5 rounded bg-black text-white leading-none mt-0.5">CR</div>
          </div>
        </div>

        {/* Section 2: Barcode & Tracking info */}
        <div className="border-b-2 border-black py-2 text-center flex flex-col items-center justify-center">
          <div className={`barcode ${barcodeSizeClass} leading-none select-none tracking-normal`} style={{ fontFamily: "'Libre Barcode 39', cursive" }}>
            {barcodeValue}
          </div>
          <span className={`${trackingSizeClass} font-mono font-bold uppercase mt-1`}>
            {pkg.trackingNumber}
          </span>
        </div>

        {/* Section 3: Consignee & Details (Splitted) */}
        <div className="border-b-2 border-black py-2 grid grid-cols-12 gap-2">
          {/* Client Details */}
          <div className="col-span-8 border-r-2 border-black pr-2 space-y-1">
            <div className="text-[8.5px] uppercase font-bold text-slate-500">Destinatario (Consignee)</div>
            <strong className="text-[11px] font-black block text-black leading-tight">
              {client?.fullName || "Cliente BreezeGo"}
            </strong>
            <div className="text-[10px] font-mono font-bold text-black">
              Suite: <span className="bg-black text-white px-1.5 py-0.2 rounded text-[9px]">{client?.suiteCode || "BEZG-HUÉRFANO"}</span>
            </div>
            <div className="text-[9px] font-bold text-black">
              Tel: {client?.phone || "N/A"}
            </div>
          </div>

          {/* Quick Package Stats & QR */}
          <div className="col-span-4 pl-1 flex flex-col justify-between items-center text-center">
            <img 
              src={qrCodeDataUrl} 
              alt="Tracking QR Code" 
              className="h-14 w-14 border border-slate-200 p-0.5" 
            />
            <span className="text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">Escanear Tracking</span>
          </div>
        </div>

        {/* Section 4: Address */}
        <div className="border-b-2 border-black py-2 space-y-1 flex-1">
          <div className="text-[8px] uppercase font-bold text-slate-500">Dirección de Entrega (CR Address)</div>
          <p className="text-[9px] font-semibold text-black leading-snug">
            {client?.address || "Retirar en Bodega Central BreezeGo Costa Rica"}
          </p>
          <div className="grid grid-cols-3 gap-1 pt-1 text-[8.5px] font-bold text-black uppercase">
            <div>Provincia: <span className="block font-black">{client?.address ? client.address.split(",").pop()?.trim() : "GAM"}</span></div>
            <div>Envío: <span className="block font-black">{client?.deliveryMethod === "gam" ? "GAM (Express)" : client?.deliveryMethod === "rural" ? "RURAL" : "LOCKER"}</span></div>
            <div>Ruta: <span className="block font-black">{client?.deliveryMethod === "gam" ? "R-101" : "R-202"}</span></div>
          </div>
        </div>

        {/* Section 5: Content Description, Weight & Value */}
        <div className="border-b-2 border-black py-1.5 grid grid-cols-3 gap-2 text-[9px] text-black">
          <div>
            <span className="text-[7.5px] uppercase font-bold text-slate-500 block">Contenido</span>
            <span className="font-bold block truncate max-w-[80px]" title={pkg.description}>{pkg.description}</span>
          </div>
          <div className="text-center">
            <span className="text-[7.5px] uppercase font-bold text-slate-500 block">Peso</span>
            <span className="font-black block text-sm">{pkg.weight} Kg</span>
          </div>
          <div className="text-right">
            <span className="text-[7.5px] uppercase font-bold text-slate-500 block">Valor FOB</span>
            <span className="font-black block text-sm">${pkg.declaredValue || 0.0}</span>
          </div>
        </div>

        {/* Section 6: Footer Remitente / Return address */}
        <div className="pt-2 text-[7.5px] text-slate-500 flex items-center justify-between leading-tight">
          <div>
            <span className="font-bold uppercase block text-[6.5px]">Remitente (Sender / Warehouse)</span>
            <span>BreezeGo LLC, 7801 NW 37th St, Doral, FL 33166-6503</span>
          </div>
          <div className="text-right font-bold text-black font-mono text-[8px]">
            BEZG-v1.0
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ShippingLabelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-xs">
        Cargando datos de la etiqueta...
      </div>
    }>
      <ShippingLabelContent />
    </Suspense>
  );
}
