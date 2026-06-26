"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle2, ChevronRight, MapPin, Copy, Mail, User as UserIcon, Phone, FileText } from "lucide-react";
import { isRealSupabaseActive } from "@/lib/supabaseClient";
import { Turnstile } from "@/components/Turnstile";
import { IS_TURNSTILE_ENABLED } from "@/lib/turnstile";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Profile Fields
  const [idCard, setIdCard] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"gam" | "rural" | "locker">("gam");
  const [speedPreference, setSpeedPreference] = useState<"standard" | "express">("standard");

  // Mailbox details (computed upon step 4)
  const [suiteCode, setSuiteCode] = useState("BEZG-XX");
  
  const [captchaToken, setCaptchaToken] = useState("");

  // Carousel slide index
  const [slide, setSlide] = useState(0);
  const fullNameToDisplay = `BEZG ${fullName.replace(/^(?:BRG|BEZG|BZG)\s+/i, "").trim()}`;
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [signupTab, setSignupTab] = useState<"usa" | "colombia">("usa");
  const [signupUsMode, setSignupUsMode] = useState<"air" | "sea">("air");

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleNextStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCard.trim() || !address.trim() || !deliveryMethod || !speedPreference) {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (IS_TURNSTILE_ENABLED && !captchaToken) {
      setError("Por favor resuelve el desafío de seguridad (CAPTCHA).");
      return;
    }

    setError("");
    setLoading(true);
    
    // Generate next sequential BEZG code
    let generatedSuite = "BEZG-001";
    try {
       const users = JSON.parse(localStorage.getItem("bz_supabase_db_users_list") || "[]");
       const nextNum = users.length + 1;
       generatedSuite = `BEZG-${String(nextNum).padStart(3, "0")}`;
    } catch (e) {}
    setSuiteCode(generatedSuite);
    
    try {
      const result = await signup({
        fullName,
        lastName,
        email,
        phone,
        idCard,
        address,
        deliveryMethod,
        speedPreference,
        suiteCode: generatedSuite,
        captchaToken,
      }, password);
      
      const needsVerification = result ? result.needsVerification : false;
      setNeedsEmailVerification(needsVerification);
      setStep(3);
    } catch (err: any) {
      setError(err?.message || "Error al crear cuenta.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = () => {
    if (needsEmailVerification) {
      router.push(`/login?registered=true&email=${encodeURIComponent(email)}`);
    } else {
      router.push("/dashboard?registered=true");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles");
  };

  return (
    <div className="relative">
      <Card className="border-white/5 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">
            <span className={step >= 1 ? "text-brand-cyan font-extrabold" : ""}>Registro</span>
            <span>➔</span>
            <span className={step >= 2 ? "text-brand-cyan font-extrabold" : ""}>Onboarding</span>
            <span>➔</span>
            <span className={step >= 3 ? "text-brand-cyan font-extrabold" : ""}>Suite</span>
          </div>

          <CardTitle className="text-xl font-heading font-extrabold text-white">
            {step === 1 && "Crear Casillero Gratis"}
            {step === 2 && "Detalles de Onboarding"}
            {step === 3 && "¡Casillero Generado con Éxito!"}
            {step === 4 && "Cómo Operar BreezeGo"}
          </CardTitle>
          
          <CardDescription className="text-xs">
            {step === 1 && "Empieza tu registro premium. Sin pagos mensuales ni comisiones fijas."}
            {step === 2 && "Completa los requerimientos exigidos para validación arancelaria."}
            {step === 3 && "Usa estos datos para realizar tus compras online."}
            {step === 4 && "Breve tutorial inductivo para importar con éxito."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 border border-brand-orange/20 bg-brand-orange/5 rounded-xl text-brand-orange text-xs text-center">
              {error}
            </div>
          )}

          {/* STEP 1: ACCOUNT CREATION */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nombre</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Eduardo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 text-xs text-white"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Apellido</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Mora Solano"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10 text-xs text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Teléfono Móvil</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="tel"
                    placeholder="+506 8800-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Contraseña Segura</label>
                <Input
                  type="password"
                  placeholder="Mínimo 8 caracteres..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs text-white"
                  required
                />
              </div>

              <Button type="submit" className="w-full mt-2 rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider">
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          )}

          {/* STEP 2: PROFILE ONBOARDING */}
          {step === 2 && (
            <form onSubmit={handleNextStep2} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Cédula Física / DIMEX</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="1-1234-0567"
                    value={idCard}
                    onChange={(e) => setIdCard(e.target.value)}
                    className="pl-10 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-300">Dirección de Entrega en Costa Rica</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Sabanilla, Montes de Oca, San José..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Entrega Local</label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value as "gam" | "rural" | "locker")}
                    className="flex h-11 w-full rounded-xl border border-white/5 bg-[#172234]/50 px-3.5 py-2 text-xs text-white focus:border-brand-cyan focus:outline-none"
                    required
                  >
                    <option value="gam">Gran Área Metropolitana</option>
                    <option value="rural">Rural (Fuera GAM)</option>
                    <option value="locker">Smart Locker Sucursal</option>
                  </select>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Velocidad Flete</label>
                  <select
                    value={speedPreference}
                    onChange={(e) => setSpeedPreference(e.target.value as "standard" | "express")}
                    className="flex h-11 w-full rounded-xl border border-white/5 bg-[#172234]/50 px-3.5 py-2 text-xs text-white focus:border-brand-cyan focus:outline-none"
                    required
                  >
                    <option value="standard">Standard (Aéreo - 3 a 6 días hábiles)</option>
                    <option value="express">Express Priority (Aéreo - 3 a 6 días hábiles)</option>
                  </select>
                </div>
              </div>

              {/* Turnstile CAPTCHA obligatorio para registros */}
              <div className="flex flex-col space-y-1 my-2">
                <label className="text-[11px] font-semibold text-slate-400 text-center">
                  Verificación de Seguridad
                </label>
                <Turnstile 
                  onVerify={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken("")}
                  onExpire={() => setCaptchaToken("")}
                />
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" type="button" onClick={() => setStep(1)} className="flex-1 rounded-xl text-xs">
                  Atrás
                </Button>
                <Button type="submit" loading={loading} className="flex-1 rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider">
                  Generar Casillero
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: MAILBOX SUITE GENERATED */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 border border-emerald-500/20 bg-emerald-500/10 rounded-2xl text-slate-300 text-xs flex items-start gap-2.5 leading-relaxed">
                <span className="text-base leading-none select-none">🎉</span>
                <p>
                  <strong className="text-emerald-400 font-bold">¡Casillero Creado con Éxito!</strong> Tu cuenta ha sido registrada en el sistema de forma segura. Ya puedes utilizar la suite asignada abajo para realizar tus compras internacionales.
                </p>
              </div>

              <div className="flex bg-white/5 p-1 rounded-xl w-full gap-1">
                <button
                  onClick={() => setSignupTab("usa")}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all text-center ${
                    signupTab === "usa"
                      ? "bg-brand-cyan text-[#0b0f19]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🇺🇸 USA (Miami)
                </button>
                <button
                  onClick={() => setSignupTab("colombia")}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all text-center ${
                    signupTab === "colombia"
                      ? "bg-brand-cyan text-[#0b0f19]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🇨🇴 Colombia
                </button>
              </div>

              {signupTab === "usa" && (
                <div className="flex bg-white/5 p-1 rounded-xl w-full gap-1">
                  <button
                    onClick={() => setSignupUsMode("air")}
                    className={`flex-1 py-1 text-[11px] rounded-lg font-semibold transition-all text-center ${
                      signupUsMode === "air"
                        ? "bg-brand-cyan/20 text-brand-cyan font-bold"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    ✈️ Aéreo Express
                  </button>
                  <button
                    onClick={() => setSignupUsMode("sea")}
                    className={`flex-1 py-1 text-[11px] rounded-lg font-semibold transition-all text-center ${
                      signupUsMode === "sea"
                        ? "bg-brand-cyan/20 text-brand-cyan font-bold"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    🚢 Marítimo (&gt; 30 Kg)
                  </button>
                </div>
              )}

              <div className="p-4 rounded-2xl border border-brand-cyan/25 bg-brand-cyan/5 text-slate-200 text-xs space-y-3 leading-relaxed">
                <div className="flex items-center space-x-2 text-brand-cyan font-bold font-heading text-sm justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Suite Activada: {suiteCode}</span>
                  </div>
                  <span className="text-[10px] bg-brand-cyan/10 text-brand-cyan px-2.5 py-0.5 rounded-lg uppercase">
                    {signupTab === "usa" ? `USA (${signupUsMode === "air" ? "Aéreo" : "Marítimo"})` : "Colombia"}
                  </span>
                </div>
                <p>Usa exactamente esta plantilla de dirección al comprar en tiendas online:</p>

                {/* Mailing label details copy rows */}
                <div className="space-y-2 border-t border-white/5 pt-3 font-mono text-[11px] text-slate-300">
                  {(() => {
                    const clientFirstName = fullName.trim().split(" ")[0] || "";
                    const clientLastName = fullName.trim().split(" ").slice(1).join(" ") || "";
                    return signupTab === "usa" ? (
                      signupUsMode === "air" ? (
                        <>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>País:</strong> UNITED STATES</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("UNITED STATES")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Nombre:</strong> {fullNameToDisplay}</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(fullNameToDisplay)} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Apellido:</strong> {lastName}</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(lastName)} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Dirección (1):</strong> 8028 nw 14th st doral</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("8028 nw 14th st doral")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span className="truncate">
                              <strong>Dirección (2):</strong> {suiteCode}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(suiteCode)} className="h-7 w-7 text-brand-cyan hover:bg-white/5 shrink-0">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Ciudad:</strong> miami</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("miami")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Estado:</strong> florida</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("florida")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Código Postal:</strong> 33126-1612</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("33126-1612")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Teléfono:</strong> +1 786 4233562</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("+1 786 4233562")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>País:</strong> UNITED STATES</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("UNITED STATES")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Nombre:</strong> {fullNameToDisplay}</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(fullNameToDisplay)} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Apellido:</strong> {lastName}</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(lastName)} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Dirección (1):</strong> 8028 nw 14th st doral</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("8028 nw 14th st doral")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span className="truncate">
                              <strong>Dirección (2):</strong> {suiteCode}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(suiteCode)} className="h-7 w-7 text-brand-cyan hover:bg-white/5 shrink-0">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Ciudad:</strong> miami</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("miami")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Estado:</strong> florida</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("florida")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Código Postal:</strong> 33126-1612</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("33126-1612")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                            <span><strong>Teléfono:</strong> +1 786 4233562</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard("+1 786 4233562")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>País:</strong> COLOMBIA</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("COLOMBIA")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>Nombre:</strong> CR BREEZEGO</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("CR BREEZEGO")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>Apellido:</strong> {fullName}</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(fullName)} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span className="truncate"><strong>Dirección:</strong> Avenida 40 #55-98 ap 545 manzana 3 bloque 49</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("Avenida 40 #55-98 ap 545 manzana 3 bloque 49")} className="h-7 w-7 text-brand-cyan hover:bg-white/5 shrink-0">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>Referencias:</strong> {suiteCode} - COLOMBIA - AEREO</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${suiteCode} - COLOMBIA - AEREO`)} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>Departamento:</strong> Antioquia</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("Antioquia")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>Municipio:</strong> Bello</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("Bello")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>Barrio:</strong> Niquia</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("Niquia")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>Código Postal:</strong> 946268</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("946268")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-[#0b0f19] border border-white/5">
                          <span><strong>Teléfono:</strong> 3232338455</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("3232338455")} className="h-7 w-7 text-brand-cyan hover:bg-white/5">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <Button onClick={() => setStep(4)} className="w-full rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider">
                Ver Tutorial de Inducción
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* STEP 4: WELCOME CAROUSEL SLIDES */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Slider Content */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center min-h-48 flex flex-col justify-center space-y-4">
                {slide === 0 && (
                  <>
                    <span className="text-4xl">🛒</span>
                    <h4 className="font-heading font-bold text-white text-sm">Paso 1: Realiza tus Compras</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      Compra en tus tiendas preferidas usando tu dirección física BreezeGo de Miami, indicando siempre tu código suite único.
                    </p>
                  </>
                )}

                {slide === 1 && (
                  <>
                    <span className="text-4xl">⚡</span>
                    <h4 className="font-heading font-bold text-white text-sm">Paso 2: Prealerta en la Consola</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      En cuanto tengas tu tracking de la tienda, regístralo y sube la factura PDF. ¡Acelera los trámites de aduana un 80%!
                    </p>
                  </>
                )}

                {slide === 2 && (
                  <>
                    <span className="text-4xl">🚚</span>
                    <h4 className="font-heading font-bold text-white text-sm">Paso 3: Pago Aforado & Reparto</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      Te notificaremos al pesar en Miami y al liberar aduanas. Cancela tus fletes por SINPE y sigue tu chofer satelitalmente hasta tu hogar.
                    </p>
                  </>
                )}
              </div>

              {/* Slider Bullet Dots */}
              <div className="flex justify-center space-x-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setSlide(idx)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      slide === idx ? "bg-brand-cyan w-4" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {slide < 2 ? (
                  <Button onClick={() => setSlide(prev => prev + 1)} className="w-full rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider">
                    Siguiente Consejo
                  </Button>
                ) : (
                  <Button onClick={handleSignupSubmit} loading={loading} className="w-full rounded-xl text-[#0b0f19] bg-brand-cyan hover:bg-brand-cyan/90 font-heading font-extrabold text-xs uppercase tracking-wider">
                    Finalizar y Ver Dashboard
                  </Button>
                )}
              </div>
            </div>
          )}


        {isRealSupabaseActive ? (
          <div className="text-[10px] text-emerald-400 text-center font-semibold mt-3 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Conectado a Supabase Real
          </div>
        ) : (
          <div className="text-[10px] text-amber-500 text-center font-semibold mt-3 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Conexión: Base de Datos Simulada (Mock)
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
