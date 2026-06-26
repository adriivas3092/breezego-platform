"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { ArrowRight, Lock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Turnstile } from "@/components/Turnstile";
import { IS_TURNSTILE_ENABLED } from "@/lib/turnstile";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!token) {
      setError("Token de recuperación ausente. Solicita un nuevo enlace.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (IS_TURNSTILE_ENABLED && !captchaToken) {
      setError("Por favor resuelve el desafío de seguridad (CAPTCHA).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          captchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al restablecer la contraseña.");
      }

      setSuccessMessage(data.message || "¡Contraseña actualizada con éxito!");
      setPassword("");
      setConfirmPassword("");

      // Redirigir al login tras 3 segundos
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="border-white/5 shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-heading font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <ShieldAlert className="h-6 w-6 text-brand-orange" />
            Enlace Inválido
          </CardTitle>
          <CardDescription>
            El enlace de recuperación es inválido, ha expirado o está incompleto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-brand-orange/20 bg-brand-orange/5 rounded-xl text-slate-355 text-xs text-center leading-relaxed">
            Por favor, vuelve a solicitar un enlace de recuperación de contraseña ingresando tu correo electrónico en la siguiente pantalla.
          </div>
          <Link href="/recover">
            <Button className="w-full mt-2 rounded-xl flex items-center justify-center gap-1.5 uppercase font-heading tracking-wider font-extrabold text-xs">
              Solicitar Nuevo Enlace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/5 shadow-2xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-heading font-extrabold tracking-tight text-white">
          Establecer Contraseña
        </CardTitle>
        <CardDescription>
          Ingresa tu nueva contraseña para actualizar tu cuenta de forma segura.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {successMessage ? (
          <div className="space-y-4 text-center py-4">
            <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-slate-300 text-xs space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold mb-1">
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>¡Contraseña Cambiada!</span>
              </div>
              <span>{successMessage}</span>
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
              {/* Nueva Contraseña */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 text-xs text-white"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="password"
                    placeholder="Repite tu contraseña..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                Actualizar Contraseña
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-white/5 shadow-2xl">
          <CardContent className="py-12 text-center text-xs text-slate-500">
            Conectando con el servidor de seguridad de BreezeGo...
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
