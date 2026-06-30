"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { mockDb } from "@/lib/supabase";
import { supabase, isRealSupabaseActive } from "@/lib/supabaseClient";
import { Package, Invoice, TilopayTransaction } from "@/types";
import { Copy, Plus, Compass, Scale, ShieldCheck, CreditCard, ArrowRight, Bell, HelpCircle, Loader2, Trash2, LogOut, MapPin, Truck, Plane, Ship, Check, Activity, ChevronRight, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  
  const clientFullName = user?.fullName || "Cliente BreezeGo";
  const fullNameToDisplay = `BEZG ${clientFullName.replace(/^(?:BRG|BEZG|BZG)\s+/i, "").trim()}`;
  const firstName = clientFullName.replace(/^(?:BRG|BEZG|BZG)\s+/i, "").trim().split(" ")[0] || "Cliente";

  const [packages, setPackages] = useState<Package[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<TilopayTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  
  const [countryTab, setCountryTab] = useState<"usa" | "colombia">("usa");
  const [usMode, setUsMode] = useState<"air" | "sea">("air");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const getPackageTrackingData = (pkg: Package) => {
    if (!pkg) return null;
    const status = pkg.status;
    let statusLabel = "Prealertado";
    let statusClass = "miami";
    let icon = "📝";
    let pulseColor = "#f59e0b";
    let progressWidth = 10;
    let activeStepIndex = 0;
    let eta = "Pendiente";
    let statusText = "El cliente ha registrado la prealerta del paquete. Esperando recepción en Miami Hub.";
    let coordinates = { lat: 25.7617, lon: -80.1918, cx: 50, cy: 160, offset: 900 };
    let driver = null;

    const formattedDate = (dateStr?: string) => {
      if (!dateStr) return "Pendiente";
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-CR", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
    };

    if (status === "prealerted") {
      statusLabel = "Prealertado";
      statusClass = "miami";
      icon = "📝";
      pulseColor = "#f59e0b";
      progressWidth = 10;
      activeStepIndex = 0;
      eta = "En espera en origen";
      statusText = "El cliente ha registrado la prealerta de compra. Esperando arribo en las bodegas de Miami.";
      coordinates = { lat: 25.7617, lon: -80.1918, cx: 50, cy: 160, offset: 900 };
    } else if (status === "received") {
      statusLabel = "Recibido en Miami";
      statusClass = "miami";
      icon = "📦";
      pulseColor = "#a78bfa";
      progressWidth = 25;
      activeStepIndex = 1;
      eta = "Próximo vuelo consolidado";
      statusText = "El paquete ingresó a bodega en Miami. Se encuentra clasificado en contenedor listo para exportación.";
      coordinates = { lat: 25.7617, lon: -80.1918, cx: 50, cy: 160, offset: 900 };
    } else if (status === "in_transit") {
      const isSea = pkg.shippingMode === "sea";
      statusLabel = isSea ? "Tránsito Marítimo" : "Tránsito Internacional";
      statusClass = "in-transit";
      icon = isSea ? "🚢" : "✈️";
      pulseColor = "#38bdf8";
      progressWidth = 50;
      activeStepIndex = 2;
      eta = isSea ? "Arribando a puerto nacional" : "Arribando pronto a aduanas";
      statusText = isSea
        ? "Cargamento consolidado marítimo BreezeGo en tránsito marítimo hacia Costa Rica."
        : "Cargamento en vuelo de carga consolidado BreezeGo directo a San José (SJO).";
      coordinates = isSea
        ? { lat: 14.5422, lon: -82.4411, cx: 158, cy: 100, offset: 600 }
        : { lat: 14.5422, lon: -82.4411, cx: 158, cy: 100, offset: 600 };
    } else if (status === "customs") {
      statusLabel = "Proceso de Aduanas";
      statusClass = "in-transit";
      icon = "🛂";
      pulseColor = "#06b6d4";
      progressWidth = 70;
      activeStepIndex = 3;
      eta = "Aforo simplificado en curso";
      statusText = "Paquete en trámite de nacionalización y aforo de impuestos por sistema TICA local.";
      coordinates = { lat: 9.9880, lon: -84.2185, cx: 250, cy: 110, offset: 350 };
    } else if (status === "out_for_delivery") {
      statusLabel = "En Reparto Local";
      statusClass = "in-transit";
      icon = "🚚";
      pulseColor = "#3b82f6";
      progressWidth = 85;
      activeStepIndex = 4;
      eta = "Hoy en camino";
      statusText = "Paquete clasificado y a bordo de la unidad de reparto local para entrega domiciliar.";
      coordinates = { lat: 9.9352, lon: -84.0722, cx: 280, cy: 120, offset: 150 };
      
      const driverName = (pkg as any).driverName || (pkg as any).driver_name;
      if (driverName) {
        driver = {
          name: driverName,
          plate: (pkg as any).driverPlate || (pkg as any).driver_plate || "Unidad de Reparto",
          rating: "⭐ 4.90 Calificación",
          avatar: driverName.substring(0, 2).toUpperCase(),
          initialMsg: `¡Hola! Llevo tu paquete con tracking ${pkg.trackingNumber}. Estoy en ruta de reparto y estimo llegar en el transcurso del día.`
        };
      }
    } else if (status === "delivered") {
      statusLabel = "Entregado con Éxito";
      statusClass = "delivered";
      icon = "🎉";
      pulseColor = "#10b981";
      progressWidth = 100;
      activeStepIndex = 5;
      eta = formattedDate(pkg.deliveredAt);
      statusText = "El paquete fue entregado y firmado conforme por el destinatario.";
      coordinates = { lat: 9.9333, lon: -84.0833, cx: 350, cy: 140, offset: 0 };
    }

    const milestones = [
      {
        title: "Prealerta Registrada",
        time: formattedDate(pkg.createdAt),
        desc: "Prealerta del casillero debidamente registrada por el cliente.",
        state: "completed"
      },
      {
        title: "Recibido en Miami, FL",
        time: pkg.miamiReceivedAt ? formattedDate(pkg.miamiReceivedAt) : "Pendiente",
        desc: "Ingreso procesado con pesaje electrónico verificado en Miami Hub.",
        state: status === "prealerted" ? "upcoming" : (status === "received" ? "active" : "completed")
      },
      {
        title: pkg.shippingMode === "sea" ? "Tránsito Marítimo" : "Tránsito Internacional",
        time: pkg.sjoArrivedAt ? formattedDate(pkg.sjoArrivedAt) : "Pendiente",
        desc: pkg.shippingMode === "sea"
          ? "Flete marítimo internacional consolidado directo a puerto de Costa Rica."
          : "Flete aéreo internacional consolidado directo a San José (SJO).",
        state: ["prealerted", "received"].includes(status) ? "upcoming" : (status === "in_transit" ? "active" : "completed")
      },
      {
        title: "Proceso de Aduanas (SJO)",
        time: pkg.sjoArrivedAt ? formattedDate(pkg.sjoArrivedAt) : "Pendiente",
        desc: "Aforo fiscal arancelario simplificado finalizado sin contratiempos.",
        state: ["prealerted", "received", "in_transit"].includes(status) ? "upcoming" : (status === "customs" ? "active" : "completed")
      },
      {
        title: "En Reparto Local",
        time: pkg.deliveredAt ? formattedDate(pkg.deliveredAt) : "Pendiente",
        desc: "En camioneta de distribución asignado a ruta domiciliar.",
        state: ["prealerted", "received", "in_transit", "customs"].includes(status) ? "upcoming" : (status === "out_for_delivery" ? "active" : "completed")
      },
      {
        title: "Entregado con éxito",
        time: pkg.deliveredAt ? formattedDate(pkg.deliveredAt) : "Pendiente",
        desc: "Paquete entregado satisfactoriamente en destino.",
        state: status === "delivered" ? "completed" : "upcoming"
      }
    ];

    return {
      code: pkg.trackingNumber,
      status: statusLabel,
      statusClass,
      icon,
      pulseColor,
      progressWidth,
      activeStepIndex,
      eta,
      statusText,
      coordinates,
      driver,
      info: {
        desc: pkg.description || "Envío Comercial",
        sender: pkg.vendor || "Warehouse Global Hub",
        weight: pkg.shippingMode === "sea" ? `${pkg.weight || 0} CFT` : `${pkg.weight || 0} Kg`,
        shippingMode: pkg.shippingMode === "sea" ? "Marítimo 🚢" : pkg.shippingMode === "air_colombia" ? "Aéreo Colombia ✈️" : "Aéreo ✈️",
        taxCat: "Consumo General (13% IVA)",
        suite: pkg.userId ? `BEZG-${pkg.userId.substring(0,4).toUpperCase()}` : "BEZG Suite",
        address: (pkg as any).address || "Dirección del Cliente registrado"
      },
      milestones
    };
  };

  // Saved Cards & Auto-Pay States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardHolder, setNewCardHolder] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [payingWithCardId, setPayingWithCardId] = useState<string | null>(null);

  // Security Verification (CVV) States
  const [cvvVerifyInvoiceId, setCvvVerifyInvoiceId] = useState<string | null>(null);
  const [cvvVerifyCardToken, setCvvVerifyCardToken] = useState<string | null>(null);
  const [cvvVerifyCardBrand, setCvvVerifyCardBrand] = useState<string>("");
  const [cvvVerifyCardLast4, setCvvVerifyCardLast4] = useState<string>("");
  const [cvvConfirmInput, setCvvConfirmInput] = useState<string>("");

  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("registered") === "true") {
        setShowSignupSuccess(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("logged_in") === "true") {
        setShowLoginSuccess(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      let pkgs: Package[] = [];
      if (isRealSupabaseActive) {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (userId) {
          const { data: dbPkgs, error: dbError } = await supabase
            .from("packages")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          if (!dbError && dbPkgs) {
            pkgs = dbPkgs.map((p: any) => ({
              id: p.id,
              userId: p.user_id,
              trackingNumber: p.tracking_number,
              vendor: p.vendor,
              description: p.description,
              weight: Number(p.weight || 0),
              shippingMode: p.shipping_mode,
              status: p.status,
              miamiReceivedAt: p.miami_received_at,
              sjoArrivedAt: p.sjo_arrived_at,
              deliveredAt: p.delivered_at,
              createdAt: p.created_at,
            }));
          }
        }
      } else {
        pkgs = await mockDb.packages.select();
      }
      let invs: Invoice[] = [];
      if (isRealSupabaseActive) {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          const { data: dbInvs, error: dbInvsError } = await supabase
            .from("invoices")
            .select("*")
            .eq("user_id", userId);
          if (!dbInvsError && dbInvs) {
            invs = dbInvs.map((inv: any) => ({
              id: inv.id,
              packageId: inv.package_id,
              fleteCost: Number(inv.flete_cost || 0),
              taxesCost: Number(inv.taxes_cost || 0),
              deliveryCost: Number(inv.delivery_cost || 0),
              totalCostUsd: Number(inv.total_cost_usd || 0),
              totalCostCrc: Number(inv.total_cost_crc || 0),
              isPaid: inv.is_paid,
              createdAt: inv.created_at
            }));
          }
        }
      } else {
        invs = await mockDb.invoices.select();
      }

      // Filter in memory to guarantee no invoice leakage
      const userPkgIds = pkgs.map(p => p.id);
      invs = invs.filter(inv => userPkgIds.includes(inv.packageId));

      const txs = await mockDb.transactions.select();
      const userInvIds = invs.map(i => i.id);
      const userTxs = txs.filter(tx => userInvIds.includes(tx.invoiceId));

      setPackages(pkgs);
      if (pkgs.length > 0 && !selectedPackageId) {
        setSelectedPackageId(pkgs[0].id);
      }
      setInvoices(invs);
      setTransactions(userTxs);
      
      if (user) {
        // Query users list to find match for logged in user's ID
        const usersList = await mockDb.users.select();
        const matchedUser = usersList.find(u => u.id === user.id);
        
        // Also check KEYS.USER
        const currentUserStr = localStorage.getItem("bz_supabase_auth_user");
        const activeMockUser = currentUserStr ? JSON.parse(currentUserStr) : null;
        
        if (matchedUser) {
          setCurrentUser(matchedUser);
        } else if (activeMockUser && activeMockUser.id === user.id) {
          setCurrentUser(activeMockUser);
        } else {
          // If not found, look at the active session object in local storage
          const activeSessionStr = localStorage.getItem("bz_supabase_db_user");
          const activeSessionUser = activeSessionStr ? JSON.parse(activeSessionStr) : null;
          setCurrentUser(activeSessionUser || user);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithSavedCard = async (invId: string, cardToken: string, cvvCode: string) => {
    if (!/^\d{3}$/.test(cvvCode)) {
      alert("Por seguridad anti-fraude, debes ingresar un código de seguridad CVV de 3 dígitos válido.");
      return;
    }

    const matchedInv = invoices.find(i => i.id === invId);
    if (!matchedInv) return;

    setPayingWithCardId(invId);
    setCvvVerifyInvoiceId(null);
    setCvvVerifyCardToken(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const response = await fetch("/api/payments/tilopay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceId: invId,
          amountUsd: matchedInv.totalCostUsd,
          amountCrc: matchedInv.totalCostCrc,
          cardToken: cardToken,
          cvv: cvvCode
        })
      });

      const data = await response.json();

      if (data.success && data.paid) {
        await mockDb.invoices.pay(invId);
        await mockDb.transactions.insert({
          id: data.orderId,
          invoiceId: invId,
          amountUsd: matchedInv.totalCostUsd,
          amountCrc: matchedInv.totalCostCrc,
          status: "paid",
          tilopayTxId: `tilo_tx_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
          paymentMethod: "Saved Card (Tokenized)",
          authCode: Math.floor(100000 + Math.random() * 900000).toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Trigger SMS/WhatsApp secure notification alert (Simulated)
        alert(`🔒 Transacción Segura Autorizada.\nPago con tarjeta guardada aprobado exitosamente por TiloPay.\nFlete liberado para despacho.`);
        fetchDashboardData();
      } else {
        alert("Error al procesar pago: " + (data.error || "Transacción denegada por emisor (CVV incorrecto o fondos insuficientes)."));
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al procesar el pago con tarjeta guardada.");
    } finally {
      setPayingWithCardId(null);
    }
  };

  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const cleanPAN = newCardNumber.replace(/\s+/g, "").replace(/\D/g, "");
    if (cleanPAN.length < 15 || cleanPAN.length > 16) {
      alert("Número de tarjeta inválido.");
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(newCardExpiry)) {
      alert("Formato de fecha de vencimiento inválido. Debe ser MM/AA.");
      return;
    }

    setIsSavingCard(true);
    try {
      let brand: "visa" | "mastercard" | "amex" | "other" = "other";
      if (cleanPAN.startsWith("4")) brand = "visa";
      else if (cleanPAN.startsWith("5")) brand = "mastercard";
      else if (cleanPAN.startsWith("3")) brand = "amex";

      await mockDb.users.addCard(user.id, {
        brand,
        last4: cleanPAN.slice(-4),
        expDate: newCardExpiry,
        isDefault: false,
        holderName: newCardHolder.toUpperCase()
      });

      alert("💳 Tarjeta guardada y tokenizada exitosamente en TiloPay.");
      setShowAddCardModal(false);
      
      setNewCardNumber("");
      setNewCardHolder("");
      setNewCardExpiry("");
      setNewCardCvv("");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert("Error al guardar la tarjeta.");
    } finally {
      setIsSavingCard(false);
    }
  };

  const handlePayInvoice = async (invId: string) => {
    const matchedInv = invoices.find(i => i.id === invId);
    if (!matchedInv) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const response = await fetch("/api/payments/tilopay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceId: invId,
          amountUsd: matchedInv.totalCostUsd,
          amountCrc: matchedInv.totalCostCrc
        })
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert("Error al iniciar pasarela: " + (data.error || "Error desconocido"));
      }

    } catch (err) {
      console.error(err);
      alert("Error de red al inicializar el checkout de Tilopay.");
    }
  };

  const handleVerifyPayment = async (status: string, orderId: string) => {
    setVerifyingPayment(true);
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
        const tx = data.transaction;
        
        const localTxs = await mockDb.transactions.select();
        const alreadyExists = localTxs.some(t => t.id === orderId);

        if (!alreadyExists) {
          if (tx.status === "paid") {
            await mockDb.invoices.pay(tx.invoiceId);
            await mockDb.transactions.insert({
              id: orderId,
              invoiceId: tx.invoiceId,
              amountUsd: tx.amountUsd,
              amountCrc: tx.amountCrc,
              status: "paid",
              tilopayTxId: tx.tilopayTxId,
              paymentMethod: tx.paymentMethod,
              authCode: tx.authCode,
              createdAt: tx.createdAt,
              updatedAt: tx.updatedAt
            });

            alert(`✅ ¡Pago con tarjeta aprobado por Tilopay!\nOrden: ${orderId}\nFactura: ${tx.invoiceId}\nCódigo de autorización: ${tx.authCode}\nFlete liberado para despacho.`);
          } else if (tx.status === "rejected") {
            await mockDb.transactions.insert({
              id: orderId,
              invoiceId: tx.invoiceId,
              amountUsd: tx.amountUsd,
              amountCrc: tx.amountCrc,
              status: "rejected",
              errorMessage: tx.errorMessage || "Transacción declinada.",
              createdAt: tx.createdAt,
              updatedAt: tx.updatedAt
            });

            alert(`❌ El pago con tarjeta fue rechazado por Tilopay.\nMotivo: ${tx.errorMessage || "Transacción denegada por emisor."}`);
          }
        }
      }
    } catch (err) {
      console.error("Error al verificar transacción con servidor:", err);
    } finally {
      setVerifyingPayment(false);
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchDashboardData();
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const orderId = params.get("orderId");
    
    if (status && orderId) {
      handleVerifyPayment(status, orderId);
    }
  }, []);

  // Memoized metric calculations
  const stats = useMemo(() => {
    const counts = { prealerted: 0, received: 0, in_transit: 0, delivered: 0 };
    packages.forEach(p => {
      if (p.status === "prealerted") counts.prealerted++;
      if (p.status === "received") counts.received++;
      if (p.status === "in_transit" || p.status === "customs" || p.status === "out_for_delivery") counts.in_transit++;
      if (p.status === "delivered") counts.delivered++;
    });
    return counts;
  }, [packages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles");
  };

  if (!user) return null;

  const selectedPkg = packages.find(p => p.id === selectedPackageId);
  const trackingData = selectedPkg ? getPackageTrackingData(selectedPkg) : null;

  return (
    <div className="space-y-8">
      {/* Header and Welcome tag */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            Command Center
            <span className="bg-brand-cyan/15 text-brand-cyan text-[10px] px-2 py-0.5 rounded-lg font-mono font-bold">
              v1.2 Online
            </span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Bienvenido de nuevo, <strong className="text-white font-semibold">{user.fullName}</strong>. Gestiona tus forwarding fletes de Miami a Costa Rica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/prealerts" className="flex-1 md:flex-initial">
            <Button size="sm" className="w-full md:w-auto rounded-xl flex items-center justify-center gap-1 text-xs font-bold font-heading uppercase tracking-wider">
              <Plus className="h-4 w-4" />
              Prealertar Paquete
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={logout}
            className="flex-1 md:flex-initial rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold font-heading uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white"
          >
            <LogOut className="h-4 w-4 text-brand-cyan" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* 1. METRIC WIDGETS COUNTERS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#1d2a3e]/30 border-l-4 border-l-brand-cyan border border-white/5 space-y-1">
          <span className="text-[10px] text-slate-500 font-heading font-extrabold uppercase tracking-wider block">Prealertados</span>
          <span className="text-2xl font-heading font-extrabold text-white">{stats.prealerted}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#1d2a3e]/30 border-l-4 border-l-brand-orange border border-white/5 space-y-1">
          <span className="text-[10px] text-slate-500 font-heading font-extrabold uppercase tracking-wider block">Listo en Miami</span>
          <span className="text-2xl font-heading font-extrabold text-white">{stats.received}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#1d2a3e]/30 border-l-4 border-l-brand-teal border border-white/5 space-y-1">
          <span className="text-[10px] text-slate-500 font-heading font-extrabold uppercase tracking-wider block">En Tránsito SJO</span>
          <span className="text-2xl font-heading font-extrabold text-white">{stats.in_transit}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#1d2a3e]/30 border-l-4 border-l-green-500 border border-white/5 space-y-1">
          <span className="text-[10px] text-slate-500 font-heading font-extrabold uppercase tracking-wider block">Entregados</span>
          <span className="text-2xl font-heading font-extrabold text-white">{stats.delivered}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Package list ledger / unpaid fletes */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Fletes Invoices Ledger Card */}
          <Card>
            <CardHeader>
              <CardTitle>Cobros de Flete & Liberación</CardTitle>
              <CardDescription>Facturas de importación emitidas por aforo y aduana.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Cargando fletes...</div>
              ) : invoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No hay facturas de flete disponibles aún.</div>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {invoices.map((inv) => {
                    const matchedPkg = packages.find(p => p.id === inv.packageId);
                    
                    return (
                      <div key={inv.id} className="p-4 flex items-center justify-between flex-wrap gap-4">
                        <div className="space-y-1">
                          <strong className="text-white block font-bold">
                            {matchedPkg?.description || "Paquete Logístico"}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Ref: {matchedPkg?.trackingNumber || "N/A"}
                          </span>
                        </div>

                        <div className="flex items-center space-x-6">
                          {/* Price */}
                          <div className="text-right">
                            <span className="font-heading font-extrabold text-white block text-sm">${inv.totalCostUsd}</span>
                            <span className="text-[9px] text-slate-500 block">₡{inv.totalCostCrc.toLocaleString()}</span>
                          </div>

                          {/* Action Pay */}
                          {inv.isPaid ? (
                            <div className="flex items-center space-x-2">
                              <span className="px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 font-bold font-heading text-[10px] uppercase tracking-wider">
                                Pagado
                              </span>
                              <Link
                                href={`/api/invoices/${inv.id}/pdf`}
                                target="_blank"
                                className="inline-flex items-center justify-center rounded-lg h-8 px-3 text-[10px] font-heading font-extrabold uppercase tracking-wider text-slate-300 border border-white/10 hover:bg-white/5 transition-all"
                              >
                                Descargar PDF
                              </Link>
                            </div>
                          ) : payingWithCardId === inv.id ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-cyan animate-pulse">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Procesando...
                            </span>
                          ) : currentUser?.savedCards && currentUser.savedCards.length > 0 ? (
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/api/invoices/${inv.id}/pdf`}
                                target="_blank"
                                className="inline-flex items-center justify-center rounded-lg h-8 px-2.5 text-[10px] font-heading font-bold text-slate-400 border border-white/5 hover:bg-white/5 transition-all"
                              >
                                PDF
                              </Link>
                              <select
                                onChange={(e) => {
                                  const cardId = e.target.value;
                                  if (!cardId) return;
                                  const card = currentUser.savedCards.find((c: any) => c.id === cardId);
                                  if (card) {
                                    setCvvVerifyInvoiceId(inv.id);
                                    setCvvVerifyCardToken(card.token);
                                    setCvvVerifyCardBrand(card.brand);
                                    setCvvVerifyCardLast4(card.last4);
                                    setCvvConfirmInput("");
                                  }
                                  e.target.value = "";
                                }}
                                className="bg-[#121824] border border-white/10 rounded-lg text-[9.5px] h-8 px-2 text-slate-355 font-semibold focus:outline-none focus:border-brand-cyan"
                              >
                                <option value="">Pagar con Tarjeta...</option>
                                {currentUser.savedCards.map((c: any) => (
                                  <option key={c.id} value={c.id}>
                                    {c.brand.toUpperCase()} (••• {c.last4})
                                  </option>
                                ))}
                              </select>

                              <Button
                                size="sm"
                                onClick={() => handlePayInvoice(inv.id)}
                                className="rounded-lg h-8 text-[10px] font-heading font-extrabold uppercase tracking-wider flex items-center gap-1 text-brand-cyan border border-brand-cyan/20 bg-brand-cyan/5 hover:bg-brand-cyan hover:text-[#0b0f19] transition-all"
                              >
                                Pasarela
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/api/invoices/${inv.id}/pdf`}
                                target="_blank"
                                className="inline-flex items-center justify-center rounded-lg h-8 px-2.5 text-[10px] font-heading font-bold text-slate-400 border border-white/5 hover:bg-white/5 transition-all"
                              >
                                PDF
                              </Link>
                              <Button
                                size="sm"
                                onClick={() => handlePayInvoice(inv.id)}
                                className="rounded-lg h-8 text-[10px] font-heading font-extrabold uppercase tracking-wider flex items-center gap-1 text-[#0b0f19] bg-brand-cyan"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                Pagar flete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* BreezeGo Wallet / Saved Cards Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 py-4">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-white text-base">
                  <CreditCard className="h-5 w-5 text-brand-cyan" />
                  Billetera BreezeGo (Tarjetas)
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">Gestiona tus tarjetas guardadas y cobros automáticos.</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddCardModal(true)}
                className="rounded-xl flex items-center gap-1 text-[10px] font-bold font-heading uppercase tracking-wider h-8 text-[#0b0f19] bg-brand-cyan"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva Tarjeta
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Pay Checkbox */}
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="space-y-0.5">
                  <strong className="text-white text-xs block font-bold">Débito Automático (Auto-Pay)</strong>
                  <span className="text-[10px] text-slate-500 block">Cobrar automáticamente el flete cuando tus paquetes lleguen a Miami.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentUser?.autoPayEnabled || false}
                    onChange={async (e) => {
                      if (!user) return;
                      const enabled = e.target.checked;
                      await mockDb.users.toggleAutoPay(user.id, enabled);
                      fetchDashboardData();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-cyan peer-checked:after:bg-[#0b0f19] peer-checked:after:border-[#0b0f19]"></div>
                </label>
              </div>

              {/* Cards List */}
              {!currentUser?.savedCards || currentUser.savedCards.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                  No tienes tarjetas de crédito o débito guardadas. Agrega una para habilitar pagos en 1-Clic.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentUser.savedCards.map((card: any) => (
                    <div
                      key={card.id}
                      className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between h-32 overflow-hidden ${
                        card.isDefault
                          ? "bg-gradient-to-br from-[#16223f] to-[#0e172a] border-brand-cyan/30 shadow-lg shadow-brand-cyan/5"
                          : "bg-[#0c101b] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase block">
                            {card.brand} {card.isDefault && <span className="text-brand-cyan ml-1 text-[8.5px] uppercase font-bold tracking-normal">(Predet.)</span>}
                          </span>
                          <span className="text-white text-xs font-mono font-bold block mt-1">•••• •••• •••• {card.last4}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {!card.isDefault && (
                            <button
                              onClick={async () => {
                                if (!user) return;
                                await mockDb.users.setDefaultCard(user.id, card.id);
                                fetchDashboardData();
                              }}
                              className="text-[9px] text-brand-cyan hover:underline font-bold px-2 py-0.5 rounded"
                            >
                              Fijar
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!user) return;
                              if (confirm("¿Estás seguro de eliminar esta tarjeta? Esta acción no se puede deshacer y cancelará los cobros automáticos asociados.")) {
                                await mockDb.users.deleteCard(user.id, card.id);
                                fetchDashboardData();
                              }
                            }}
                            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-bold border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-end text-[10px] font-mono text-slate-400">
                        <div>
                          <span className="text-[8px] text-slate-500 uppercase block">Propietario</span>
                          <span className="text-slate-300 uppercase truncate max-w-[120px] block">{card.holderName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-slate-500 uppercase block">Exp</span>
                          <span className="text-slate-300 block">{card.expDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de Pagos con Tarjeta */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos con Tarjeta (Tilopay)</CardTitle>
              <CardDescription>Registro y confirmación de cobros procesados en línea.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Cargando transacciones...</div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-550">Aún no has realizado pagos en línea a través de Tilopay.</div>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {transactions.map((tx) => {
                    const matchedPkg = packages.find(p => {
                      const matchedInv = invoices.find(i => i.id === tx.invoiceId);
                      return matchedInv && p.id === matchedInv.packageId;
                    });
                    
                    return (
                      <div key={tx.id} className="p-4 flex items-center justify-between flex-wrap gap-4">
                        <div className="space-y-1">
                          <strong className="text-white block font-bold">
                            {matchedPkg?.description || "Pago de Flete"}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Orden: {tx.id} | Factura: {tx.invoiceId}
                          </span>
                          {tx.status === "paid" && (
                            <span className="text-[9.5px] text-[#10b981] font-mono block">
                              Cod. Aut: {tx.authCode} | Mét: {tx.paymentMethod}
                            </span>
                          )}
                          {tx.status === "rejected" && (
                            <span className="text-[9.5px] text-brand-orange font-mono block">
                              Error: {tx.errorMessage || "Tarjeta declinada."}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-6">
                          {/* Price */}
                          <div className="text-right">
                            <span className="font-heading font-extrabold text-white block text-sm">${tx.amountUsd.toFixed(2)}</span>
                            <span className="text-[9px] text-slate-500 block">₡{tx.amountCrc.toLocaleString()}</span>
                          </div>

                          {/* Status Badge */}
                          <span className={`px-2.5 py-1 rounded-lg font-bold font-heading text-[10px] uppercase tracking-wider ${
                            tx.status === "paid" ? "bg-green-500/15 text-green-400" :
                            tx.status === "rejected" ? "bg-red-500/15 text-red-400" :
                            tx.status === "refunded" ? "bg-slate-500/15 text-slate-400" :
                            "bg-brand-orange/15 text-brand-orange"
                          }`}>
                            {tx.status === "paid" ? "Aprobado" :
                             tx.status === "rejected" ? "Rechazado" :
                             tx.status === "refunded" ? "Reembolsado" : "Pendiente"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {verifyingPayment && (
            <div className="fixed inset-0 bg-[#0b0f19]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 text-brand-cyan animate-spin" />
              <h3 className="text-white font-heading font-extrabold text-sm uppercase tracking-wider">
                Verificando transacción de Tilopay...
              </h3>
              <p className="text-slate-400 text-xs">
                Confirmando firma criptográfica y respuesta del webhook.
              </p>
            </div>
          )}

          {/* Recent packages tracker links */}
          <Card>
            <CardHeader>
              <CardTitle>Rastreo de Cargas Recientes</CardTitle>
              <CardDescription>Monitorea el avance de tus compras de forma granular.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Cargando paquetes...</div>
              ) : packages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No has registrado paquetes aún.</div>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`p-4 flex items-center justify-between flex-wrap gap-4 cursor-pointer transition-all duration-200 ${
                        selectedPackageId === pkg.id
                          ? "bg-[#16223f]/40 border-l-2 border-l-brand-cyan"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <strong className="text-slate-200 block font-bold">{pkg.description}</strong>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-mono block">Tracking: {pkg.trackingNumber}</span>
                          <span className={`px-1 py-0.2 rounded text-[7.5px] font-bold uppercase inline-block leading-none ${
                            pkg.shippingMode === "sea" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : pkg.shippingMode === "air_colombia" ? "bg-brand-orange/10 text-brand-orange border border-brand-orange/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}>
                            {pkg.shippingMode === "sea" ? "🚢 Marítimo" : pkg.shippingMode === "air_colombia" ? "✈️ Aéreo (Col)" : "✈️ Aéreo"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold font-heading text-[9px] uppercase tracking-wider ${
                          pkg.status === "prealerted" && "bg-white/5 text-slate-400"
                        } ${
                          pkg.status === "received" && "bg-brand-orange/15 text-brand-orange"
                        } ${
                          (pkg.status === "in_transit" || pkg.status === "customs" || pkg.status === "out_for_delivery") && "bg-brand-teal/20 text-brand-cyan"
                        } ${
                          pkg.status === "delivered" && "bg-green-500/15 text-green-400"
                        }`}>
                          {pkg.status.replace(/_/g, ' ')}
                        </span>

                        <div className="flex items-center gap-1">
                          {selectedPackageId === pkg.id && (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                          )}
                          <Link
                            href={`/api/packages/${pkg.id}/document`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            title="Descargar documento del paquete (PDF para reclamos)"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-brand-cyan hover:bg-white/5 rounded-lg">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/tracking?code=${encodeURIComponent(pkg.trackingNumber)}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-brand-cyan hover:bg-white/5 rounded-lg">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-Time Live Tracking Visualization details */}
          {trackingData && (
            <Card className="border border-white/5 bg-[#111827]/40 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-[#172237]/20 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-heading font-extrabold text-white uppercase tracking-wider">
                      Detalle de Rastreo Satelital
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 mt-0.5">
                      Estado en vivo de tu compra: <span className="text-brand-cyan font-mono font-bold">{trackingData.code}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
                    </span>
                    <span className="text-[10px] font-heading font-extrabold uppercase tracking-wider text-brand-cyan">
                      LIVE SENSOR
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Tienda / Remitente</span>
                    <span className="text-slate-200 font-medium block mt-0.5">{trackingData.info.sender}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Descripción</span>
                    <span className="text-slate-200 font-medium block mt-0.5 truncate">{trackingData.info.desc}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Peso Real</span>
                    <span className="text-slate-200 font-medium block mt-0.5">{trackingData.info.weight}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Envío</span>
                    <span className="text-slate-200 font-medium block mt-0.5">{trackingData.info.shippingMode}</span>
                  </div>
                </div>

                {/* SVG vector map */}
                <div className="relative h-44 w-full rounded-xl bg-[#0a0f18] border border-white/5 overflow-hidden flex items-center justify-center p-2">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:14px_14px]"></div>
                  <svg className="w-full h-full max-w-[400px]" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <linearGradient id="map-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor={trackingData.pulseColor} />
                      </linearGradient>
                    </defs>

                    <path
                      d="M 50,140 Q 150,50 250,90 T 350,120"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    <path
                      d="M 50,140 Q 150,50 250,90 T 350,120"
                      fill="none"
                      stroke="url(#map-gradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="400"
                      strokeDashoffset={trackingData.coordinates.offset}
                      filter="url(#map-glow)"
                      className="transition-all duration-1000 ease-in-out"
                    />

                    <circle cx="50" cy="140" r="5" fill="#a78bfa" />
                    <circle cx="50" cy="140" r="10" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="animate-pulse" />
                    <text x="32" y="160" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      MIA HUB
                    </text>

                    {trackingData.activeStepIndex > 0 && trackingData.activeStepIndex < 5 && (
                      <g>
                        <circle cx={trackingData.coordinates.cx} cy={trackingData.coordinates.cy} r="5" fill={trackingData.pulseColor} />
                        <circle cx={trackingData.coordinates.cx} cy={trackingData.coordinates.cy} r="10" fill="none" stroke={trackingData.pulseColor} strokeWidth="1" className="animate-ping" />
                        <text x={trackingData.coordinates.cx - 20} y={trackingData.coordinates.cy - 12} fill={trackingData.pulseColor} fontSize="8" fontFamily="sans-serif" fontWeight="extrabold">
                          {selectedPkg.shippingMode === "sea" ? "🚢 CARGO" : "✈️ BZ-730"}
                        </text>
                      </g>
                    )}

                    <circle cx="250" cy="90" r="5" fill="#06b6d4" />
                    <text x="232" y="75" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      ADUANA
                    </text>

                    <circle cx="350" cy="120" r="5" fill="#10b981" />
                    {trackingData.activeStepIndex === 5 && (
                      <circle cx="350" cy="120" r="10" fill="none" stroke="#10b981" strokeWidth="1.5" className="animate-pulse" />
                    )}
                    <text x="325" y="140" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      ENTREGA
                    </text>
                  </svg>
                </div>

                {/* Driver information */}
                {trackingData.driver && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/10">
                    <div className="h-10 w-10 rounded-xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-heading font-extrabold text-sm border border-brand-cyan/20">
                      {trackingData.driver.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-heading font-extrabold text-white uppercase">{trackingData.driver.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{trackingData.driver.plate} • {trackingData.driver.rating}</p>
                    </div>
                    <a
                      href={`https://wa.me/50688994455?text=${encodeURIComponent(trackingData.driver.initialMsg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" className="rounded-lg text-[10px] font-heading font-extrabold uppercase bg-brand-cyan text-[#0b0f19] hover:bg-brand-cyan/90 h-8">
                        Contactar Chofer
                      </Button>
                    </a>
                  </div>
                )}

                {/* Milestones timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-heading font-extrabold text-white uppercase tracking-wider">
                    Registro Detallado de Actividad
                  </h4>
                  <div className="relative border-l border-white/5 pl-4 ml-2 space-y-5 text-xs">
                    {trackingData.milestones.map((m, idx) => (
                      <div key={idx} className="relative">
                        <span className={`absolute -left-[21px] top-0.5 rounded-full h-2.5 w-2.5 flex items-center justify-center ${
                          m.state === "completed" ? "bg-green-500 ring-4 ring-green-500/10" :
                          m.state === "active" ? "bg-brand-cyan ring-4 ring-brand-cyan/20 animate-pulse" :
                          "bg-slate-700"
                        }`} />
                        
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h5 className={`font-bold ${m.state === "upcoming" ? "text-slate-500" : "text-slate-200"}`}>
                              {m.title}
                            </h5>
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">{m.desc}</p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">{m.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Physical Miami address template copy */}
        <div className="lg:col-span-4 space-y-4">
          {/* Country selector tabs */}
          <div className="flex bg-white/5 p-1 rounded-xl w-full gap-1">
            <button
              onClick={() => setCountryTab("usa")}
              className={`flex-1 py-1.5 text-[11px] rounded-lg font-bold transition-all text-center ${
                countryTab === "usa"
                  ? "bg-brand-cyan text-[#0b0f19]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🇺🇸 USA (Miami)
            </button>
            <button
              onClick={() => setCountryTab("colombia")}
              className={`flex-1 py-1.5 text-[11px] rounded-lg font-bold transition-all text-center ${
                countryTab === "colombia"
                  ? "bg-brand-cyan text-[#0b0f19]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🇨🇴 Colombia
            </button>
          </div>

          {countryTab === "usa" && (
            <div className="flex bg-white/5 p-1 rounded-xl w-full gap-1">
              <button
                onClick={() => setUsMode("air")}
                className={`flex-1 py-1 text-[10px] rounded-lg font-semibold transition-all text-center ${
                  usMode === "air"
                    ? "bg-brand-cyan/20 text-brand-cyan font-bold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                ✈️ Aéreo
              </button>
              <button
                onClick={() => setUsMode("sea")}
                className={`flex-1 py-1 text-[10px] rounded-lg font-semibold transition-all text-center ${
                  usMode === "sea"
                    ? "bg-brand-cyan/20 text-brand-cyan font-bold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                🚢 Marítimo
              </button>
            </div>
          )}

          <Card className="border-brand-cyan/20">
            <CardHeader className="bg-brand-cyan/5 border-b border-white/5 rounded-t-2xl py-3.5 px-4">
              <CardTitle className="text-brand-cyan text-xs flex items-center gap-1.5 justify-between">
                <span>Dirección de Casillero</span>
                <span className="text-[9px] bg-brand-cyan/15 text-brand-cyan px-2 py-0.5 rounded-lg">
                  {countryTab === "usa" ? `USA (${usMode === "air" ? "Aéreo" : "Marítimo"})` : "Colombia"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-[11px]">
              {countryTab === "usa" ? (
                usMode === "air" ? (
                  <>
                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">PAÍS</span>
                        <span className="text-white block font-mono truncate">UNITED STATES</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("UNITED STATES")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Nombre</span>
                        <span className="text-white block font-mono truncate">{fullNameToDisplay}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(fullNameToDisplay)} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Apellido</span>
                        <span className="text-white block font-mono truncate">{user.lastName || ""}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(user.lastName || "")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Address (1)</span>
                        <span className="text-white block font-mono truncate">8028 nw 14th st doral</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("8028 nw 14th st doral")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Referencias (2)</span>
                        <span className="text-white block font-mono truncate">
                          {user.suiteCode || "BEZG-XX"}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(user.suiteCode || "BEZG-XX")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">CIUDAD</span>
                        <span className="text-white block font-mono truncate">miami</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("miami")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">ESTADO</span>
                        <span className="text-white block font-mono truncate">florida</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("florida")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">CÓDIGO POSTAL</span>
                        <span className="text-white block font-mono truncate">33126-1612</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("33126-1612")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">TELÉFONO</span>
                        <span className="text-white block font-mono truncate">+1 786 4233562</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("+1 786 4233562")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">PAÍS</span>
                        <span className="text-white block font-mono truncate">UNITED STATES</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("UNITED STATES")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Nombre</span>
                        <span className="text-white block font-mono truncate">{fullNameToDisplay}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(fullNameToDisplay)} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Apellido</span>
                        <span className="text-white block font-mono truncate">{user.lastName || ""}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(user.lastName || "")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Address (1)</span>
                        <span className="text-white block font-mono truncate">8028 nw 14th st doral</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("8028 nw 14th st doral")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Referencias (2)</span>
                        <span className="text-white block font-mono truncate">
                          {user.suiteCode || "BEZG-XX"}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(user.suiteCode || "BEZG-XX")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">CIUDAD</span>
                        <span className="text-white block font-mono truncate">miami</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("miami")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">ESTADO</span>
                        <span className="text-white block font-mono truncate">florida</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("florida")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">CÓDIGO POSTAL</span>
                        <span className="text-white block font-mono truncate">33126-1612</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("33126-1612")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="truncate">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">TELÉFONO</span>
                        <span className="text-white block font-mono truncate">+1 786 4233562</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard("+1 786 4233562")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">PAÍS</span>
                      <span className="text-white block font-mono truncate">COLOMBIA</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("COLOMBIA")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Nombre</span>
                      <span className="text-white block font-mono truncate">CR BREEZEGO</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("CR BREEZEGO")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Apellido</span>
                      <span className="text-white block font-mono truncate">{user.fullName} {user.lastName || ""}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${user.fullName} ${user.lastName || ""}`.trim())} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Dirección</span>
                      <span className="text-white block font-mono truncate">Avenida 40 #55-98 ap 545 manzana 3 bloque 49</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("Avenida 40 #55-98 ap 545 manzana 3 bloque 49")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Referencias</span>
                      <span className="text-white block font-mono truncate">
                        {(user.suiteCode || "BEZG-XX")} - COLOMBIA - AEREO
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${user.suiteCode || "BEZG-XX"} - COLOMBIA - AEREO`)} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Departamento</span>
                      <span className="text-white block font-mono truncate">Antioquia</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("Antioquia")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Municipio</span>
                      <span className="text-white block font-mono truncate">Bello</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("Bello")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Barrio</span>
                      <span className="text-white block font-mono truncate">Niquia</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("Niquia")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Código Postal</span>
                      <span className="text-white block font-mono truncate">946268</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("946268")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Teléfono</span>
                      <span className="text-white block font-mono truncate">3232338455</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("3232338455")} className="h-7 w-7 text-brand-cyan shrink-0 rounded-lg">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}



            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL AGREGAR TARJETA */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-[#0b0f19]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1320] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-extrabold text-white text-base flex items-center gap-1.5">
                <CreditCard className="h-5 w-5 text-brand-cyan" />
                Nueva Tarjeta TiloPay
              </h3>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número de Tarjeta</label>
                <input
                  type="text"
                  placeholder="4000 1234 5678 9010"
                  value={newCardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 16);
                    const formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setNewCardNumber(formatted);
                  }}
                  className="w-full bg-[#0a0d16] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre en la Tarjeta</label>
                <input
                  type="text"
                  placeholder="JUAN PEREZ SOLANO"
                  value={newCardHolder}
                  onChange={(e) => setNewCardHolder(e.target.value)}
                  className="w-full bg-[#0a0d16] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimiento (MM/AA)</label>
                  <input
                    type="text"
                    placeholder="12/29"
                    value={newCardExpiry}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                      const formatted = value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value;
                      setNewCardExpiry(formatted);
                    }}
                    className="w-full bg-[#0a0d16] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan transition-colors text-center"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código CVV</label>
                  <input
                    type="password"
                    placeholder="•••"
                    value={newCardCvv}
                    onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    className="w-full bg-[#0a0d16] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan transition-colors text-center"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="flex-1 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs h-10 uppercase tracking-wider font-heading font-extrabold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingCard}
                  className="flex-1 bg-brand-cyan hover:bg-brand-cyan/90 text-[#0b0f19] rounded-xl text-xs h-10 uppercase tracking-wider font-heading font-extrabold flex items-center justify-center gap-1.5"
                >
                  {isSavingCard ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Registrar</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VERIFICACION SEGURIDAD CVV */}
      {cvvVerifyInvoiceId && (
        <div className="fixed inset-0 bg-[#0b0f19]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1320] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-extrabold text-white text-base flex items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-brand-cyan" />
                Validación de Seguridad
              </h3>
              <button
                onClick={() => {
                  setCvvVerifyInvoiceId(null);
                  setCvvVerifyCardToken(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-2">
                <p className="text-xs text-slate-300">
                  Estás autorizando el pago de flete con tu tarjeta tokenizada:
                </p>
                <div className="inline-flex items-center gap-2 bg-[#0a0d16] px-3 py-1.5 rounded-xl border border-white/10">
                  <CreditCard className="h-4 w-4 text-brand-cyan" />
                  <span className="font-mono font-bold text-xs text-white uppercase">
                    {cvvVerifyCardBrand} •••• {cvvVerifyCardLast4}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                  Ingresa el código CVV (3 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={3}
                  placeholder="•••"
                  value={cvvConfirmInput}
                  onChange={(e) => setCvvConfirmInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className="w-24 mx-auto block bg-[#0a0d16] border border-white/10 rounded-xl px-4 py-2.5 text-base tracking-widest text-white focus:outline-none focus:border-brand-cyan transition-colors text-center font-mono font-bold"
                  required
                />
                <span className="text-[9.5px] text-slate-500 block text-center leading-relaxed">
                  🔒 Seguridad PCI-DSS: El código se transmite encriptado a TiloPay y nunca se almacena en el servidor.
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setCvvVerifyInvoiceId(null);
                    setCvvVerifyCardToken(null);
                  }}
                  className="flex-1 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs h-10 uppercase tracking-wider font-heading font-extrabold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (cvvVerifyInvoiceId && cvvVerifyCardToken) {
                      handlePayWithSavedCard(cvvVerifyInvoiceId, cvvVerifyCardToken, cvvConfirmInput);
                    }
                  }}
                  disabled={cvvConfirmInput.length !== 3}
                  className="flex-1 bg-brand-cyan hover:bg-brand-cyan/90 text-[#0b0f19] rounded-xl text-xs h-10 uppercase tracking-wider font-heading font-extrabold flex items-center justify-center gap-1.5"
                >
                  Confirmar Pago
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO EXITOSO POPUP */}
      {showSignupSuccess && (
        <div className="fixed inset-0 bg-[#0b0f19]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1320] border border-brand-cyan/20 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-6 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
                <ShieldCheck className="h-10 w-10 text-brand-cyan" />
              </div>
              <h3 className="font-heading font-extrabold text-white text-lg tracking-tight">
                ¡Registro Completado con Éxito!
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Tu casillero digital BreezeGo está activo. Te hemos asignado la siguiente Suite única para tus fletes:
              </p>
              <div className="bg-[#0a0d16] px-5 py-3 rounded-2xl border border-white/10 font-mono font-bold text-base text-brand-cyan tracking-widest">
                {user?.suiteCode || "BEZG-XX"}
              </div>
              <p className="text-[10.5px] text-slate-500 leading-relaxed max-w-xs">
                Ya has iniciado sesión automáticamente. Puedes encontrar tus direcciones de entrega en la pestaña "Mi Casillero" para usarlas al comprar en USA o Colombia.
              </p>
            </div>

            <Button
              onClick={() => setShowSignupSuccess(false)}
              className="w-full bg-brand-cyan hover:bg-brand-cyan/90 text-[#0b0f19] rounded-xl text-xs h-11 uppercase tracking-wider font-heading font-extrabold"
            >
              Comenzar a Importar
            </Button>
          </div>
        </div>
      )}

      {/* MODAL INICIO SESION EXITOSO POPUP */}
      {showLoginSuccess && (
        <div className="fixed inset-0 bg-[#0b0f19]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1320] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative space-y-5 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-12 w-12 bg-brand-cyan/10 text-brand-cyan rounded-full flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-brand-cyan" />
              </div>
              <h3 className="font-heading font-extrabold text-white text-base tracking-tight">
                ¡Sesión Iniciada Exitosamente!
              </h3>
              <p className="text-xs text-slate-400">
                Hola, <strong className="text-white">{firstName}</strong>. Bienvenido de nuevo a tu Command Center de BreezeGo.
              </p>
            </div>

            <Button
              onClick={() => setShowLoginSuccess(false)}
              className="w-full bg-brand-cyan hover:bg-brand-cyan/90 text-[#0b0f19] rounded-xl text-xs h-10 uppercase tracking-wider font-heading font-extrabold"
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
