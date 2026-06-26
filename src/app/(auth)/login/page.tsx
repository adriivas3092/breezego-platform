"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { KeyRound, Mail, ArrowRight } from "lucide-react";
import { isRealSupabaseActive } from "@/lib/supabaseClient";
import { Turnstile } from "@/components/Turnstile";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [justRegistered, setJustRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("registered") === "true") {
        setJustRegistered(true);
        setRegisteredEmail(params.get("email") || "");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (showCaptcha && !captchaToken) {
      setError("Por favor resuelve el desafío de seguridad (CAPTCHA).");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password.trim(), captchaToken);
      router.push("/dashboard?logged_in=true");
    } catch (err: any) {
      setError(err?.message || "Error de autenticación. Intenta de nuevo.");
      if (err?.showCaptcha) {
        setShowCaptcha(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-white/5 shadow-2xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-heading font-extrabold tracking-tight text-white">
          Ingresar a BreezeGo
        </CardTitle>
        <CardDescription>
          Introduce tus credenciales para administrar tus paquetes y fletes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {justRegistered && (
          <div className="p-4 border border-brand-cyan/20 bg-brand-cyan/5 rounded-xl text-slate-300 text-xs space-y-1 text-center">
            <span className="text-brand-cyan font-bold block">📧 ¡Registro Exitoso!</span>
            <span>
              Tu cuenta ha sido creada correctamente. Ya puedes ingresar introduciendo tu correo y contraseña.
            </span>
          </div>
        )}
        
        {error && (
          <div className="p-3 border border-brand-orange/20 bg-brand-orange/5 rounded-xl text-brand-orange text-xs text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="flex flex-col space-y-1.5">
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

          {/* Password */}
          <div className="flex flex-col space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-300">Contraseña</label>
              <Link href="/recover" className="text-[10px] text-brand-cyan hover:underline">¿La olvidaste?</Link>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 text-xs text-white"
                required
              />
            </div>
          </div>

          {/* Turnstile CAPTCHA condicional */}
          {showCaptcha && (
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
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full mt-2 rounded-xl flex items-center justify-center gap-1.5 uppercase font-heading tracking-wider font-extrabold text-xs"
            loading={loading}
          >
            Ingresar Seguro
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="text-center pt-4 border-t border-white/5 text-[11px] text-slate-400">
          ¿No tienes una cuenta aún?{" "}
          <Link href="/signup" className="text-brand-cyan hover:underline font-semibold">
            Regístrate aquí
          </Link>
        </div>

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
  );
}
