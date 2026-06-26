"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Turnstile } from "@/components/Turnstile";
import { IS_TURNSTILE_ENABLED } from "@/lib/turnstile";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }

    if (IS_TURNSTILE_ENABLED && !captchaToken) {
      setError("Por favor resuelve el desafío de seguridad (CAPTCHA).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          captchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar el restablecimiento.");
      }

      setSuccessMessage(data.message || "¡Enlace enviado! Revisa tu correo.");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-white/5 shadow-2xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-heading font-extrabold tracking-tight text-white">
          Recuperar Contraseña
        </CardTitle>
        <CardDescription>
          Ingresa tu dirección de correo electrónico y te enviaremos un enlace seguro para restablecer tu contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {successMessage ? (
          <div className="space-y-4 text-center py-4">
            <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-slate-350 text-xs space-y-2 leading-relaxed">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold mb-1">
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>Correo de Recuperación Enviado</span>
              </div>
              <p>{successMessage}</p>
              <p className="text-[10px] text-slate-400">
                Asegúrate de revisar tu bandeja de correo no deseado (spam) si no ves el mensaje en unos minutos.
              </p>
            </div>
            <Link href="/login">
              <Button className="w-full mt-2 rounded-xl flex items-center justify-center gap-1.5 uppercase font-heading tracking-wider font-extrabold text-xs">
                Ir a Iniciar Sesión Ahora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
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
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Turnstile CAPTCHA obligatorio */}
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

              {/* Submit */}
              <Button
                type="submit"
                className="w-full mt-2 rounded-xl flex items-center justify-center gap-1.5 uppercase font-heading tracking-wider font-extrabold text-xs"
                loading={loading}
              >
                Enviar Enlace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-white/5 text-[11px] text-slate-400">
              ¿Recordaste tu contraseña?{" "}
              <Link href="/login" className="text-brand-cyan hover:underline font-semibold">
                Inicia sesión aquí
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
