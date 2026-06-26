"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import "./tracker.css";

interface TrackerData {
  code: string;
  status: string;
  statusClass: string;
  icon: string;
  pulseColor: string;
  progressWidth: number;
  activeStepIndex: number;
  eta: string;
  statusText: string;
  coordinates: { lat: number; lon: number; speed: number; cx: number; cy: number; offset: number };
  driver: {
    name: string;
    plate: string;
    rating: string;
    avatar: string;
    initialMsg: string;
  } | null;
  info: {
    desc: string;
    sender: string;
    weight: string;
    taxCat: string;
    suite: string;
    address: string;
  };
  milestones: Array<{
    title: string;
    time: string;
    desc: string;
    state: string;
  }>;
}

const trackerDB: Record<string, TrackerData> = {
  "BZ-506-SJO": {
    code: "BZ-506-SJO",
    status: "En Reparto Local",
    statusClass: "in-transit",
    icon: "🚚",
    pulseColor: "#3b82f6",
    progressWidth: 75,
    activeStepIndex: 3,
    eta: "Hoy, antes de 4:30 PM",
    statusText: "Tu paquete fue nacionalizado y se encuentra en ruta en la unidad #14.",
    coordinates: { lat: 9.9352, lon: -84.0722, speed: 45, cx: 280, cy: 120, offset: 350 },
    driver: {
      name: "Eduardo Rodríguez",
      plate: "Camioneta #14 • PL-5062",
      rating: "⭐ 4.95 Calificación",
      avatar: "ER",
      initialMsg:
        "¡Hola! Llevo tu paquete BZ-506-SJO. Estoy en la zona de San Pedro, estimo llegar a tu ubicación en unos 20 minutos. ¿Habrá alguien disponible para firmar la entrega?",
    },
    info: {
      desc: "Audífonos Inalámbricos Pro + Estuche de Silicona",
      sender: "Amazon LLC (Miami Hub)",
      weight: "2.4 Libras (1.1 Kg)",
      taxCat: "Tecnología y Audio (13.00% IVA)",
      suite: "BZ-5062-MIA (Miami Suite)",
      address: "Montes de Oca, San Pedro, San José (GAM)",
    },
    milestones: [
      {
        title: "Recibido en Centro Miami, FL",
        time: "24 May, 10:12 AM",
        desc: "Ingreso registrado correctamente en báscula electrónica. Embalaje óptimo.",
        state: "completed",
      },
      {
        title: "Tránsito Aéreo Internacional",
        time: "25 May, 04:30 PM",
        desc: "Despacho en vuelo de carga consolidado BZ-730 directo a San José (SJO).",
        state: "completed",
      },
      {
        title: "Proceso de Aduanas Costa Rica",
        time: "Hoy, 08:30 AM",
        desc: "Precalificación autorizada por sistema digital TICA del Ministerio de Hacienda. Impuestos liquidados.",
        state: "completed",
      },
      {
        title: "En reparto local",
        time: "Hoy, 10:15 AM",
        desc: "Asignado a ruta de entrega GAM en camioneta de reparto.",
        state: "active",
      },
      {
        title: "Entregado con éxito",
        time: "Estimado Hoy",
        desc: "Entrega final y firma en domicilio.",
        state: "upcoming",
      },
    ],
  },
  "BZ-MIA-9081": {
    code: "BZ-MIA-9081",
    status: "Listo en Miami",
    statusClass: "miami",
    icon: "📦",
    pulseColor: "#a78bfa",
    progressWidth: 25,
    activeStepIndex: 1,
    eta: "Jueves, 28 de Mayo",
    statusText:
      "Su envío se encuentra consolidado en el contenedor de exportación Miami. Vuelo de carga programado.",
    coordinates: { lat: 25.7617, lon: -80.1918, speed: 0, cx: 50, cy: 160, offset: 900 },
    driver: null,
    info: {
      desc: "Zapatillas de Correr Nike Flyknit + Camisetas",
      sender: "Nike Store Online",
      weight: "4.1 Libras (1.8 Kg)",
      taxCat: "Moda y Calzado (29.95% IVA)",
      suite: "BZ-9081-MIA (Miami Suite)",
      address: "Avenida Central, Heredia Centro",
    },
    milestones: [
      {
        title: "Recibido en Centro Miami, FL",
        time: "Ayer, 08:30 AM",
        desc: "Ingreso registrado correctamente en almacén fiscal en Miami, Florida.",
        state: "active",
      },
      {
        title: "Tránsito Aéreo Internacional",
        time: "Pendiente",
        desc: "Esperando abordaje en el vuelo programado de carga consolidada.",
        state: "upcoming",
      },
      {
        title: "Proceso de Aduanas Costa Rica",
        time: "Pendiente",
        desc: "Liquidación de póliza y aforo físico local.",
        state: "upcoming",
      },
      {
        title: "En reparto local",
        time: "Pendiente",
        desc: "Asignación a mensajero de zona.",
        state: "upcoming",
      },
      {
        title: "Entregado con éxito",
        time: "Pendiente",
        desc: "Confirmación de recibido.",
        state: "upcoming",
      },
    ],
  },
  "BZ-CR-9999": {
    code: "BZ-CR-9999",
    status: "Entregado con Éxito",
    statusClass: "delivered",
    icon: "🎉",
    pulseColor: "#10b981",
    progressWidth: 100,
    activeStepIndex: 4,
    eta: "Entregado el 23 de Mayo",
    statusText: "El paquete fue nacionalizado y entregado con éxito a su destinatario.",
    coordinates: { lat: 9.9333, lon: -84.0833, speed: 0, cx: 350, cy: 140, offset: 0 },
    driver: {
      name: "Eduardo Rodríguez",
      plate: "Camioneta #14 • PL-5062",
      rating: "⭐ 4.95 Calificación",
      avatar: "ER",
      initialMsg: "Hola, tu entrega fue completada con éxito el día 23 de mayo. ¡Gracias por confiar en BreezeGo!",
    },
    info: {
      desc: "Libros Técnicos de Ingeniería Mecánica Aplicada",
      sender: "Book Depository UK",
      weight: "1.8 Libras (0.8 Kg)",
      taxCat: "Libros y Material Educativo (1.00% IVA)",
      suite: "BZ-9999-MIA (Miami Suite)",
      address: "Montes de Oca, San Pedro, San José (GAM)",
    },
    milestones: [
      {
        title: "Recibido en Centro Miami, FL",
        time: "21 May, 09:12 AM",
        desc: "Procesado e ingresado en Miami con éxito.",
        state: "completed",
      },
      {
        title: "Tránsito Aéreo Internacional",
        time: "21 May, 05:22 PM",
        desc: "Transportado y arribado en terminal de carga de Costa Rica.",
        state: "completed",
      },
      {
        title: "Proceso de Aduanas Costa Rica",
        time: "22 May, 03:00 PM",
        desc: "Liberación de aduanas completada mediante aforo simplificado.",
        state: "completed",
      },
      {
        title: "En reparto local",
        time: "23 May, 08:15 AM",
        desc: "En ruta en camioneta de distribución.",
        state: "completed",
      },
      {
        title: "Entregado con éxito",
        time: "23 May, 02:40 PM",
        desc: "Entregado en Montes de Oca. Firmado por el titular.",
        state: "completed",
      },
    ],
  },
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Code state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [currentCode, setCurrentCode] = useState("BZ-506-SJO");

  // Read search parameters hydration-safely on client mount
  useEffect(() => {
    const code = searchParams.get("code") || searchParams.get("tracking") || "BZ-506-SJO";
    setInputCode(code);
    setCurrentCode(code);
  }, [searchParams]);

  // Transitions
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [liveTrackingData, setLiveTrackingData] = useState<TrackerData | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(true);

  // Consultar el endpoint de tracking de Supabase
  useEffect(() => {
    async function loadTracking() {
      setLoadingTracking(true);
      try {
        const res = await fetch(`/api/tracking?code=${encodeURIComponent(currentCode)}`);
        const data = await res.json();
        
        if (res.ok && data.success && data.tracking) {
          setLiveTrackingData(data.tracking);
        } else {
          // Fallback a los datos de prueba de trackerDB si no se encuentra en Supabase
          const cleaned = currentCode.trim().toUpperCase();
          if (trackerDB[cleaned]) {
            setLiveTrackingData(trackerDB[cleaned]);
          } else {
            // Simulación por defecto para cualquier otro código
            setLiveTrackingData({
              code: cleaned,
              status: "En Tránsito Aéreo",
              statusClass: "in-transit",
              icon: "✈️",
              pulseColor: "#38bdf8",
              progressWidth: 50,
              activeStepIndex: 2,
              eta: "Mañana, 05:00 PM",
              statusText: `Simulando rastreo para envío internacional registrado: ${cleaned}. Vuelo en curso.`,
              coordinates: { lat: 14.5422, lon: -82.4411, speed: 650, cx: 158, cy: 100, offset: 600 },
              driver: null,
              info: {
                desc: "Envío Consolidado Especial (FOB $210.00)",
                sender: "Warehouse Global Hub",
                weight: "5.2 Libras (2.3 Kgs)",
                taxCat: "Consumo General (29.95% IVA)",
                suite: "BZ-CUSTOM-MIA (Miami Suite)",
                address: "San José Centro, Costa Rica",
              },
              milestones: [
                {
                  title: "Recibido en Miami, FL",
                  time: "Ayer, 02:14 PM",
                  desc: "Recibido e ingresado en el casillero principal.",
                  state: "completed",
                },
                {
                  title: "Tránsito Aéreo Internacional",
                  time: "Hoy, 09:00 AM",
                  desc: "Abordado y volando en tránsito internacional.",
                  state: "active",
                },
                {
                  title: "Proceso de Aduanas Costa Rica",
                  time: "Pendiente",
                  desc: "Ingreso aduanero y aforo de aranceles.",
                  state: "upcoming",
                },
                {
                  title: "En reparto local",
                  time: "Pendiente",
                  desc: "Tránsito local de distribución.",
                  state: "upcoming",
                },
                {
                  title: "Entregado con éxito",
                  time: "Pendiente",
                  desc: "Confirmación final.",
                  state: "upcoming",
                },
              ],
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar tracking desde API:", err);
      } finally {
        setLoadingTracking(false);
      }
    }
    loadTracking();
  }, [currentCode]);

  // Obtener datos activos
  const trackingData = useMemo(() => {
    if (liveTrackingData) return liveTrackingData;
    return {
      code: currentCode,
      status: "Cargando...",
      statusClass: "miami",
      icon: "⌛",
      pulseColor: "#94a3b8",
      progressWidth: 5,
      activeStepIndex: 0,
      eta: "Calculando...",
      statusText: "Conectando con el satélite de BreezeGo...",
      coordinates: { lat: 9.9352, lon: -84.0722, speed: 0, cx: 50, cy: 160, offset: 900 },
      driver: null,
      info: {
        desc: "Cargando detalles...",
        sender: "BreezeGo Hub",
        weight: "Calculando...",
        taxCat: "Calculando...",
        suite: "Cargando...",
        address: "Cargando..."
      },
      milestones: []
    };
  }, [liveTrackingData, currentCode]);

  // Coordinates satellite simulation
  const [gps, setGps] = useState({ lat: 9.9352, lon: -84.0722, speed: 45 });

  useEffect(() => {
    // Reset or load initial coords
    setGps({
      lat: trackingData.coordinates.lat,
      lon: trackingData.coordinates.lon,
      speed: trackingData.coordinates.speed,
    });

    if (trackingData.coordinates.speed === 0) return;

    const interval = setInterval(() => {
      setGps((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.0003,
        lon: prev.lon + (Math.random() - 0.5) * 0.0003,
        speed: Math.round(trackingData.coordinates.speed + (Math.random() - 0.5) * 6),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [trackingData]);

  // Chat simulator
  const [chatActive, setChatActive] = useState(false);
  const [chatInputText, setChatInputText] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "driver"; text: string; time: string }>>([]);

  // Load driver initial msg
  useEffect(() => {
    if (trackingData.driver) {
      setMessages([
        {
          sender: "driver",
          text: trackingData.driver.initialMsg,
          time: "Hace unos instantes",
        },
      ]);
    } else {
      setMessages([]);
    }
  }, [trackingData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentCode(inputCode.trim());
        router.push(`/tracking?code=${encodeURIComponent(inputCode.trim().toUpperCase())}`);
        setIsTransitioning(false);
      }, 250);
    }
  };

  const handleTagClick = (code: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setInputCode(code);
      setCurrentCode(code);
      router.push(`/tracking?code=${encodeURIComponent(code)}`);
      setIsTransitioning(false);
    }, 250);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    const userText = chatInputText.trim();
    const userMsgTime = `Hoy, ${new Date().toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    setMessages((prev) => [...prev, { sender: "user", text: userText, time: userMsgTime }]);
    setChatInputText("");

    // Scroll chat logic handled reactively by css/layout or browser
    setTimeout(() => {
      const driverTime = `Hoy, ${new Date().toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      setMessages((prev) => [
        ...prev,
        {
          sender: "driver",
          text: "👍 ¡Excelente, enterado! Estaré por ahí en unos minutos. Gracias por avisarme.",
          time: driverTime,
        },
      ]);
    }, 1200);
  };

  // Helper CTAs
  const [shareBtnText, setShareBtnText] = useState("🔗 Compartir Código");
  const handleShareBtn = () => {
    const textToCopy = `${window.location.origin}${window.location.pathname}?code=${currentCode.toUpperCase()}`;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setShareBtnText("✓ ¡Copiado al Portapapeles!");
        setTimeout(() => {
          setShareBtnText("🔗 Compartir Código");
        }, 2000);
      })
      .catch(() => {
        alert(`Código de rastreo: ${currentCode}`);
      });
  };

  const handleInvoiceBtn = () => {
    alert(
      "Descargando manifiesto fiscal consolidado de aduanas...\nLiquidación de impuestos autorizada por Ministerio de Hacienda CR."
    );
  };

  // Step active texts helper
  const progressActiveStepLabel = useMemo(() => {
    if (trackingData.status === "Listo en Miami") return "En Miami";
    if (trackingData.status === "Entregado con Éxito") return "Entregado";
    if (trackingData.status === "En Reparto Local") return "Reparto";
    return "Tránsito";
  }, [trackingData.status]);

  return (
    <div className="tracker-page-root">
      {/* Top Navbar */}
      <header className="navbar" id="main-header">
        <div className="container navbar-container">
          <Link href="/" className="logo">
            <img src="/logo.png" alt="BreezeGo Logo" className="brand-logo-img" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-menu-desktop">
            <ul className="nav-list">
              <li><Link href="/#how-it-works" className="nav-link">Cómo Funciona</Link></li>
              <li><Link href="/#benefits" className="nav-link">Beneficios</Link></li>
              <li><Link href="/tracking" className="nav-link active">Rastreo</Link></li>
              <li><Link href="/calculator" className="nav-link">Calculadora</Link></li>
              <li><Link href="/#faq" className="nav-link">Preguntas</Link></li>
            </ul>
            <div className="nav-actions">
              {user ? (
                <Link href="/dashboard" className="btn btn-ghost">Mi Panel</Link>
              ) : (
                <Link href="/login" className="btn btn-ghost">Ingresar</Link>
              )}
              {user ? (
                <Link href="/dashboard" className="btn-nav-primary">Dashboard</Link>
              ) : (
                <Link href="/signup" className="btn-nav-primary">Crear Casillero</Link>
              )}
            </div>
          </nav>

          {/* Mobile Actions and Hamburger Menu */}
          <div className="md:hidden flex items-center">
            {user ? (
              <Link 
                href="/dashboard" 
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#0b0f19",
                  border: "1px solid #46C7D2",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "#46C7D2",
                  textDecoration: "none",
                  marginRight: "8px"
                }}
              >
                Mi Panel
              </Link>
            ) : (
              <Link 
                href="/login" 
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#0b0f19",
                  border: "1px solid #46C7D2",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "#46C7D2",
                  textDecoration: "none",
                  marginRight: "8px"
                }}
              >
                Ingresar
              </Link>
            )}
            <button 
              type="button"
              className="menu-toggle" 
              id="menu-toggle-btn" 
              aria-label="Abrir Menú"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="6" x2="20" y2="6"></line>
                  <line x1="4" y1="18" x2="20" y2="18"></line>
                </svg>
              )}
            </button>
          </div>

          {/* Slide-out Menu Overlay Drawer (visible only when mobileMenuOpen is true) */}
          <nav className={`nav-menu-mobile-drawer ${mobileMenuOpen ? 'active' : ''}`}>
            <div className="drawer-header">
              <span className="drawer-title">BreezeGo</span>
              <button 
                type="button" 
                className="drawer-close-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <ul className="drawer-list">
              <li><Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)}>Cómo Funciona</Link></li>
              <li><Link href="/#benefits" onClick={() => setMobileMenuOpen(false)}>Beneficios</Link></li>
              <li><Link href="/tracking" className="active" onClick={() => setMobileMenuOpen(false)}>Rastreo Satelital</Link></li>
              <li><Link href="/calculator" onClick={() => setMobileMenuOpen(false)}>Calculadora de Tarifas</Link></li>
              <li><Link href="/#faq" onClick={() => setMobileMenuOpen(false)}>Preguntas Frecuentes</Link></li>

            </ul>
            <div className="drawer-actions">
              {user ? (
                <Link href="/dashboard" className="btn btn-primary btn-block" onClick={() => setMobileMenuOpen(false)}>Ir a Mi Panel</Link>
              ) : (
                <>
                  <Link href="/login" className="btn btn-ghost btn-block" onClick={() => setMobileMenuOpen(false)}>Ingresar</Link>
                  <Link href="/signup" className="btn btn-primary btn-block" onClick={() => setMobileMenuOpen(false)}>Crear Casillero</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="tracker-main" style={{ paddingTop: "250px" }}>
        <div className="container mobile-container">
          {/* Large Floating Search Bar */}
          <section className="tracker-search-section">
            <form onSubmit={handleSearchSubmit} className="search-box-wrapper">
              <div className="search-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                type="text"
                id="main-tracker-input"
                placeholder="Buscar otro código (ej: BZ-506-SJO)..."
                autoComplete="off"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" id="main-tracker-btn">
                Buscar
              </button>
            </form>
            <div className="quick-suggest-tags">
              <span>Probar:</span>
              <button
                type="button"
                className={`tag-btn ${currentCode.toUpperCase() === "BZ-506-SJO" ? "active" : ""}`}
                onClick={() => handleTagClick("BZ-506-SJO")}
              >
                BZ-506-SJO (Reparto)
              </button>
              <button
                type="button"
                className={`tag-btn ${currentCode.toUpperCase() === "BZ-MIA-9081" ? "active" : ""}`}
                onClick={() => handleTagClick("BZ-MIA-9081")}
              >
                BZ-MIA-9081 (Miami)
              </button>
              <button
                type="button"
                className={`tag-btn ${currentCode.toUpperCase() === "BZ-CR-9999" ? "active" : ""}`}
                onClick={() => handleTagClick("BZ-CR-9999")}
              >
                BZ-CR-9999 (Entregado)
              </button>
            </div>
          </section>

          {/* Main Tracking Display Console */}
          <div
            className="tracking-console-layout"
            id="console-display"
            style={{ opacity: isTransitioning ? 0.3 : 1, transition: "opacity 0.25s ease" }}
          >
            {/* UBER EATS STYLE DELIVERY CARD (Instant Clarity) */}
            <section className="delivery-status-card">
              <div className="card-glow"></div>
              <div className="delivery-header">
                <div className="status-indicator">
                  <span
                    className="status-pulse-dot"
                    id="pulse-dot"
                    style={{
                      background: trackingData.pulseColor,
                      boxShadow: `0 0 10px ${trackingData.pulseColor}`,
                    }}
                  ></span>
                  <span className="status-label" id="status-title">
                    {trackingData.status}
                  </span>
                </div>
                <div className="icon-avatar" id="status-icon-box">
                  {trackingData.icon}
                </div>
              </div>

              <div className="delivery-eta-block">
                <span className="eta-label">LLEGADA ESTIMADA</span>
                <h2 className="eta-time" id="delivery-eta-time">
                  {trackingData.eta}
                </h2>
                <p className="eta-subtext" id="delivery-status-text">
                  {trackingData.statusText}
                </p>
              </div>

              {/* Real-time Shipment Progress Bar (Uber Eats Style) */}
              <div className="uber-progress-wrapper">
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    id="uber-progress-fill"
                    style={{
                      width: `${trackingData.progressWidth}%`,
                      background: `linear-gradient(90deg, #46C7D2 0%, ${trackingData.pulseColor} 100%)`,
                      boxShadow: `0 0 12px ${trackingData.pulseColor}`,
                    }}
                  ></div>
                </div>
                <div className="progress-steps-labels">
                  <span className={`step-lbl ${trackingData.activeStepIndex >= 1 ? "active" : ""} ${trackingData.activeStepIndex === 1 ? "current" : ""}`}>
                    Miami
                  </span>
                  <span className={`step-lbl ${trackingData.activeStepIndex >= 2 ? "active" : ""} ${trackingData.activeStepIndex === 2 ? "current" : ""}`}>
                    Tránsito
                  </span>
                  <span className={`step-lbl ${trackingData.activeStepIndex >= 3 ? "active" : ""} ${trackingData.activeStepIndex === 3 ? "current" : ""}`}>
                    Aduana
                  </span>
                  <span className={`step-lbl active current`} id="step-active-lbl">
                    {progressActiveStepLabel}
                  </span>
                </div>
              </div>
            </section>

            {/* DYNAMIC VECTOR ROUTE MAP (Anxiety Reducer) */}
            <section className="live-map-card">
              <div className="map-card-header">
                <span className="map-title-text">📍 Visualización Geográfica de Ruta</span>
                <span className="live-blink">SIMULACIÓN EN VIVO</span>
              </div>
              <div className="map-container">
                <div className="map-overlay-grid"></div>

                {/* Premium SVG Vector Map Representation */}
                <svg className="map-vector-canvas" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Dashed Path connecting points */}
                  <path
                    className="route-line"
                    d="M 50,160 Q 150,60 250,110 T 350,140"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="3"
                  />
                  {/* Active colored transit line */}
                  <path
                    className="route-line-active"
                    id="map-active-path"
                    d="M 50,160 Q 150,60 250,110 T 350,140"
                    fill="none"
                    stroke="url(#active-gradient)"
                    strokeWidth="4"
                    strokeDasharray="1000"
                    strokeDashoffset={trackingData.coordinates.offset}
                    filter="url(#glow)"
                  />

                  {/* Gradients */}
                  <linearGradient id="active-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1D2A3E" />
                    <stop offset="100%" stopColor={trackingData.pulseColor} />
                  </linearGradient>

                  {/* Hub 1: Miami */}
                  <circle cx="50" cy="160" r="6" fill="#5850ec" />
                  <circle className="pulse-ring" cx="50" cy="160" r="12" fill="none" stroke="#5850ec" strokeWidth="1.5" />
                  <text x="35" y="182" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    MIAMI (MIA)
                  </text>

                  {/* Hub 2: Cargo Flight */}
                  <g className="animated-plane" id="map-plane-group">
                    <circle cx="158" cy="100" r="5" fill="#38bdf8" />
                    <text x="140" y="88" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                      Vuelo BZ-730
                    </text>
                  </g>

                  {/* Hub 3: Customs CR */}
                  <circle cx="250" cy="110" r="6" fill="#06b6d4" />
                  <text x="228" y="96" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    ADUANA (SJO)
                  </text>

                  {/* Hub 4: Delivery Destination */}
                  <circle cx="350" cy="140" r="6" fill="#10b981" />
                  <circle
                    className="pulse-ring green"
                    cx="350"
                    cy="140"
                    r="12"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                  />
                  <text x="315" y="160" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    ENTREGA (C.R.)
                  </text>

                  {/* Animated Moving Pulse representing package */}
                  <circle
                    className="package-moving-dot"
                    id="map-package-dot"
                    cx={trackingData.coordinates.cx}
                    cy={trackingData.coordinates.cy}
                    r="7"
                    fill={trackingData.pulseColor}
                    filter="url(#glow)"
                  />
                </svg>

                <div className="map-coordinates-bar">
                  <span id="coord-lat">Lat: {gps.lat.toFixed(4)}° N</span>
                  <span id="coord-lon">Lon: {gps.lon.toFixed(4)}° W</span>
                  <span id="coord-speed">Vel: {gps.speed} km/h</span>
                </div>
              </div>
            </section>

            {/* COURIER PROFILE DETAILS (Uber Eats style) */}
            {trackingData.driver && (
              <section className="courier-driver-card" id="courier-card-container">
                <div className="driver-avatar-wrapper">
                  <div className="driver-avatar" id="driver-avatar-img">
                    {trackingData.driver.avatar}
                  </div>
                  <div className="driver-badge">👤</div>
                </div>
                <div className="driver-info">
                  <span className="info-label">TU REPARTIDOR BREEZEGO</span>
                  <h3 className="driver-name" id="driver-name-text">
                    {trackingData.driver.name}
                  </h3>
                  <div className="driver-stats">
                    <span className="rating">{trackingData.driver.rating}</span>
                    <span className="vehicle" id="driver-plate-text">
                      {trackingData.driver.plate}
                    </span>
                  </div>
                </div>
                <div className="driver-actions">
                  <a href="tel:+50660696039" className="action-btn call" aria-label="Llamar repartidor">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </a>
                  <button
                    type="button"
                    className={`action-btn chat ${chatActive ? "active" : ""}`}
                    onClick={() => setChatActive(!chatActive)}
                    id="chat-driver-btn"
                    aria-label="Enviar mensaje"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>
              </section>
            )}

            {/* PACKAGE DETAILED INFORMATION (Amazon Style) */}
            <section className="package-details-card">
              <h3 className="card-title">Información del Paquete</h3>
              <div className="details-grid-list">
                <div className="details-item">
                  <span className="lbl">Descripción</span>
                  <span className="val" id="info-desc">
                    {trackingData.info.desc}
                  </span>
                </div>
                <div className="details-item">
                  <span className="lbl">Remitente</span>
                  <span className="val" id="info-sender">
                    {trackingData.info.sender}
                  </span>
                </div>
                <div className="details-item">
                  <span className="lbl">Peso Registrado</span>
                  <span className="val" id="info-weight">
                    {trackingData.info.weight}
                  </span>
                </div>
                <div className="details-item">
                  <span className="lbl">Categoría Fiscal</span>
                  <span className="val" id="info-tax-cat">
                    {trackingData.info.taxCat}
                  </span>
                </div>
                <div className="details-item">
                  <span className="lbl">Dirección de Suite</span>
                  <span className="val" id="info-suite">
                    {trackingData.info.suite}
                  </span>
                </div>
                <div className="details-item">
                  <span className="lbl">Dirección de Entrega</span>
                  <span className="val" id="info-address">
                    {trackingData.info.address}
                  </span>
                </div>
              </div>
            </section>

            {/* AMAZON-STYLE SHIPPING MILESTONES (Anxiety Reducer) */}
            <section className="shipping-milestones-card">
              <h3 className="card-title">Cronología de Envío</h3>
              <p className="card-subtitle">Desglose secuencial de hitos logísticos validados.</p>

              <div className="milestones-vertical-list" id="vertical-milestones-list">
                {trackingData.milestones.map((m: { title: string; time: string; desc: string; state: string }, idx: number) => {
                  let iconSymbol = "○";
                  if (m.state === "completed") iconSymbol = "✓";
                  if (m.state === "active") iconSymbol = "●";

                  return (
                    <div key={idx} className={`milestone-step ${m.state}`}>
                      <div className={`milestone-status-icon ${m.state === "active" ? "pulse" : ""}`}>
                        {iconSymbol}
                      </div>
                      <div className="milestone-info">
                        <h4 className="m-title">{m.title}</h4>
                        <span className="m-time">{m.time}</span>
                        <p className="m-desc">{m.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ACTIONABLE CTAs BAR */}
            <section className="quick-action-cta-bar">
              <button type="button" className="btn btn-secondary flex-1" onClick={handleShareBtn}>
                {shareBtnText}
              </button>
              <button type="button" className="btn btn-secondary flex-1" onClick={handleInvoiceBtn}>
                📄 Ver Factura Aduana
              </button>
            </section>
          </div>

          {/* Dynamic Simulated Chat Window Box (Uber Eats style interactive pop) */}
          {trackingData.driver && (
            <div className={`chat-sim-box ${chatActive ? "active" : ""}`} id="driver-chat-box">
              <div className="chat-header">
                <div className="chat-driver-avatar">{trackingData.driver.avatar}</div>
                <div className="chat-driver-meta">
                  <h4>{trackingData.driver.name} (BreezeGo)</h4>
                  <span>En línea • {trackingData.driver.plate.split(" • ")[0]}</span>
                </div>
                <button type="button" className="chat-close" onClick={() => setChatActive(false)}>
                  &times;
                </button>
              </div>
              <div className="chat-messages" id="chat-messages-container">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.sender}`}>
                    <p>{msg.text}</p>
                    <span className="m-time">{msg.time}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChatMessage} className="chat-input-wrapper">
                <input
                  type="text"
                  id="chat-user-input"
                  placeholder={`Escribe tu mensaje a ${trackingData.driver.name.split(" ")[0]}...`}
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                />
                <button type="submit" className="chat-send-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="tracker-footer">
        <div className="container footer-content text-center">
          <p>&copy; 2026 BreezeGo Costa Rica. Envíos Internacionales Simplificados.</p>
          <div className="support-contact">
            <a href="https://wa.me/50660696039" target="_blank" rel="noopener noreferrer" style={{ color: "#46C7D2", textDecoration: "none", fontWeight: 600 }}>WhatsApp Soporte</a> •{" "}
            <Link href="/terms.html" style={{ color: "#46C7D2", fontWeight: 600, marginLeft: 8 }}>
              Términos de Servicio
            </Link> •{" "}
            <Link href="/privacy.html" style={{ color: "#46C7D2", fontWeight: 600, marginLeft: 8 }}>
              Política de Privacidad
            </Link> •{" "}
            <Link href="/cookies.html" style={{ color: "#46C7D2", fontWeight: 600, marginLeft: 8 }}>
              Política de Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="tracker-page-root"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
        >
          <div className="text-center" style={{ color: "var(--text-white)" }}>
            <span className="badge-tag">Cargando...</span>
            <p>Conectando con el satélite logístico de BreezeGo...</p>
          </div>
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
