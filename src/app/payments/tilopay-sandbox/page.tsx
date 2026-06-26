"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, ShieldCheck, Lock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

// Native Web Crypto API HMAC-SHA256 Signature Generator
async function generateSignature(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await window.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function SandboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [transactionData, setTransactionData] = useState<{
    id: string;
    invoiceId: string;
    amountUsd: number;
    amountCrc: number;
  } | null>(null);

  // Form Fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("12/29");
  const [cardCvv, setCardCvv] = useState("");
  const [actionType, setActionType] = useState<"approved" | "rejected">("approved");

  useEffect(() => {
    if (!orderId) {
      setError("Falta el identificador de orden de cobro (orderId).");
      setLoading(false);
      return;
    }

    // Load checkout transaction details from server to display
    const fetchStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || "";

        const res = await fetch(`/api/payments/tilopay/status?orderId=${orderId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        
        if (data.success && data.transaction) {
          setTransactionData(data.transaction);
        } else {
          setError(data.error || "No se pudo recuperar la información de cobro.");
        }
      } catch (err) {
        setError("Error de conexión al servidor.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [orderId]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !transactionData) return;

    setProcessing(true);

    try {
      const generatedTxId = "tilo_tx_" + Math.random().toString(36).substring(2, 12).toUpperCase();
      const statusToSend = actionType;
      const paymentMethod = cardNumber.startsWith("5") ? "Mastercard" : "Visa";
      const maskedCard = cardNumber ? `•••• ${cardNumber.slice(-4)}` : "•••• 4242";
      const authCode = actionType === "approved" ? Math.floor(100000 + Math.random() * 900000).toString() : "";
      
      const payload = {
        orderNumber: orderId,
        status: statusToSend,
        transactionId: generatedTxId,
        paymentMethod: `${paymentMethod} (${maskedCard})`,
        authCode,
        errorMessage: actionType === "rejected" ? "Transacción denegada: Fondos insuficientes en tarjeta." : ""
      };

      const payloadString = JSON.stringify(payload);
      
      // Calculate HMAC-SHA256 using the shared webhook secret
      const webhookSecret = "BreezeGoTilopaySecret2026";
      const signature = await generateSignature(webhookSecret, payloadString);

      // Invoke server-side Webhook
      const res = await fetch("/api/payments/tilopay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tilopay-signature": signature
        },
        body: payloadString
      });

      const webhookData = await res.json();

      if (webhookData.success) {
        // Redirect client back to the return page
        router.push(`/dashboard?status=${actionType === "approved" ? "success" : "rejected"}&orderId=${orderId}`);
      } else {
        alert("Error de procesamiento del webhook: " + webhookData.error);
        setProcessing(false);
      }

    } catch (err) {
      console.error(err);
      alert("Error al procesar el pago ficticio en Sandbox.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <RefreshCw className="h-8 w-8 text-brand-cyan animate-spin" />
        <span className="text-xs font-semibold">Cargando pasarela Tilopay...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0f172a] border border-red-500/20 p-8 rounded-3xl text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-white font-heading font-extrabold text-lg">Error de Pago</h2>
          <p className="text-slate-400 text-xs">{error}</p>
          <Button onClick={() => router.push("/dashboard")} className="w-full rounded-xl">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-300 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-[#0e131f] border border-white/5 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Tilopay Brand Header */}
        <header className="p-6 bg-[#161f30]/60 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
              <span className="h-6 w-6 bg-brand-cyan rounded-lg flex items-center justify-center text-slate-900 font-extrabold text-xs">T</span>
              Tilopay <span className="text-brand-orange">Checkout</span>
            </span>
          </div>
          <span className="bg-brand-orange/15 text-brand-orange border border-brand-orange/20 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">
            Sandbox Simulator
          </span>
        </header>

        {/* Invoice details summary panel */}
        <div className="p-6 bg-[#141b2a]/30 border-b border-white/5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-450 font-medium">Factura ID:</span>
            <strong className="text-white font-mono">{transactionData?.invoiceId}</strong>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-450 font-medium">Orden de Flete:</span>
            <strong className="text-slate-400 font-mono">{orderId}</strong>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span className="text-xs font-semibold text-slate-300">Total a Pagar:</span>
            <div className="text-right">
              <span className="text-lg font-heading font-extrabold text-brand-cyan block">
                ${transactionData?.amountUsd.toFixed(2)} USD
              </span>
              <span className="text-[10px] text-slate-500 block">
                ≈ ₡{transactionData?.amountCrc.toLocaleString()} CRC
              </span>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-brand-cyan" />
              Detalles de Tarjeta
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número de Tarjeta</label>
                <Input
                  type="text"
                  placeholder="4000 1234 5678 9010"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  className="bg-slate-900 border-white/10 text-xs text-white placeholder-slate-650 h-10 rounded-xl"
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Tarjetahabiente</label>
                <Input
                  type="text"
                  placeholder="EDUARDO MORA SOLANO"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  className="bg-slate-900 border-white/10 text-xs text-white placeholder-slate-650 h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimiento</label>
                  <Input
                    type="text"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="bg-slate-900 border-white/10 text-xs text-white placeholder-slate-650 h-10 rounded-xl text-center"
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código CVV</label>
                  <Input
                    type="password"
                    placeholder="•••"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    className="bg-slate-900 border-white/10 text-xs text-white placeholder-slate-650 h-10 rounded-xl text-center"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox Flow Selector */}
          <div className="p-4 bg-[#1e293b]/20 border border-white/5 rounded-2xl space-y-3">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
              Configuración de Simulación (Webhook Response)
            </span>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionType("approved")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  actionType === "approved"
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-slate-900 border-white/5 text-slate-500 hover:text-slate-400"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Simular Aprobación</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType("rejected")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  actionType === "rejected"
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-slate-900 border-white/5 text-slate-500 hover:text-slate-400"
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                <span>Simular Rechazo</span>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={processing}
            className={`w-full h-11 rounded-xl uppercase font-heading font-extrabold text-xs tracking-wider text-slate-900 bg-brand-cyan hover:bg-brand-cyan/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-cyan/10 ${
              actionType === "rejected" && "bg-brand-orange text-white hover:bg-brand-orange/90 shadow-brand-orange/10"
            }`}
          >
            {processing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Procesando pago...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Pagar con seguridad ssl</span>
              </>
            )}
          </Button>
        </form>

        {/* Footer Security Badges */}
        <footer className="p-4 bg-[#0a0d16] border-t border-white/5 flex items-center justify-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            PCI Compliant
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <span>3D Secure 2.0 Enabled</span>
        </footer>

      </div>
    </div>
  );
}

export default function TilopaySandboxPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <RefreshCw className="h-8 w-8 text-brand-cyan animate-spin" />
        <span className="text-xs font-semibold">Cargando simulador de pagos...</span>
      </div>
    }>
      <SandboxContent />
    </Suspense>
  );
}
