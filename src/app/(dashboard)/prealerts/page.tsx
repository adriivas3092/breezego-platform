"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { mockDb } from "@/lib/supabase";
import { supabase, isRealSupabaseActive } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle2, ChevronRight, ShoppingCart, Truck, Upload, ArrowLeft, Info } from "lucide-react";

export default function PrealertsPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form Fields
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceName, setInvoiceName] = useState("Haz clic para buscar o arrastra tu factura aquí");
  const [shippingMode, setShippingMode] = useState<"air" | "sea">("air");
  const [declaredValue, setDeclaredValue] = useState("0.00");
  const [category, setCategory] = useState("general");
  const [wantsDelivery, setWantsDelivery] = useState(true);
  const [wantsInsurance, setWantsInsurance] = useState(true);

  const [createdCode, setCreatedCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError("El archivo supera el tamaño máximo permitido de 5MB.");
        return;
      }
      setInvoiceFile(file);
      setInvoiceName(file.name);
      setError("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const validExtensions = ["pdf", "jpg", "jpeg", "png"];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      if (!fileExtension || !validExtensions.includes(fileExtension)) {
        setError("Formato de archivo no permitido. Solo se permiten PDF, JPEG y PNG.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("El archivo supera el tamaño máximo permitido de 5MB.");
        return;
      }
      setInvoiceFile(file);
      setInvoiceName(file.name);
      setError("");
    }
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim() || !description.trim()) {
      setError("Por favor completa los detalles del comercio y descripción.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError("Por favor introduce el número de tracking de la tienda.");
      return;
    }
    setError("");
    setStep(3);
  };

  const handlePrealertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const finalTracking = trackingNumber.trim().toUpperCase();
    
    try {
      let uploadedInvoiceUrl = "";
      
      if (isRealSupabaseActive) {
        // Obtener la sesión del usuario actual
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (!userId) {
          throw new Error("No has iniciado sesión o tu sesión ha expirado.");
        }

        // Subir archivo real a Supabase Storage
        if (invoiceFile) {
          try {
            const fileExt = invoiceFile.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("invoices")
              .upload(filePath, invoiceFile, {
                cacheControl: "3600",
                upsert: false
              });

            if (uploadError) {
              console.error("Error al subir archivo a Supabase Storage:", uploadError);
              // Si el bucket falla (por RLS o falta de configuración), se notifica pero no se bloquea la prealerta
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from("invoices")
                .getPublicUrl(filePath);
              uploadedInvoiceUrl = publicUrl;
            }
          } catch (storageErr) {
            console.error("Excepción en Supabase Storage:", storageErr);
          }
        }

        const { error: insertError } = await supabase
          .from("packages")
          .insert({
            user_id: userId,
            tracking_number: finalTracking,
            vendor: vendor.trim(),
            description: description.trim(),
            weight: 0.0, // El peso se mide físicamente al llegar a Miami
            status: "prealerted",
            shipping_mode: shippingMode,
            declared_value: Number(declaredValue || 0),
            category: category,
            invoice_url: uploadedInvoiceUrl || null,
            wants_delivery: wantsDelivery,
            wants_insurance: wantsInsurance
          });

        if (insertError) {
          throw new Error(insertError.message.includes("unique") 
            ? "Este número de tracking ya ha sido registrado previamente." 
            : insertError.message
          );
        }
      } else {
        // Fallback simulado
        if (invoiceFile) {
          uploadedInvoiceUrl = `/mock-uploads/${invoiceFile.name}`;
        }
        await mockDb.packages.insert({
          userId: "user_uuid_12345",
          trackingNumber: finalTracking,
          vendor: vendor.trim(),
          description: description.trim(),
          weight: 0.0,
          status: "prealerted",
          shippingMode: shippingMode,
          declaredValue: Number(declaredValue || 0),
          category: category,
          invoiceUrl: uploadedInvoiceUrl,
          wantsDelivery: wantsDelivery,
          wantsInsurance: wantsInsurance
        });
      }
      
      setCreatedCode(finalTracking);
      setStep(4);
    } catch (err: any) {
      setError(err?.message || "Error al registrar prealerta.");
    } finally {
      setLoading(false);
    }
  };

  const estimateCosts = () => {
    const val = Number(declaredValue) || 0;
    const wantsIns = wantsInsurance !== false;
    const insuranceFee = wantsIns ? Number((val * 0.02).toFixed(2)) : 0.00;
    
    // Base flete estimate (assuming 1.0 kg default)
    let fleteEst = 12.00; // $12 USD for air
    if (shippingMode === "sea") {
      fleteEst = 27.00; // minimum 1 CFT for sea
    }
    
    // Import tax rate estimation
    let taxRate = 0.2995; // general category: DAI 15% + IVA 13% compounded
    if (category === "electronics") taxRate = 0.13;
    if (category === "books") taxRate = 0.01;
    if (category === "cosmetics") taxRate = 0.5455;
    if (category === "carparts") taxRate = 0.4927;
    
    // CIF Value = FOB + flete + insurance
    const cifValue = val + fleteEst + insuranceFee;
    const taxesCost = Number((cifValue * taxRate).toFixed(2));
    
    // Delivery fee
    const deliveryCost = wantsDelivery ? 7.00 : 0.00; // GAM standard flete local
    
    const totalUSD = fleteEst + insuranceFee + taxesCost + deliveryCost;
    const totalCRC = totalUSD * 500;
    
    return {
      fleteEst,
      insuranceFee,
      taxesCost,
      deliveryCost,
      totalUSD,
      totalCRC
    };
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-white">Prealertar Paquete</h1>
        <p className="text-slate-400 text-xs mt-1">Registra tus compras anticipadamente para acelerar el aforo aduanero en SJO.</p>
      </div>

      {step < 4 && (
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-white/5 border border-white/5 p-3 rounded-2xl">
          <span className={step >= 1 ? "text-brand-cyan font-extrabold" : ""}>1. Comercio</span>
          <span>➔</span>
          <span className={step >= 2 ? "text-brand-cyan font-extrabold" : ""}>2. Tracking</span>
          <span>➔</span>
          <span className={step >= 3 ? "text-brand-cyan font-extrabold" : ""}>3. Factura</span>
        </div>
      )}

      {error && (
        <div className="p-3 border border-brand-orange/20 bg-brand-orange/5 rounded-xl text-brand-orange text-xs text-center">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {/* STEP 1: MERCHANT DETAILS */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Tienda / Comercio de Origen</label>
                <div className="relative">
                  <ShoppingCart className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Amazon, eBay, Sephora..."
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="pl-10 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Descripción del Artículo</label>
                <Input
                  type="text"
                  placeholder="Zapatos deportivos Nike Pegasus 40..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Valor Comercial (FOB en USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(e.target.value)}
                    className="text-xs text-white"
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Categoría del Producto</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-cyan/30 focus:border-brand-cyan/30"
                    required
                  >
                    <option value="general" style={{ backgroundColor: "#0b0f19" }}>General / Ropa / Zapatos</option>
                    <option value="electronics" style={{ backgroundColor: "#0b0f19" }}>Electrónicos (IVA 13%)</option>
                    <option value="books" style={{ backgroundColor: "#0b0f19" }}>Libros (IVA 1%)</option>
                    <option value="cosmetics" style={{ backgroundColor: "#0b0f19" }}>Cosméticos (Impuesto 54.55%)</option>
                    <option value="carparts" style={{ backgroundColor: "#0b0f19" }}>Repuestos de Vehículos (Impuesto 49.27%)</option>
                  </select>
                </div>
              </div>

              {/* Tipo de Envío Selector */}
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-semibold text-slate-300">Tipo de Envío</label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 border border-white/5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setShippingMode("air")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      shippingMode === "air"
                        ? "bg-brand-cyan text-[#0b0f19] shadow-md shadow-brand-cyan/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>✈️ Aéreo (Express)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingMode("sea")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      shippingMode === "sea"
                        ? "bg-brand-cyan text-[#0b0f19] shadow-md shadow-brand-cyan/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>🚢 Marítimo (Económico)</span>
                  </button>
                </div>
              </div>

              {/* Opcion de Delivery */}
              <div className="flex flex-col space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-300">Entrega a Domicilio (Delivery)</label>
                <div 
                  className="flex items-start gap-3 p-3.5 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-brand-cyan/20 transition-all select-none" 
                  onClick={() => setWantsDelivery(!wantsDelivery)}
                >
                  <input
                    type="checkbox"
                    checked={wantsDelivery}
                    onChange={(e) => setWantsDelivery(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 mt-0.5 rounded border-white/10 text-brand-cyan bg-transparent focus:ring-brand-cyan/30 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">¿Deseas entrega a domicilio (delivery)?</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      Si lo desactivas, podrás retirar tus paquetes físicamente en nuestra sucursal sin costo adicional de flete local.
                    </span>
                  </div>
                </div>
              </div>

              {/* Opcion de Seguro */}
              <div className="flex flex-col space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-300">Seguro de Carga Courier (2% FOB)</label>
                <div 
                  className="flex items-start gap-3 p-3.5 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-brand-cyan/20 transition-all select-none" 
                  onClick={() => setWantsInsurance(!wantsInsurance)}
                >
                  <input
                    type="checkbox"
                    checked={wantsInsurance}
                    onChange={(e) => setWantsInsurance(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 mt-0.5 rounded border-white/10 text-brand-cyan bg-transparent focus:ring-brand-cyan/30 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">¿Deseas aplicar el seguro de BreezeGo (2%)?</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      Protege tu paquete ante pérdidas, robos o daños durante el transporte.
                    </span>
                  </div>
                </div>
                {!wantsInsurance && (
                  <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-xl text-red-400 text-[10px] leading-normal animate-fadeIn flex items-start gap-1.5">
                    <span className="font-bold">⚠️ Advertencia:</span>
                    <span>BreezeGo no se hace responsable por algún daño en los paquetes si decides no aplicar el seguro.</span>
                  </div>
                )}
              </div>

              {/* Previsualización de Costo Estimado */}
              {Number(declaredValue) > 0 && (
                <div className="p-4 border border-white/5 bg-[#0b0f19]/60 rounded-2xl space-y-2.5 animate-fadeIn">
                  <span className="text-xs font-bold text-white block uppercase tracking-wider text-slate-450">
                    Estadísticas y Costos Estimados (1.0 kg)
                  </span>
                  
                  <div className="space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Flete Internacional Est. ({shippingMode === "sea" ? "Marítimo" : "Aéreo"}):</span>
                      <span className="text-white">${estimateCosts().fleteEst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Seguro de Carga (2%):</span>
                      <span className="text-white">${estimateCosts().insuranceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Impuestos Aduanas Est.:</span>
                      <span className="text-white">${estimateCosts().taxesCost.toFixed(2)}</span>
                    </div>
                    {wantsDelivery && (
                      <div className="flex justify-between">
                        <span>Envío Local (GAM):</span>
                        <span className="text-white">${estimateCosts().deliveryCost.toFixed(2)}</span>
                      </div>
                    )}
                    <hr className="border-white/5 my-1" />
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-brand-cyan">Monto Final Estimado:</span>
                      <span className="text-brand-cyan">${estimateCosts().totalUSD.toFixed(2)} (≈ ₡{Math.round(estimateCosts().totalCRC).toLocaleString()})</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 block leading-normal italic">
                    * El monto de flete es estimado con base en un peso de 1.0 kg. El cobro final se realizará al pesar el paquete en nuestras bodegas de Miami.
                  </span>
                </div>
              )}

              {shippingMode === "sea" && (
                <div className="p-3 border border-brand-cyan/20 bg-brand-cyan/5 rounded-xl space-y-1 text-slate-300 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-brand-cyan font-bold text-xs">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Información de Envío Marítimo</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    La recepción de paquetes es de <strong>Lunes a Viernes de 8:00 a.m. a 5:00 p.m.</strong> y los barcos salen los <strong>15 y 30 de cada mes</strong>.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full mt-2 rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider">
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          )}

          {/* STEP 2: TRACKING NUMBER */}
          {step === 2 && (
            <form onSubmit={handleNextStep2} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Número de Tracking de la Tienda</label>
                <div className="relative">
                  <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="UPS-1234567, USPS-998811..."
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="pl-10 text-xs text-white"
                    required
                  />
                </div>
                <span className="text-[9px] text-slate-500 leading-normal">
                  Introduce el número de seguimiento provisto por el comercio al despachar el paquete en USA.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setStep(1)} className="flex-1 rounded-xl text-xs">
                  Atrás
                </Button>
                <Button type="submit" className="flex-1 rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider">
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: PDF INVOICE UPLOAD */}
          {step === 3 && (
            <form onSubmit={handlePrealertSubmit} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Subir Factura Comercial (PDF, PNG, JPEG)</label>
                
                {/* Drag-and-drop real box */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`border border-dashed duration-200 p-8 rounded-2xl text-center space-y-3 bg-[#0b0f19] cursor-pointer transition-all ${
                    invoiceFile ? "border-brand-cyan/80 bg-brand-cyan/5" : "border-white/10 hover:border-brand-cyan/40"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                  <Upload className={`h-8 w-8 mx-auto transition-colors ${invoiceFile ? "text-brand-cyan" : "text-slate-400"}`} />
                  <div className={`text-xs font-bold ${invoiceFile ? "text-brand-cyan" : "text-white"}`}>
                    {invoiceName}
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-normal">
                    {invoiceFile 
                      ? "¡Archivo seleccionado! Haz clic de nuevo si deseas cambiarlo." 
                      : "Formatos recomendados: PDF, JPEG o PNG. Tamaño máximo 5MB."
                    }
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setStep(2)} className="flex-1 rounded-xl text-xs">
                  Atrás
                </Button>
                <Button type="submit" loading={loading} className="flex-1 rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider">
                  Registrar Prealerta
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 4 && (
            <div className="text-center py-6 space-y-6 leading-relaxed">
              <div className="h-14 w-14 bg-brand-cyan/15 text-brand-cyan rounded-full flex items-center justify-center mx-auto ping-glow-dot">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-white">¡Prealerta Registrada con Éxito!</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Tu paquete ha sido integrado en la base de datos nacional. Código de prealerta: <strong className="text-brand-cyan font-mono font-bold">{createdCode}</strong>.
                </p>
              </div>

              <div className="flex gap-2 max-w-sm mx-auto">
                <Button variant="outline" onClick={() => {
                  setStep(1);
                  setVendor("");
                  setDescription("");
                  setTrackingNumber("");
                }} className="flex-1 rounded-xl text-xs">
                  Prealertar Otro
                </Button>
                <Button onClick={() => router.push("/dashboard")} className="flex-1 rounded-xl text-[#0b0f19] bg-brand-cyan font-heading font-extrabold text-xs uppercase tracking-wider">
                  Ir al Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
