"use client";

import React, { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Copy, Mail, AlertTriangle, ShieldCheck, MapPin } from "lucide-react";

export default function MailboxPage() {
  const { user } = useAuth();
  const [countryTab, setCountryTab] = useState<"usa" | "colombia">("usa");
  const [usMode, setUsMode] = useState<"air" | "sea">("air");

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para navegadores in-app (Instagram, Facebook, WhatsApp) o contextos no-HTTPS
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!ok) throw new Error("execCommand copy failed");
      }
      alert("Copiado al portapapeles: " + text);
    } catch (err) {
      // Si todo falla, mostramos el texto para copiado manual en vez de fallar en silencio
      window.prompt("Copia manualmente este dato:", text);
    }
  };

  if (!user) return null;

  const suiteCode = user.suiteCode || "BEZG-XX";
  const clientFullName = user.fullName || "Cliente BreezeGo";
  const fullNameToDisplay = `BEZG ${clientFullName.replace(/^(?:BRG|BEZG|BZG)\s+/i, "").trim()}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-white flex items-center gap-2">
          <MapPin className="h-6 w-6 text-brand-cyan" />
          Mis Direcciones de Casillero
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Usa exactamente estas estructuras al comprar en tiendas online de EE.UU. o de Colombia.
        </p>
      </div>

      {/* Country Tabs Header */}
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => setCountryTab("usa")}
          className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${
            countryTab === "usa"
              ? "border-brand-cyan text-brand-cyan"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🇺🇸 Estados Unidos (Miami)
        </button>
        <button
          onClick={() => setCountryTab("colombia")}
          className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${
            countryTab === "colombia"
              ? "border-brand-cyan text-brand-cyan"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🇨🇴 Colombia (Medellín)
        </button>
      </div>

      {countryTab === "usa" ? (
        <div className="space-y-4">
          {/* USA Air vs Sea Subtabs */}
          <div className="flex bg-white/5 p-1 rounded-xl w-max gap-1">
            <button
              onClick={() => setUsMode("air")}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                usMode === "air"
                  ? "bg-brand-cyan text-[#0b0f19] font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ✈️ Aéreo Express (3-6 días hábiles)
            </button>
            <button
              onClick={() => setUsMode("sea")}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                usMode === "sea"
                  ? "bg-brand-cyan text-[#0b0f19] font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🚢 Marítimo (&gt; 30 Kg - 22 días hábiles)
            </button>
          </div>

          <Card className="border-brand-cyan/20">
            <CardHeader className="bg-brand-cyan/5 border-b border-white/5 rounded-t-2xl">
              <div className="flex items-center space-x-2 text-brand-cyan">
                <Mail className="h-5 w-5" />
                <CardTitle>Plantilla de Dirección Miami ({usMode === "air" ? "Aéreo" : "Marítimo"})</CardTitle>
              </div>
              <CardDescription className="text-slate-300">
                Haz clic en copiar para capturar cada línea en los campos de Amazon, eBay, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5 text-xs leading-relaxed">
              
              {usMode === "air" ? (
                <>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">PAÍS</span>
                      <span className="text-white block font-mono truncate">UNITED STATES</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("UNITED STATES")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">NOMBRE (First Name)</span>
                      <span className="text-white block font-mono truncate">{fullNameToDisplay}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(fullNameToDisplay)} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">APELLIDO (Last Name)</span>
                      <span className="text-white block font-mono truncate">{user.lastName || ""}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(user.lastName || "")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">DIRECCIÓN (Address Line 1)</span>
                      <span className="text-white block font-mono truncate">8028 nw 14th st doral</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("8028 nw 14th st doral")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">REFERENCIAS (Address Line 2)</span>
                      <span className="text-white block font-mono truncate">{suiteCode}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(suiteCode)} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">CIUDAD (City)</span>
                      <span className="text-white block font-mono truncate">miami</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("miami")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">ESTADO (State)</span>
                      <span className="text-white block font-mono truncate">florida</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("florida")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">CÓDIGO POSTAL (Zip Code)</span>
                      <span className="text-white block font-mono truncate">33126-1612</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("33126-1612")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">TELÉFONO (Phone)</span>
                      <span className="text-white block font-mono truncate">+1 786 4233562</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("+1 786 4233562")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">PAÍS</span>
                      <span className="text-white block font-mono truncate">UNITED STATES</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("UNITED STATES")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">NOMBRE (First Name)</span>
                      <span className="text-white block font-mono truncate">{fullNameToDisplay}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(fullNameToDisplay)} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">APELLIDO (Last Name)</span>
                      <span className="text-white block font-mono truncate">{user.lastName || ""}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(user.lastName || "")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">DIRECCIÓN (Address Line 1)</span>
                      <span className="text-white block font-mono truncate">8028 nw 14th st doral</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("8028 nw 14th st doral")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">REFERENCIAS (Address Line 2)</span>
                      <span className="text-white block font-mono truncate">{suiteCode}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(suiteCode)} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">CIUDAD (City)</span>
                      <span className="text-white block font-mono truncate">miami</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("miami")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">ESTADO (State)</span>
                      <span className="text-white block font-mono truncate">florida</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("florida")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">CÓDIGO POSTAL (Zip Code)</span>
                      <span className="text-white block font-mono truncate">33126-1612</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("33126-1612")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">TELÉFONO (Phone)</span>
                      <span className="text-white block font-mono truncate">+1 786 4233562</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("+1 786 4233562")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}


              
              <div className="p-4 rounded-xl border border-white/5 bg-[#090d16] flex gap-3 text-[10px] leading-normal">
                <ShieldCheck className="h-5 w-5 text-brand-cyan shrink-0" />
                <div>
                  <strong>Casillero Regulado TSA</strong>
                  <p className="mt-0.5 text-slate-400">Nuestra bodega de Miami opera bajo lineamientos de seguridad TSA. Artículos inflamables o peligrosos no son permitidos.</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-brand-cyan/20">
          <CardHeader className="bg-brand-cyan/5 border-b border-white/5 rounded-t-2xl">
            <div className="flex items-center space-x-2 text-brand-cyan">
              <Mail className="h-5 w-5" />
              <CardTitle>Plantilla de Dirección Colombia (Bello, Antioquia)</CardTitle>
            </div>
            <CardDescription className="text-slate-300">
              Usa estos datos para direccionamiento de paquetes nacionales o compras directas en Colombia.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-3.5 text-xs leading-relaxed">
            
            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">PAÍS</span>
                <span className="text-white block font-mono truncate">COLOMBIA</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("COLOMBIA")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">NOMBRE</span>
                <span className="text-white block font-mono truncate">CR BREEZEGO</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("CR BREEZEGO")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">APELLIDO</span>
                <span className="text-white block font-mono truncate">{clientFullName}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(clientFullName)} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">DIRECCIÓN (Línea 1)</span>
                <span className="text-white block font-mono truncate">Avenida 40 #55-98 ap 545 manzana 3 bloque 49</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("Avenida 40 #55-98 ap 545 manzana 3 bloque 49")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">REFERENCIAS (Línea 2)</span>
                <span className="text-white block font-mono truncate">{suiteCode} - COLOMBIA - AEREO</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${suiteCode} - COLOMBIA - AEREO`)} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">DEPARTAMENTO</span>
                <span className="text-white block font-mono truncate">Antioquia</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("Antioquia")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">MUNICIPIO</span>
                <span className="text-white block font-mono truncate">Bello</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("Bello")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">BARRIO</span>
                <span className="text-white block font-mono truncate">Niquia</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("Niquia")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">CÓDIGO POSTAL</span>
                <span className="text-white block font-mono truncate">946268</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("946268")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">TELÉFONO</span>
                <span className="text-white block font-mono truncate">3232338455</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("3232338455")} className="h-8 w-8 text-brand-cyan shrink-0 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 text-slate-300 flex gap-3 text-[10px] leading-normal">
              <ShieldCheck className="h-5 w-5 text-brand-cyan shrink-0" />
              <div>
                <strong>Aduanas y Tránsito Colombia</strong>
                <p className="mt-0.5 text-slate-400">Los envíos desde o hacia Colombia están sujetos a aforo y normativas fiscales locales. Asegúrese de incluir su código de suite ({suiteCode}).</p>
              </div>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}
