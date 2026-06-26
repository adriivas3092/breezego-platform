"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type State = "verifying" | "paid" | "rejected" | "error";

export default function TilopayReturnPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const q = new URLSearchParams(window.location.search);
        const payload = {
          order: q.get("order") || "",
          tpt: q.get("tpt") || "",
          code: q.get("code") || "",
          auth: q.get("auth") || "",
          orderHash: q.get("OrderHash") || q.get("orderHash") || "",
        };

        if (!payload.order || !payload.orderHash) {
          setState("error");
          setMessage("No se recibieron los datos de la transacción.");
          return;
        }

        const res = await fetch("/api/payments/tilopay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success && data.paid) {
          setState("paid");
          setMessage("Tu pago fue aprobado y la factura quedó liberada para despacho.");
        } else if (data.success && !data.paid) {
          setState("rejected");
          setMessage("El pago no fue aprobado. Puedes intentarlo de nuevo desde tu dashboard.");
        } else {
          setState("error");
          setMessage(data.error || "No se pudo verificar el pago.");
        }
      } catch {
        setState("error");
        setMessage("Error de red al verificar el pago.");
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 text-white">
      <div className="bg-[#0e1320] border border-white/10 rounded-3xl w-full max-w-sm p-8 text-center space-y-5 shadow-2xl">
        {state === "verifying" && (
          <>
            <Loader2 className="h-12 w-12 text-brand-cyan animate-spin mx-auto" />
            <h1 className="font-heading font-extrabold text-base">Verificando tu pago…</h1>
            <p className="text-xs text-slate-400">Validando la firma de seguridad con Tilopay.</p>
          </>
        )}

        {state === "paid" && (
          <>
            <div className="h-14 w-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="font-heading font-extrabold text-lg">¡Pago aprobado!</h1>
            <p className="text-xs text-slate-400">{message}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-brand-cyan text-[#0b0f19] rounded-xl text-xs h-11 uppercase tracking-wider font-heading font-extrabold"
            >
              Ir al Dashboard
            </button>
          </>
        )}

        {(state === "rejected" || state === "error") && (
          <>
            <div className="h-14 w-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-9 w-9" />
            </div>
            <h1 className="font-heading font-extrabold text-lg">
              {state === "rejected" ? "Pago no aprobado" : "No se pudo verificar"}
            </h1>
            <p className="text-xs text-slate-400">{message}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-white/5 border border-white/10 text-slate-200 rounded-xl text-xs h-11 uppercase tracking-wider font-heading font-extrabold"
            >
              Volver al Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
