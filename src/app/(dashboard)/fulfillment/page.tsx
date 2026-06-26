"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Boxes, 
  Layers, 
  Send, 
  TrendingUp, 
  PackageCheck, 
  BadgeCheck, 
  Calculator, 
  Users,
  Settings,
  Truck
} from "lucide-react";

export default function FulfillmentPage() {
  // B2B Pick & Pack Slider Estimates State
  const [estantes, setEstantes] = useState<number>(3);
  const [packagesReceived, setPackagesReceived] = useState<number>(50);
  const [orders, setOrders] = useState<number>(150);
  const [isRegularFulfillment, setIsRegularFulfillment] = useState<boolean>(false);
  
  // Cost Formulas for BreezeGo Fulfillment CR (in CRC)
  // 1. Storage: ₡10.000 monthly per shelf space (estante)
  // 2. Recepción: ₡1.000 per package received
  // 3. Pick & Pack: ₡1.500 (launch) / ₡2.000 (regular) per order
  // 4. Last-Mile Delivery: ₡3.000 flat rate for GAM Costa Rica
  const estimates = useMemo(() => {
    const storageCostCRC = estantes * 10000;
    const recepcionCostCRC = packagesReceived * 1000;
    const pickPackCostCRC = orders * (isRegularFulfillment ? 2000 : 1500);
    const deliveryCostCRC = orders * 3000;
    
    const totalCostCRC = storageCostCRC + recepcionCostCRC + pickPackCostCRC + deliveryCostCRC;
    const totalCostUSD = totalCostCRC / 500;
    
    return {
      storageCostCRC,
      recepcionCostCRC,
      pickPackCostCRC,
      deliveryCostCRC,
      totalCostCRC,
      totalCostUSD
    };
  }, [estantes, packagesReceived, orders, isRegularFulfillment]);

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-teal/20 bg-brand-teal/5 text-brand-cyan text-[10px] font-heading font-extrabold uppercase tracking-widest mb-3">
            <Boxes className="h-3 w-3" />
            BreezeGo Business Solutions
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-white">Consola de Fulfillment B2B</h1>
          <p className="text-slate-400 text-xs mt-1">
            Almacenamiento logístico inteligente, alisto de pedidos (pick-and-pack) y distribución express para e-commerce y corporaciones en Costa Rica.
          </p>
        </div>
        <Button 
          onClick={() => window.open("https://wa.me/50660696039?text=Hola!%20Me%20interesa%20solicitar%20la%20integración%20API%20para%20el%20servicio%20de%20Fulfillment%20B2B%20de%20BreezeGo.", "_blank")}
          className="bg-brand-cyan hover:bg-brand-cyan/90 text-[#0b0f19] font-bold text-xs shrink-0 rounded-xl px-5 py-3 shadow-lg shadow-brand-cyan/15"
        >
          Solicitar Integración API
        </Button>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-white/5 bg-[#1d2a3e]/30 backdrop-blur-md space-y-2">
          <div className="h-8 w-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-white">Almacenamiento Flexible</h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Paga únicamente por las paletas o metros cúbicos que tus inventarios ocupen en nuestra bodega fiscal metropolitana.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-white/5 bg-[#1d2a3e]/30 backdrop-blur-md space-y-2">
          <div className="h-8 w-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
            <PackageCheck className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-white">Pick & Pack Preciso</h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Precisión del 99.8% en embalaje y alistado con código de barras integrado. Embalajes personalizados para tu marca.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-white/5 bg-[#1d2a3e]/30 backdrop-blur-md space-y-2">
          <div className="h-8 w-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
            <Send className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-white font-heading">Distribución en 24h</h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Entregas el mismo día o al día siguiente en toda la Gran Área Metropolitana (GAM) y despachos rurales vía Correos de CR.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-white/5 bg-[#1d2a3e]/30 backdrop-blur-md space-y-2">
          <div className="h-8 w-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-white">Escalabilidad de Stock</h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Ideal para pymes o empresas consolidadas. Sincroniza inventarios en tiempo real desde Shopify, WooCommerce o VTEX.
          </p>
        </div>
      </div>

      {/* Main Interactive Estimator Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: Sliders */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2 text-brand-cyan">
                <Calculator className="h-5 w-5" />
                <CardTitle>Simulador de Tarifas Corporativas</CardTitle>
              </div>
              <CardDescription>
                Estima costos mensuales de almacenamiento y despacho. Desliza los controles según tu proyección operativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              
              {/* Toggle for Phase of Operation */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Fase de Operación (Tarifas B2B)</label>
                <div className="flex rounded-xl bg-[#090d16] p-1 border border-white/5">
                  <button
                    type="button"
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      !isRegularFulfillment
                        ? "bg-brand-teal text-white shadow-md shadow-brand-teal/10"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    onClick={() => setIsRegularFulfillment(false)}
                  >
                    Lanzamiento (₡1.500 Pick & Pack)
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      isRegularFulfillment
                        ? "bg-brand-teal text-white shadow-md shadow-brand-teal/10"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    onClick={() => setIsRegularFulfillment(true)}
                  >
                    Regular (₡2.000 Pick & Pack)
                  </button>
                </div>
              </div>

              {/* Sliders 1: Shelf Storage Space */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Espacio Requerido (Estantes)</span>
                  <span className="text-brand-cyan font-mono">{estantes} Estantes</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="100"
                  value={estantes}
                  onChange={(e) => setEstantes(Number(e.target.value))}
                  className="w-full h-1 bg-[#172234] rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>1 Estante</span>
                  <span>100 Estantes</span>
                </div>
              </div>

              {/* Sliders 2: Packages Received */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Paquetes Recibidos por Mes</span>
                  <span className="text-brand-cyan font-mono">{packagesReceived} Paquetes</span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={packagesReceived}
                  onChange={(e) => setPackagesReceived(Number(e.target.value))}
                  className="w-full h-1 bg-[#172234] rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>10 Paquetes</span>
                  <span>1,000 Paquetes</span>
                </div>
              </div>

              {/* Sliders 3: Orders dispatched */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Pedidos Despachados por Mes</span>
                  <span className="text-brand-cyan font-mono">{orders} Pedidos</span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="2000"
                  step="10"
                  value={orders}
                  onChange={(e) => setOrders(Number(e.target.value))}
                  className="w-full h-1 bg-[#172234] rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>10 Pedidos</span>
                  <span>2,000 Pedidos</span>
                </div>
              </div>

              {/* Notes */}
              <div className="p-4 rounded-xl border border-white/5 bg-[#090d16] text-[10px] text-slate-400 space-y-1">
                <h4 className="font-semibold text-white uppercase tracking-wider text-[8px] text-brand-cyan">Fórmulas de Cobro (Fulfillment CR):</h4>
                <p>• Almacenamiento: ₡10.000 mensuales por espacio de estante.</p>
                <p>• Recepción de mercancía: ₡1.000 por paquete recibido.</p>
                <p>• Alistado de Pedido (Pick & Pack): ₡1.500 (lanzamiento) / ₡2.000 (regular) por orden (incluye caja Kraft + etiquetas).</p>
                <p>• Distribución local: Tarifa plana de ₡3.000 por entrega express en el GAM.</p>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Form: Simulated Cost Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-brand-teal/20">
            <CardHeader className="bg-brand-teal/5 border-b border-white/5 rounded-t-2xl">
              <CardTitle className="text-brand-teal text-sm">Resumen del Presupuesto Operativo</CardTitle>
              <CardDescription className="text-slate-300">Detalle mensual simulado en tiempo real.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5 text-xs">
              
              <div className="space-y-3 border-b border-white/5 pb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bodegaje ({estantes} Estantes):</span>
                  <span className="font-bold text-slate-200">₡{estimates.storageCostCRC.toLocaleString("es-CR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recepción de Mercancía ({packagesReceived} paq.):</span>
                  <span className="font-bold text-slate-200">₡{estimates.recepcionCostCRC.toLocaleString("es-CR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alistado Pick & Pack ({orders} pedidos):</span>
                  <span className="font-bold text-slate-200">₡{estimates.pickPackCostCRC.toLocaleString("es-CR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Distribución Express GAM:</span>
                  <span className="font-bold text-slate-200">₡{estimates.deliveryCostCRC.toLocaleString("es-CR")}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-white uppercase">Costo Estimado</span>
                  <span className="text-2xl font-heading font-extrabold text-brand-teal">₡{estimates.totalCostCRC.toLocaleString("es-CR")}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-slate-500">Ref. Dólares (₡500)</span>
                  <span className="text-xs font-semibold text-slate-300">${estimates.totalCostUSD.toFixed(2)} USD / mes</span>
                </div>
              </div>

              {/* Corporate Guarantee Card */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-white uppercase tracking-wider">
                  <BadgeCheck className="h-4 w-4 text-brand-teal" />
                  Garantía de Servicio (SLA)
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Nuestros acuerdos corporativos incluyen póliza de seguro de mercancías al 100% contra robo e incendio en bodega, reporte diario de inventario de stock, y acceso a webhook de despacho API.
                </p>
              </div>

              {/* Call to action */}
              <Button className="w-full bg-[#111c2e] hover:bg-brand-teal/10 hover:text-brand-teal text-slate-300 font-semibold border border-white/10 py-3 rounded-xl transition-all">
                Contactar a un Asesor B2B
              </Button>

            </CardContent>
          </Card>
        </div>

      </div>

      {/* Integration Workflow Steps */}
      <div className="p-6 rounded-2xl border border-white/5 bg-[#090d16] space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="h-4 w-4 text-brand-cyan" />
          Proceso de Onboarding de Fulfillment
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] leading-relaxed">
          <div className="space-y-1">
            <span className="text-brand-cyan font-bold block text-xs">Paso 1: Sincronización</span>
            <p className="text-slate-400">
              Conectamos su tienda online (Shopify, WooCommerce, API) para automatizar el ingreso de pedidos a nuestro sistema en el mismo instante de la compra.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-brand-cyan font-bold block text-xs">Paso 2: Almacenamiento</span>
            <p className="text-slate-400">
              Usted nos envía su inventario a nuestras bodegas en San José. Realizamos un conteo físico inicial, código de barras y etiquetado para posicionar su carga.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-brand-cyan font-bold block text-xs">Paso 3: Alisto y Envío</span>
            <p className="text-slate-400">
              Cuando un cliente final compra en su sitio, alistamos el paquete, lo empacamos con sus requerimientos de branding y lo distribuimos a su domicilio con rastreo en vivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
