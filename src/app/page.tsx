"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { mockDb } from "@/lib/supabase";
import "./landing.css";

// -------------------------------------------------------------
// Real-Time Tracking Database
// -------------------------------------------------------------
const trackingMockDB = {
  'BZ-506-SJO': {
    recipient: 'Carlos Alvarado M.',
    description: 'Audífonos Inalámbricos Pro + Estuche (FOB $124.00)',
    weight: '1.1 Kg',
    statusText: 'En Tránsito Aéreo',
    statusClass: 'in-transit',
    progress: 50,
    milestones: [true, true, false, false], // [Miami, Vuelo, Aduana, Reparto]
    currentStep: 2,
    history: [
      { time: 'Hoy, 09:14 AM', title: 'En tránsito aéreo hacia SJO', text: 'Vuelo de carga BZ-730, estimado arribar hoy 04:30 PM.' },
      { time: 'Ayer, 04:30 PM', title: 'Procesado y preparado para despacho', text: 'Almacén principal Miami, FL. Manifiesto de vuelo cerrado.' },
      { time: '24 May, 10:12 AM', title: 'Recibido en Casillero Miami', text: 'Ingreso registrado en báscula con peso de 1.1 Kg. Inspección visual OK.' }
    ]
  },
  'BZ-MIA-9081': {
    recipient: 'Viviana Castro R.',
    description: 'Paquete de Ropa Deportiva Nike & Sephora (FOB $92.50)',
    weight: '1.9 Kg',
    statusText: 'Listo en Miami',
    statusClass: 'miami',
    progress: 25,
    milestones: [true, false, false, false],
    currentStep: 1,
    history: [
      { time: 'Hoy, 08:30 AM', title: 'Recibido y Pesado en Miami', text: 'Bodega de Miami, FL. Esperando vuelo programado de mañana martes.' },
      { time: 'Ayer, 01:15 PM', title: 'Prealerta de Casillero Registrada', text: 'El usuario subió la factura de Amazon. Listo para precalificación fiscal.' }
    ]
  },
  'BZ-CR-9999': {
    recipient: 'Mario Segura G.',
    description: 'Libros Técnicos de Ingeniería (FOB $45.00)',
    weight: '0.8 Kg',
    statusText: 'Entregado en Casa',
    statusClass: 'delivered',
    progress: 100,
    milestones: [true, true, true, true],
    currentStep: 4,
    history: [
      { time: '23 May, 02:40 PM', title: 'Paquete Entregado con Éxito', text: 'Entregado a destinatario en Montes de Oca, San José. Firmado por: Mario Segura.' },
      { time: '23 May, 08:15 AM', title: 'Salida a Reparto Local', text: 'En ruta en camioneta de distribución local BreezeGo (Zona GAM-1).' },
      { time: '22 May, 03:00 PM', title: 'Liberación de Aduanas Completada', text: 'Nacionalizado mediante sistema TICA del Ministerio de Hacienda. Impuestos liquidados.' },
      { time: '21 May, 05:22 PM', title: 'Arribo a Aeropuerto SJO', text: 'Paquete arribó en el vuelo de carga. Traslado a almacén fiscal.' }
    ]
  }
};

// Hacienda Tax percentages
const categoryTaxRates = {
  general: 0.2995,
  electronics: 0.13,
  clothing: 0.2995,
  shoes: 0.2995,
  cosmetics: 0.5455,
  carparts: 0.4927,
  books: 0.01
};

const usaAirNotes = [
  {
    title: "Ámbito de Aplicación",
    desc: "El tarifario y beneficios ofrecidos aplican para el servicio aéreo express de Miami a Costa Rica."
  },
  {
    title: "Entrega a Domicilio GAM",
    desc: "La entrega a domicilio se realiza dentro del Gran Área Metropolitana de Costa Rica. El cliente debe registrar su tarjeta de crédito/débito para la facturación automática. La entrega se realiza en la recepción o puerta principal."
  },
  {
    title: "Proceso y Boxpack",
    desc: "El boxpack es un cargo fijo de $1.99 por paquete. Cubre el proceso de recepción, registro, preparación y consolidación para el envío al país de destino."
  },
  {
    title: "Seguro de Paquetes",
    desc: "Todos los paquetes cuentan con seguro automático que protege ante robo, pérdida o daño total. No aplica para mercancía frágil (vidrio, cerámica, vajillas, etc.) o mal embalaje del remitente."
  },
  {
    title: "Trámites y Permisos Especiales",
    desc: "Todo paquete con valor declarado mayor a $100 tendrá un costo de manejo aduanal. Los paquetes que requieran permisos especiales (salud, agricultura, etc.) tendrán un costo adicional de trámite."
  },
  {
    title: "Dimensiones Extra Grandes",
    desc: "Paquetes cuyas dimensiones superen 40 pulgadas en cualquiera de sus lados tendrán un recargo por sobredimensión de $25 USD."
  },
  {
    title: "Factura de Compra",
    desc: "Para evitar demoras en aduanas y multas, el cliente debe prealertar sus paquetes cargando la factura de compra correspondiente en formato PDF o imagen."
  }
];

const usaSeaNotes = [
  {
    title: "Ámbito de Aplicación",
    desc: "El tarifario y beneficios ofrecidos aplican para el servicio marítimo de Miami a Costa Rica."
  },
  {
    title: "Tarifa por Pie Cúbico (CFT)",
    desc: "Se cobra según el volumen ocupado en pies cúbicos. La fórmula de cálculo es: (Largo × Ancho × Alto en pulgadas) / 1728. Tarifa de Lanzamiento: $27 USD/CFT. Tarifa Regular: $29 USD/CFT."
  },
  {
    title: "Salidas y Tránsito",
    desc: "Las salidas marítimas se realizan los días 15 y 30 de cada mes. El tiempo estimado de tránsito es de 22 días hábiles a partir de la fecha de salida del barco."
  },
  {
    title: "Entrega a Domicilio GAM",
    desc: "La entrega de carga marítima consolidada se realiza en el Gran Área Metropolitana. Carga sobredimensionada o pesada podría requerir transporte especial cotizado por separado."
  },
  {
    title: "Seguro de Carga",
    desc: "Todos los paquetes cuentan con un seguro básico contra pérdida o daño total. Mercancía frágil sin embalaje industrial de madera no está cubierta."
  }
];

const colombiaAirNotes = [
  {
    title: "Ámbito de Aplicación",
    desc: "El tarifario y beneficios ofrecidos aplican para el servicio aéreo express de Colombia (Bello, Antioquia) a Costa Rica."
  },
  {
    title: "Frecuencia de Vuelos",
    desc: "Contamos con vuelos frecuentes directos desde nuestra bodega en Colombia, con un tiempo estimado de tránsito de 3 a 6 días hábiles."
  },
  {
    title: "Tarifas por Kilo",
    desc: "Se calcula por peso real exacto. Tarifa de Lanzamiento: ₡6.500 por Kg. Tarifa Regular: ₡7.500 por Kg. Sin mínimos de peso para facturación (calculado desde 1 gramo)."
  },
  {
    title: "Entrega a Domicilio GAM",
    desc: "La entrega se realiza en todo el GAM. Para entregas rurales o fuera del GAM se realiza el despacho a través de transportistas locales a tarifa preferencial."
  },
  {
    title: "Prealerta y Factura",
    desc: "Es obligatorio subir la factura de compra para procesar los trámites de exportación en Colombia e importación en Costa Rica. Aduana se reserva el derecho de valorar mercancía sin factura."
  }
];


export default function Page() {
  const router = useRouter();
  const { user } = useAuth();

  // -------------------------------------------------------------
  // States
  // -------------------------------------------------------------
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isRegularTariff, setIsRegularTariff] = useState(false);
  const [dbSettings, setDbSettings] = useState<any>(null);
  const [ratesTab, setRatesTab] = useState<'usa' | 'colombia'>('usa');
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [openedModalId, setOpenedModalId] = useState<'air' | 'sea' | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await mockDb.settings.get();
        setDbSettings(s);
      } catch (e) {
        console.error("Error loading settings on landing page", e);
      }
    };
    loadSettings();
  }, []);

  // Quick Hero Tracker Input
  const [quickTrackCode, setQuickTrackCode] = useState('');

  // Interactive Simulator Tracker Input & Result
  const [panelSearchQuery, setPanelSearchQuery] = useState('');
  const [panelTrackCode, setPanelTrackCode] = useState('BZ-506-SJO');
  const [searchResult, setSearchResult] = useState(trackingMockDB['BZ-506-SJO']);
  const [isSearching, setIsSearching] = useState(false);

  // Calculator Preview
  const [calcOrigin, setCalcOrigin] = useState('miami');
  const [calcTransportMode, setCalcTransportMode] = useState<'air' | 'sea'>('air');
  const [calcWeight, setCalcWeight] = useState<number | "">(2);
  const [calcUnit, setCalcUnit] = useState('kgs');
  const [calcDimUnit, setCalcDimUnit] = useState('in');
  const [calcLength, setCalcLength] = useState<number>(8);
  const [calcWidth, setCalcWidth] = useState<number>(6);
  const [calcHeight, setCalcHeight] = useState<number>(4);
  const [calcIsElectronicOver450, setCalcIsElectronicOver450] = useState<boolean>(false);
  const [calcValue, setCalcValue] = useState(100);
  const [calcDeliveryZone, setCalcDeliveryZone] = useState('gam');
  const [calcWantsInsurance, setCalcWantsInsurance] = useState<boolean>(true);

  // FAQ Accordion
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  // Numerical Counter Stats
  const [packagesCount, setPackagesCount] = useState(0);
  const [effectivenessCount, setEffectivenessCount] = useState(0);
  const [daysCount, setDaysCount] = useState(0);

  // Final CTA Email Form
  const [ctaEmail, setCtaEmail] = useState('');

  // -------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stats Animation on Mount
  useEffect(() => {
    let step = 0;
    const duration = 1500;
    const totalSteps = duration / 30;

    const timer = setInterval(() => {
      step++;
      setPackagesCount(Math.min(150, Math.round((150 / totalSteps) * step)));
      setEffectivenessCount(Math.min(99, Math.round((99 / totalSteps) * step)));
      setDaysCount(Math.min(3, Math.round((3 / totalSteps) * step)));

      if (step >= totalSteps) {
        clearInterval(timer);
      }
    }, 30);

    return () => clearInterval(timer);
  }, []);

  // -------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------
  const handleQuickTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTrackCode.trim()) {
      router.push(`/tracking?code=${encodeURIComponent(quickTrackCode.trim().toUpperCase())}`);
    }
  };

  const handlePanelSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = panelSearchQuery.trim().toUpperCase();
    if (!query) return;

    setIsSearching(true);

    setTimeout(() => {
      let data = trackingMockDB[query as keyof typeof trackingMockDB];

      if (!data) {
        if (query.length < 4) {
          alert('Por favor, ingrese un código de rastreo válido. Ej: BZ-506-SJO');
          setIsSearching(false);
          return;
        }

        data = {
          recipient: 'Cliente Especial BreezeGo',
          description: `Envío Internacional Registrado (${query})`,
          weight: '1.4 Kg',
          statusText: 'Validando en Sistema',
          statusClass: 'in-transit',
          progress: 75,
          milestones: [true, true, true, false],
          currentStep: 3,
          history: [
            { time: 'Hace unos momentos', title: 'Nacionalización e Inspección de Hacienda', text: 'En proceso de aforo físico en terminal de carga Costa Rica.' },
            { time: 'Ayer', title: 'Vuelo Arribado a San José', text: 'Desembarque completado en el Aeropuerto Juan Santamaría.' },
            { time: 'Hace 2 días', title: 'Despacho de Bodega Miami', text: 'Paquete vuela en ruta consolidada BreezeGo Courier.' }
          ]
        };
      }

      setPanelTrackCode(query);
      setSearchResult(data);
      setIsSearching(false);
    }, 350);
  };

  const handleSuggestionClick = (code: string, isHero: boolean) => {
    if (isHero) {
      router.push(`/tracking?code=${encodeURIComponent(code)}`);
    } else {
      setPanelSearchQuery(code);
      setIsSearching(true);
      setTimeout(() => {
        const data = trackingMockDB[code as keyof typeof trackingMockDB];
        setPanelTrackCode(code);
        setSearchResult(data);
        setIsSearching(false);
      }, 350);
    }
  };

  const handleFaqToggle = (index: number) => {
    setActiveFaqIndex(activeFaqIndex === index ? null : index);
  };

  // Helper function to format CRC colones with dot separators
  const formatCRC = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Derived Calculator math
  const exchangeRate = 500;
  const weightVal = calcWeight === "" ? 0.001 : Math.max(0.001, calcWeight);
  const weightInKgs = calcUnit === 'lbs' 
    ? weightVal / 2.20462 
    : calcUnit === 'g' 
      ? weightVal * 0.001 
      : weightVal;

  // Convert dimensions to Inches
  let calcLengthVal = calcLength || 1;
  let calcWidthVal = calcWidth || 1;
  let calcHeightVal = calcHeight || 1;
  if (calcDimUnit === "cm") {
    calcLengthVal = calcLengthVal / 2.54;
    calcWidthVal = calcWidthVal / 2.54;
    calcHeightVal = calcHeightVal / 2.54;
  }

  // Volumetric weight: (L * W * H) / 366 for Kg, or (L * W * H) / 5000 if cm
  const volumetricKgs = calcDimUnit === "cm"
    ? ((calcLength || 1) * (calcWidth || 1) * (calcHeight || 1)) / 5000
    : ((calcLength || 1) * (calcWidth || 1) * (calcHeight || 1)) / 366;

  // Chargeable Weight = max(actual, volumetric) in Kg
  const chargeableWeightKgs = Math.max(weightInKgs, volumetricKgs);

  // Base Freight computation
  let freightTotal = 0;

  if (calcTransportMode === "air") {
    if (calcOrigin === "colombia") {
      const ratePerKg = isRegularTariff ? 7500 : 6500;
      freightTotal = (weightInKgs * ratePerKg) / exchangeRate;
    } else if (calcOrigin === "miami") {
      const ratePerKg = isRegularTariff 
        ? (dbSettings ? dbSettings.miamiRegularRate : 7000) 
        : (dbSettings ? dbSettings.miamiLaunchRate : 6000);
      freightTotal = (chargeableWeightKgs * ratePerKg) / exchangeRate;
    } else if (calcOrigin === "europe") {
      const ratePerKgUsd = 13.22;
      const freightUsd = chargeableWeightKgs * ratePerKgUsd;
      const minFreightUsd = ratePerKgUsd * 2;
      freightTotal = Math.max(minFreightUsd, freightUsd);
    } else if (calcOrigin === "china") {
      const ratePerKgUsd = 19.84;
      const freightUsd = chargeableWeightKgs * ratePerKgUsd;
      const minFreightUsd = 25.00;
      freightTotal = Math.max(minFreightUsd, freightUsd);
    }
  } else {
    // Sea Mode
    if (calcOrigin === "miami") {
      // CFT = (L * W * H) / 1728
      const cubicFeet = (calcLengthVal * calcWidthVal * calcHeightVal) / 1728;
      const ratePerCftUsd = isRegularTariff ? 29 : 27;
      freightTotal = cubicFeet * ratePerCftUsd;
    } else if (calcOrigin === "europe") {
      const ratePerKgUsd = 2.5 * 2.20462;
      freightTotal = chargeableWeightKgs * ratePerKgUsd;
    } else if (calcOrigin === "china") {
      const ratePerKgUsd = 1.8 * 2.20462;
      freightTotal = chargeableWeightKgs * ratePerKgUsd;
    }
  }

  // Insurance Fee: 2% of FOB if active, 0 if inactive
  const insuranceTotal = calcWantsInsurance && calcValue > 0 ? Number((calcValue * 0.02).toFixed(2)) : 0.00;

  // CIF Value = declared value + flete + insurance
  const cifValue = calcValue + freightTotal + insuranceTotal;

  // Taxes: Fixed 13% IVA on service cost (freight + insurance)
  const taxRate = 0.13;
  let taxTotal = (freightTotal + insuranceTotal) * taxRate;

  // Handling is 0
  const handlingTotal = 0;

  // Local Delivery
  let deliveryTotalCRC = 0;
  const gamFee = dbSettings ? dbSettings.deliveryGamFee : 3500;
  const cartagoAlajuelaFee = dbSettings ? dbSettings.deliveryCartagoAlajuelaFee : 4500;
  const ruralFee = dbSettings ? dbSettings.deliveryRuralFee : 5000;

  if (calcDeliveryZone === 'sucursal') {
    deliveryTotalCRC = 0;
  } else if (calcDeliveryZone === 'gam') {
    deliveryTotalCRC = gamFee;
  } else if (calcDeliveryZone === 'cartago_alajuela') {
    deliveryTotalCRC = cartagoAlajuelaFee;
  } else if (calcDeliveryZone === 'outside_gam') {
    deliveryTotalCRC = ruralFee;
  }
  const deliveryTotal = deliveryTotalCRC / exchangeRate;

  const grandTotalUSD = freightTotal + insuranceTotal + taxTotal + deliveryTotal;
  const grandTotalCRC = grandTotalUSD * exchangeRate;

  return (
    <div className="landing-page-root">
      {/* Top Navbar */}
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`} id="main-header">
        <div className="container navbar-container">
          <Link href="/" className="logo" id="logo-link">
            <img src="/logo.png" alt="BreezeGo Logo" className="brand-logo-img" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-menu-desktop" id="nav-menu-container">
            <ul className="nav-list">
              <li><a href="#how-it-works" className="nav-link">Cómo Funciona</a></li>
              <li><a href="#benefits" className="nav-link">Beneficios</a></li>
              <li><Link href="/tracking" className="nav-link">Rastreo</Link></li>
              <li><Link href="/calculator" className="nav-link">Calculadora</Link></li>
              <li><a href="#faq" className="nav-link">Preguntas</a></li>
            </ul>
            <div className="nav-actions">
              <Link href="/login" className="btn btn-ghost">Ingresar</Link>
              <Link href="/signup" className="btn btn-primary">Crear Casillero</Link>
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
              <li><Link href="/tracking" onClick={() => setMobileMenuOpen(false)}>Rastreo Satelital</Link></li>
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

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="grid-background"></div>
          <div className="container hero-container">
            <div className="hero-content">
              <div className="badge-container animate-fade-in">
                <span className="hero-badge">📦 BreezeGo — Tus paquetes en movimiento.</span>
              </div>
              <h1 className="hero-title animate-slide-up">
                El envío internacional, <span className="gradient-text">redefinido</span> para Costa Rica.
              </h1>
              <p className="hero-description animate-slide-up-delayed">
                Compra en Estados Unidos o Colombia y recíbelo en la puerta de tu casa. Sin cargos sorpresa, con aduanas digitales y la velocidad de una plataforma de logística moderna.
              </p>
              
              {/* Quick Tracking Dashboard Launcher */}
              <div className="quick-tracker-container animate-slide-up-more">
                <form onSubmit={handleQuickTrackSubmit} className="tracker-input-wrapper">
                  <div className="tracker-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <input 
                    type="text" 
                    id="quick-tracking-input" 
                    placeholder="Número de rastreo BZ-..." 
                    autoComplete="off"
                    value={quickTrackCode}
                    onChange={(e) => setQuickTrackCode(e.target.value)}
                  />
                  <button type="submit" id="quick-tracking-btn" className="btn btn-primary">Rastrear Envío</button>
                </form>
                <div className="tracker-suggestions">
                  <span>Sugerencias:</span>
                  <button className="suggest-btn" onClick={() => handleSuggestionClick('BZ-506-SJO', true)}>BZ-506-SJO (En Tránsito)</button>
                  <button className="suggest-btn" onClick={() => handleSuggestionClick('BZ-MIA-9081', true)}>BZ-MIA-9081 (Listo en Miami)</button>
                </div>
              </div>

              <div className="hero-ctas animate-slide-up-more">
                <Link href="/calculator" className="btn btn-secondary">
                  <span>Calcular Tarifas</span>
                  <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
                <div className="trust-indicators">
                  <div className="avatars-group">
                    <div className="avatar avatar-1"></div>
                    <div className="avatar avatar-2"></div>
                    <div className="avatar avatar-3"></div>
                  </div>
                  <div className="trust-text">
                    <strong>+24,000 ticos</strong> ya confían en BreezeGo
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="section how-it-works-section">
          <div className="container">
            <div className="section-header text-center">
              <span className="section-tag">Flujo Simplificado</span>
              <h2 className="section-title">Tu puente de Miami a Costa Rica en 3 pasos</h2>
              <p className="section-subtitle">Diseñamos una experiencia libre de estrés para tus importaciones personales y comerciales.</p>
            </div>

            <div className="steps-grid">
              {/* Step 1 */}
              <div className="step-card">
                <div className="step-badge">1</div>
                <div className="step-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <polyline points="17 11 19 13 23 9"></polyline>
                  </svg>
                </div>
                <h3 className="step-title">Crea tu Casillero Gratis</h3>
                <p className="step-text">Regístrate en 30 segundos. Obtén tu dirección física y suite exclusiva en nuestro moderno centro de distribución en Miami, FL.</p>
              </div>

              {/* Step 2 */}
              <div className="step-card">
                <div className="step-badge">2</div>
                <div className="step-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </div>
                <h3 className="step-title">Compra en Cualquier Tienda</h3>
                <p className="step-text">Compra en Amazon, eBay, AliExpress, Nike o tu tienda preferida. Al finalizar, ingresa tu dirección personalizada de BreezeGo.</p>
              </div>

              {/* Step 3 */}
              <div className="step-card">
                <div className="step-badge">3</div>
                <div className="step-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                </div>
                <h3 className="step-title">Recibe en Costa Rica</h3>
                <p className="step-text">Gestionamos la aduana de forma digital y ultra-rápida. Te entregamos el paquete directo en tu casa u oficina en Costa Rica.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services & Pricing Section */}
        <section id="pricing-details" className="section pricing-details-section">
          <div className="container">
            <div className="section-header text-center">
              <span className="section-tag">Servicios y Tarifas</span>
              <h2 className="section-title">Nuestras Tarifas Transparentes</h2>
              <p className="section-subtitle">
                Conoce nuestras tarifas de lanzamiento y regulares para importación de paquetes según el origen y tipo de transporte.
              </p>
              
              {/* Promo toggle button */}
              <div className="pricing-toggle-wrapper">
                <button 
                  type="button"
                  className={`pricing-toggle-btn ${!isRegularTariff ? 'active' : ''}`}
                  onClick={() => setIsRegularTariff(false)}
                >
                  Tarifas de Lanzamiento
                </button>
                <button 
                  type="button"
                  className={`pricing-toggle-btn ${isRegularTariff ? 'active' : ''}`}
                  onClick={() => setIsRegularTariff(true)}
                >
                  Tarifas Regulares
                </button>
              </div>

              {/* Country Tabs */}
              <div className="pricing-tabs-wrapper">
                <button 
                  type="button"
                  className={`pricing-tab-item ${ratesTab === 'usa' ? 'active' : ''}`}
                  onClick={() => setRatesTab('usa')}
                >
                  <img src="/usa-flag.png" alt="USA Flag" className="pricing-tab-flag" />
                  Miami, USA
                </button>
                <button 
                  type="button"
                  className={`pricing-tab-item ${ratesTab === 'colombia' ? 'active' : ''}`}
                  onClick={() => setRatesTab('colombia')}
                >
                  <img src="/colombia-flag.png" alt="Colombia Flag" className="pricing-tab-flag" />
                  Colombia
                </button>
              </div>
            </div>

            {ratesTab === 'usa' ? (
              <div className="rates-grid">
                {/* Miami Air Card */}
                <div className="rates-card">
                  <div className="rates-card-header">
                    <div className="rates-card-icon">✈️</div>
                    <h3 className="rates-card-title">Envío Aéreo</h3>
                    <div className="rates-card-location">USA - COSTA RICA</div>
                    <div className="rates-card-price">
                      Desde <strong>₡{isRegularTariff ? '7.000' : '6.000'}</strong> por kilo
                    </div>
                  </div>
                  
                  <div className="rates-price-ranges">
                    <div className="rates-range-item">Tarifa plana por peso real</div>
                    <div className="rates-range-item">Precio aprox. en USD: ${isRegularTariff ? '13.59' : '11.65'}</div>
                  </div>
                  <div className="rates-additional-info">
                    Calculado desde 1 gramo • Adicional de $1.99 de Boxpack por paquete
                  </div>

                  <ul className="rates-checklist">
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Vuelos diarios</span>
                        <span className="rates-check-desc">Recibe tus paquetes a la puerta de tu casa todos los días sin costo adicional</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">3 a 6 días hábiles de tránsito</span>
                        <span className="rates-check-desc">Podrás rastrear por donde vienen tus paquetes con nuestra plataforma</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Paga solo peso real</span>
                        <span className="rates-check-desc">Paga el costo de tus envíos por lo que pesan y evita pagar volumen que no pediste</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Paquetes asegurados</span>
                        <span className="rates-check-desc">Todos tus paquetes cuentan con un seguro que te protege ante eventos inesperados.</span>
                      </div>
                    </li>
                  </ul>

                  <button type="button" className="rates-detail-btn" onClick={() => { setOpenedModalId('air'); setActiveNoteIndex(null); }}>
                    Ver más / Notas
                  </button>
                </div>

                {/* Miami Sea Card */}
                <div className="rates-card">
                  <div className="rates-card-header">
                    <div className="rates-card-icon">🚢</div>
                    <h3 className="rates-card-title">Envío Marítimo</h3>
                    <div className="rates-card-location">USA - COSTA RICA</div>
                    <div className="rates-card-price">
                      Desde <strong>${isRegularTariff ? '29.00' : '27.00'}</strong> por pie cúbico
                    </div>
                  </div>
                  
                  <div className="rates-price-ranges">
                    <div className="rates-range-item">Tarifa por volumen real (CFT)</div>
                    <div className="rates-range-item">CFT = (L * W * H) / 1728 en pulgadas</div>
                  </div>
                  <div className="rates-additional-info">
                    Cálculo exacto por pie cúbico • Adicional de $1.99 de Boxpack por paquete
                  </div>

                  <ul className="rates-checklist">
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">22 días hábiles de tránsito</span>
                        <span className="rates-check-desc">Podrás rastrear el contenedor y su llegada al puerto por la plataforma</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Salidas los 15 y 30 de cada mes</span>
                        <span className="rates-check-desc">Embarcamos tu mercadería consolidada los días 15 y 30 de cada mes desde Miami</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Paga volumen real</span>
                        <span className="rates-check-desc">Ideal para paquetes de gran tamaño, cajas de mudanza y artículos pesados</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Carga Asegurada</span>
                        <span className="rates-check-desc">Seguro de carga Courier contra pérdida o daños en tránsito.</span>
                      </div>
                    </li>
                  </ul>

                  <button type="button" className="rates-detail-btn" onClick={() => { setOpenedModalId('sea'); setActiveNoteIndex(null); }}>
                    Ver más / Notas
                  </button>
                </div>
              </div>
            ) : (
              <div className="rates-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: '450px', margin: '0 auto' }}>
                {/* Colombia Air Card */}
                <div className="rates-card">
                  <div className="rates-card-header">
                    <div className="rates-card-icon">✈️</div>
                    <h3 className="rates-card-title">Envío Aéreo</h3>
                    <div className="rates-card-location">COLOMBIA - COSTA RICA</div>
                    <div className="rates-card-price">
                      Desde <strong>₡{isRegularTariff ? '7.500' : '6.500'}</strong> por kilo
                    </div>
                  </div>
                  
                  <div className="rates-price-ranges">
                    <div className="rates-range-item">Tarifa plana por peso real</div>
                    <div className="rates-range-item">Precio aprox. en USD: ${isRegularTariff ? '15.00' : '13.00'}</div>
                  </div>
                  <div className="rates-additional-info">
                    Calculado desde 1 gramo • Adicional de $1.99 de Boxpack por paquete
                  </div>

                  <ul className="rates-checklist">
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Salidas frecuentes directas</span>
                        <span className="rates-check-desc">Vuelos directos constantes desde nuestra bodega en Colombia.</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">3 a 6 días hábiles de tránsito</span>
                        <span className="rates-check-desc">Tránsito de carga express consolidada directo a Costa Rica.</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Paga solo peso real</span>
                        <span className="rates-check-desc">Paga el costo de tus envíos por lo que pesan y evita pagar volumen que no pediste</span>
                      </div>
                    </li>
                    <li className="rates-checklist-item">
                      <span className="rates-check-icon">✓</span>
                      <div className="rates-checklist-text-wrapper">
                        <span className="rates-check-title">Paquetes asegurados</span>
                        <span className="rates-check-desc">Todos tus paquetes cuentan con un seguro que te protege ante eventos inesperados.</span>
                      </div>
                    </li>
                  </ul>

                  <button type="button" className="rates-detail-btn" onClick={() => { setOpenedModalId('air'); setActiveNoteIndex(null); }}>
                    Ver más / Notas
                  </button>
                </div>
              </div>
            )}

            {/* Fulfillment Sub-section */}
            <div className="fulfillment-pricing-banner" style={{ marginTop: "60px" }}>
              <div className="banner-content">
                <div className="banner-badge">Fulfillment para Emprendedores</div>
                <h3>Fulfillment BreezeGo</h3>
                <p className="banner-desc">Diseñado para tiendas en línea que desean delegar almacenamiento, preparación y envío de pedidos.</p>
                
                <div className="fulfillment-rates-grid">
                  <div className="rate-box">
                    <span className="rate-label">Almacenamiento mensual</span>
                    <span className="rate-value">₡10.000 <span className="rate-unit">/ estante</span></span>
                  </div>
                  <div className="rate-box">
                    <span className="rate-label">Recepción de mercancía</span>
                    <span className="rate-value">₡1.000 <span className="rate-unit">/ paquete</span></span>
                  </div>
                  <div className="rate-box">
                    <span className="rate-label">Preparación y empaque</span>
                    <span className="rate-value">₡{isRegularTariff ? "2.000" : "1.500"} <span className="rate-unit">/ pedido</span></span>
                  </div>
                  <div className="rate-box">
                    <span className="rate-label">Entregas clientes (GAM)</span>
                    <span className="rate-value">₡3.000 <span className="rate-unit">/ pedido</span></span>
                  </div>
                </div>
                <span className="fulfillment-note">* Entregas fuera de la GAM se cotizan de forma personalizada.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="section benefits-section">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">Logística de Nivel Premium</span>
              <h2 className="section-title">¿Por qué los ticos prefieren BreezeGo?</h2>
              <p className="section-subtitle">Adiós a las llamadas infinitas y cobros sorpresa. Bienvenido a la logística inteligente.</p>
            </div>

            <div className="benefits-grid">
              {/* Benefit 1 */}
              <div className="benefit-card">
                <div className="benefit-icon blue-glow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <h3 className="benefit-card-title">Cero tarifas ocultas</h3>
                <p className="benefit-card-text">Nuestras tarifas se calculan por peso real, sin redondear hacia arriba. Sabrás exactamente cuánto pagas antes de que el paquete llegue.</p>
              </div>

              {/* Benefit 2 */}
              <div className="benefit-card">
                <div className="benefit-icon green-glow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                <h3 className="benefit-card-title">Aduanas 100% Digitales</h3>
                <p className="benefit-card-text">Integración automatizada con el sistema TICA de aduanas. Precalificamos tus paquetes para liberar cargas en tiempo récord.</p>
              </div>

              {/* Benefit 3 */}
              <div className="benefit-card">
                <div className="benefit-icon purple-glow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h3 className="benefit-card-title">Alertas por WhatsApp</h3>
                <p className="benefit-card-text">Recibe actualizaciones en tiempo real directo a tu WhatsApp con fotos de tus paquetes al ingresar en nuestro almacén de Miami.</p>
              </div>

              {/* Benefit 4 */}
              <div className="benefit-card">
                <div className="benefit-icon yellow-glow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                  </svg>
                </div>
                <h3 className="benefit-card-title">Envío Local a Todo el País</h3>
                <p className="benefit-card-text">Entregamos en todo Costa Rica mediante nuestra flota premium de reparto y alianzas certificadas (GAM, Guanacaste, Puntarenas, etc.).</p>
              </div>
            </div>
          </div>
        </section>

        {/* Real-Time Tracking Visualization (Interactive Segment) */}
        <section id="tracking-section" className="section tracking-visual-section">
          <div className="container">
            <div className="tracking-layout-grid">
              <div className="tracking-info-column">
                <span className="section-tag">Rastreo en Vivo</span>
                <h2 className="section-title">El poder de la claridad en cada trayecto</h2>
                <p className="section-text">
                  No te preguntes más dónde está tu paquete. Experimenta la plataforma de rastreo de nivel empresarial de BreezeGo. Monitorea cada hito desde la recepción en Miami hasta que el mensajero toca tu timbre en Costa Rica.
                </p>
                
                <div className="tracking-mini-features">
                  <div className="mini-feature">
                    <div className="mini-icon">✓</div>
                    <div>
                      <h4>Fotografía del Paquete</h4>
                      <p>Mira la caja original y el peso registrado en la báscula de Miami.</p>
                    </div>
                  </div>
                  <div className="mini-feature">
                    <div className="mini-icon">✓</div>
                    <div>
                      <h4>Predicción de Entrega</h4>
                      <p>Algoritmo inteligente que estima la llegada basándose en vuelos y aduana local.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* The Interactive Tracking Simulator Dashboard Panel */}
              <div className="tracking-dashboard-panel">
                <div className="panel-header">
                  <div className="window-controls">
                    <span className="dot red"></span>
                    <span className="dot yellow"></span>
                    <span className="dot green"></span>
                  </div>
                  <div className="panel-title">BreezeGo Tracker v2.4</div>
                  <div className="status-badge live" id="tracker-pulse">LIVE</div>
                </div>
                <div className="panel-content">
                  {/* Tracking Search Bar in Panel */}
                  <form onSubmit={handlePanelSearchSubmit} className="panel-search">
                    <input 
                      type="text" 
                      id="panel-tracking-search" 
                      placeholder="Ingrese ID de envío (ej: BZ-506-SJO)..."
                      value={panelSearchQuery}
                      onChange={(e) => setPanelSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" id="panel-search-btn">Buscar</button>
                  </form>

                  {/* Tracking Results Screen */}
                  <div 
                    className="tracking-dashboard-result" 
                    id="tracking-result-content"
                    style={{ opacity: isSearching ? 0.3 : 1, transition: 'opacity 0.2s ease' }}
                  >
                    <div className="package-meta-header">
                      <div>
                        <span className="meta-label">CÓDIGO DE ENVÍO</span>
                        <h4 className="meta-value" id="res-code">{panelTrackCode}</h4>
                      </div>
                      <div className="text-right">
                        <span className="meta-label">ESTADO ACTUAL</span>
                        <span className={`status-indicator-pill ${searchResult.statusClass}`} id="res-status-pill">
                          {searchResult.statusText}
                        </span>
                      </div>
                    </div>

                    <div className="package-details-row">
                      <div className="detail-box">
                        <span className="detail-label">Destinatario</span>
                        <span className="detail-value" id="res-recipient">{searchResult.recipient}</span>
                      </div>
                      <div className="detail-box">
                        <span className="detail-label">Descripción</span>
                        <span className="detail-value" id="res-desc">{searchResult.description}</span>
                      </div>
                      <div className="detail-box">
                        <span className="detail-label">Peso Real</span>
                        <span className="detail-value" id="res-weight">{searchResult.weight}</span>
                      </div>
                    </div>

                    {/* Dynamic Visual Timeline Line */}
                    <div className="visual-timeline-track">
                      <div 
                        className="timeline-progress-bar" 
                        id="timeline-progress" 
                        style={{ width: `${searchResult.progress}%` }}
                      ></div>
                      
                      <div className={`timeline-milestone ${searchResult.milestones[0] ? 'active' : ''} ${searchResult.currentStep === 1 ? 'current-step' : ''}`} id="mile-1">
                        <div className="milestone-dot">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <span className="milestone-label">Miami</span>
                      </div>

                      <div className={`timeline-milestone ${searchResult.milestones[1] ? 'active' : ''} ${searchResult.currentStep === 2 ? 'current-step' : ''}`} id="mile-2">
                        <div className="milestone-dot">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <span className="milestone-label">Vuelo</span>
                      </div>

                      <div className={`timeline-milestone ${searchResult.milestones[2] ? 'active' : ''} ${searchResult.currentStep === 3 ? 'current-step' : ''}`} id="mile-3">
                        <div className="milestone-dot">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <span className="milestone-label">Aduana</span>
                      </div>

                      <div className={`timeline-milestone ${searchResult.milestones[3] ? 'active' : ''} ${searchResult.currentStep === 4 ? 'current-step' : ''}`} id="mile-4">
                        <div className="milestone-dot">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <span className="milestone-label">Reparto</span>
                      </div>
                    </div>

                    {/* Detailed History Log */}
                    <div className="timeline-history-log">
                      <h5 className="history-title">Registro Detallado de Actividad</h5>
                      <div className="history-list" id="res-history-list">
                        {searchResult.history.map((item, index) => (
                          <div key={index} className={`history-item ${index === 0 ? 'current' : ''}`}>
                            <span className="history-time">{item.time}</span>
                            <div className="history-dot"></div>
                            <div className="history-info">
                              <p className="history-heading">{item.title}</p>
                              <p className="history-sub">{item.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Shipping Calculator Preview */}
        <section id="calculator-section" className="section calculator-section">
          <div className="container">
            <div className="section-header text-center">
              <span className="section-tag">Transparencia Total</span>
              <h2 className="section-title">Calculadora de Tarifas y Aduanas</h2>
              <p className="section-subtitle">Estima de forma precisa el flete, impuestos de aduana (según el Ministerio de Hacienda) y el reparto local en Costa Rica.</p>
            </div>

            <div className="calculator-grid">
              {/* Form Card */}
              <div className="calc-card calc-form-card">
                <h3 className="calc-card-title">Datos del Paquete</h3>
                
                <div className="form-group">
                  <label htmlFor="calc-origin">Origen del Envío</label>
                  <select 
                    id="calc-origin" 
                    className="form-control"
                    value={calcOrigin}
                    onChange={(e) => {
                      const newOrigin = e.target.value;
                      setCalcOrigin(newOrigin);
                      if (newOrigin === 'colombia') {
                        setCalcTransportMode('air');
                      }
                    }}
                  >
                    <option value="miami">Miami, USA (Centro Logístico Principal)</option>
                    <option value="colombia">Colombia (Bello, Antioquia)</option>
                  </select>
                  <div className="mt-2 text-[11px] text-brand-cyan/95 flex flex-wrap items-center gap-1.5 leading-relaxed">
                    <span className="font-semibold">⏱️ Tránsito estimado:</span>
                    <span>
                      {calcOrigin === 'colombia' 
                        ? '3-6 días hábiles (Aéreo)' 
                        : '3-6 días hábiles (Aéreo) | 22 días hábiles (Marítimo)'}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="calc-transport-mode">Tipo de Envío</label>
                  <select 
                    id="calc-transport-mode" 
                    className="form-control"
                    value={calcTransportMode}
                    onChange={(e) => setCalcTransportMode(e.target.value as "air" | "sea")}
                  >
                    <option value="air">✈️ Aéreo Express</option>
                    <option value="sea" disabled={calcOrigin === "colombia"}>🚢 Marítimo consolidado</option>
                  </select>
                </div>

                {calcTransportMode === "sea" && (
                  <div className="border border-white/5 bg-white/5 rounded-2xl p-4 mb-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300">Dimensiones de la Caja</span>
                      <select
                        value={calcDimUnit}
                        onChange={(e) => setCalcDimUnit(e.target.value)}
                        className="bg-[#121824] border border-white/10 rounded-lg text-[10px] px-2 py-1 text-slate-300 font-semibold focus:outline-none"
                      >
                        <option value="in">Pulgadas (in)</option>
                        <option value="cm">Centímetros (cm)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block">Largo</label>
                        <input
                          type="number"
                          value={calcLength}
                          onChange={(e) => setCalcLength(Math.max(1, parseFloat(e.target.value) || 0))}
                          className="form-control"
                          min="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block">Ancho</label>
                        <input
                          type="number"
                          value={calcWidth}
                          onChange={(e) => setCalcWidth(Math.max(1, parseFloat(e.target.value) || 0))}
                          className="form-control"
                          min="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block">Alto</label>
                        <input
                          type="number"
                          value={calcHeight}
                          onChange={(e) => setCalcHeight(Math.max(1, parseFloat(e.target.value) || 0))}
                          className="form-control"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group col-6">
                    <label htmlFor="calc-weight">Peso del Paquete</label>
                    <div className="input-with-badge">
                      <input 
                        type="number" 
                        id="calc-weight" 
                        className="form-control" 
                        value={calcWeight} 
                        min="0.001" 
                        step="0.001"
                        onChange={(e) => {
                          const val = e.target.value;
                          setCalcWeight(val === "" ? "" : (parseFloat(val) || 0));
                        }}
                      />
                      <span className="input-badge" id="weight-unit-label">
                        {calcUnit === 'lbs' ? 'Lb' : calcUnit === 'g' ? 'g' : 'Kg'}
                      </span>
                    </div>
                  </div>
                  <div className="form-group col-6">
                    <label htmlFor="calc-unit">Unidad de Peso</label>
                    <select 
                      id="calc-unit" 
                      className="form-control"
                      value={calcUnit}
                      onChange={(e) => setCalcUnit(e.target.value)}
                    >
                      <option value="kgs">Kilogramos (Kg)</option>
                      <option value="lbs">Libras (Lb)</option>
                      <option value="g">Gramos (g)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="calc-value">Valor de Compra (FOB / Declarado en USD)</label>
                  <div className="input-with-badge prefix">
                    <span className="input-prefix">$</span>
                    <input 
                      type="number" 
                      id="calc-value" 
                      className="form-control" 
                      value={calcValue} 
                      min="1"
                      onChange={(e) => setCalcValue(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <span className="form-hint">El valor total del artículo en la factura de compra.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="calc-delivery-zone">Método de Entrega / Zona</label>
                  <select 
                    id="calc-delivery-zone" 
                    className="form-control"
                    value={calcDeliveryZone}
                    onChange={(e) => setCalcDeliveryZone(e.target.value)}
                  >
                    <option value="sucursal">Retiro Gratuito en Sucursal (₡0)</option>
                    <option value="gam">Gran Área Metropolitana (₡3.500)</option>
                    <option value="cartago_alajuela">Cartago y Alajuela (₡4.500)</option>
                    <option value="outside_gam">Fuera de la GAM (₡5.000 aprox)</option>
                  </select>
                </div>

                <div className="form-group flex items-center gap-3 p-3.5 bg-white/5 border border-white/5 rounded-2xl mb-4">
                  <input
                    type="checkbox"
                    id="calc-insurance-toggle"
                    checked={calcWantsInsurance}
                    onChange={(e) => setCalcWantsInsurance(e.target.checked)}
                    className="rounded border-slate-700 bg-[#0f172a] text-brand-cyan focus:ring-brand-cyan h-4 w-4"
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <div className="flex flex-col">
                    <label htmlFor="calc-insurance-toggle" className="text-xs text-slate-200 font-bold cursor-pointer">
                      ¿Aplicar seguro de carga BreezeGo (2% del valor)?
                    </label>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      Protege tu paquete ante pérdidas, robos, daños o retrasos en el tránsito.
                    </span>
                  </div>
                </div>

                {!calcWantsInsurance && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs mb-4 leading-normal">
                    ⚠️ <strong>Atención:</strong> BreezeGo no se hace responsable por algún daño en los paquetes si decides no aplicar el seguro.
                  </div>
                )}

                {calcValue > 450 && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl mb-4">
                    <input
                      type="checkbox"
                      id="calc-electronics-toggle"
                      checked={calcIsElectronicOver450}
                      onChange={(e) => setCalcIsElectronicOver450(e.target.checked)}
                      className="rounded border-slate-700 bg-[#0f172a] text-brand-cyan focus:ring-brand-cyan h-4 w-4"
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="calc-electronics-toggle" className="text-xs text-slate-355 font-semibold cursor-pointer">
                      💡 ¿Es un artículo electrónico de más de $450? (Suma +10% de arancel especial)
                    </label>
                  </div>
                )}
              </div>

              {/* Live Results Card */}
              <div className="calc-card calc-result-card">
                <h3 className="calc-card-title text-white">Desglose de Costos de BreezeGo</h3>
                <p className="calc-card-subtitle">Estimación basada en fletes transparentes y regulaciones de aduana (13% IVA).</p>

                <div className="result-breakdown">
                  {/* Freight */}
                  <div className="breakdown-item">
                    <span className="item-label">
                      Flete Internacional
                      <span className="item-sub-desc" id="freight-desc">
                        {calcOrigin === 'miami' ? 'Miami' : 'Colombia'} a SJO (
                        {calcTransportMode === 'sea'
                          ? `${((calcLengthVal * calcWidthVal * calcHeightVal) / 1728).toFixed(2)} CFT Marítimo`
                          : `${weightInKgs.toFixed(3)} Kg Aéreo`
                        })
                      </span>
                    </span>
                    <span className="item-val" id="res-freight">${freightTotal.toFixed(2)}</span>
                  </div>

                  {/* Duties / Taxes */}
                  <div className="breakdown-item">
                    <span className="item-label">
                      Impuestos Aduana (Hacienda)
                      <span className="item-sub-desc" id="tax-desc">
                        Aforo CIF ({(taxRate * 100).toFixed(0)}% IVA)
                      </span>
                    </span>
                    <span className="item-val" id="res-taxes">${taxTotal.toFixed(2)}</span>
                  </div>

                  {/* Courier Insurance */}
                  <div className="breakdown-item">
                    <span className="item-label">
                      Seguro de Carga Courier
                      <span className="item-sub-desc">Protección total BreezeGo (2% FOB)</span>
                    </span>
                    <span className="item-val" id="res-insurance">${insuranceTotal.toFixed(2)}</span>
                  </div>

                  {/* Local Delivery */}
                  <div className="breakdown-item">
                    <span className="item-label">
                      Entrega / Retiro local
                      <span className="item-sub-desc" id="delivery-desc">
                        {calcDeliveryZone === 'sucursal'
                          ? 'Retiro en Sucursal'
                          : calcDeliveryZone === 'gam'
                          ? 'Entrega GAM Standard'
                          : calcDeliveryZone === 'cartago_alajuela'
                          ? 'Entrega Cartago/Alajuela'
                          : 'Entrega fuera de la GAM'}
                      </span>
                    </span>
                    <span className="item-val" id="res-delivery">
                      {calcDeliveryZone === 'sucursal' ? 'Gratis' : `$${deliveryTotal.toFixed(2)}`}
                    </span>
                  </div>



                  <hr className="calc-divider" />

                  {/* Total */}
                  <div className="total-row">
                    <div className="total-details">
                      <span className="total-label">Costo Total Estimado</span>
                      <span className="total-hint">*Sujeto a verificación física en aduana</span>
                    </div>
                    <div className="total-price-group">
                      <span className="total-usd" id="calc-total-usd">${grandTotalUSD.toFixed(2)}</span>
                      <span className="total-crc" id="calc-total-crc">≈ ₡{formatCRC(Math.round(grandTotalCRC))}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Banner & Special Permits Disclaimer */}
                <div className="calculator-benefit-banner bg-white/5 border border-white/5 rounded-2xl p-4 my-4 flex items-start gap-3">
                  <div className="banner-icon text-xl">⚠️</div>
                  <div className="space-y-1 text-left text-xs leading-relaxed text-slate-300">
                    <p className="font-bold text-white">¿Productos con permisos especiales?</p>
                    <p>Cosméticos, alimentos, vitaminas y químicos requieren permisos adicionales del Ministerio de Salud que pueden generar costos extra.</p>
                    <a
                      href="https://wa.me/50660696039?text=Hola,%20quisiera%20consultar%20si%20mi%20paquete%20requiere%20permisos%20especiales%20en%20BreezeGo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-brand-cyan hover:underline font-bold"
                    >
                      Preguntar por WhatsApp ↗
                    </a>
                  </div>
                </div>

                <Link href="/signup" className="btn btn-primary btn-block text-center mt-auto">Abrir Mi Casillero Gratis</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Modern Statistics Section */}
        <section className="section stats-section">
          <div className="container stats-container">
            <div className="stats-background-glow"></div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number" id="stats-packages">{packagesCount}K+</div>
                <div className="stat-label">Paquetes Entregados</div>
                <p className="stat-sub">Tránsito seguro directo a Costa Rica.</p>
              </div>
              <div className="stat-item">
                <div className="stat-number" id="stats-effectiveness">{effectivenessCount}%</div>
                <div className="stat-label">% de Efectividad Aduanal</div>
                <p className="stat-sub">Liberación de mercadería rápida.</p>
              </div>
              <div className="stat-item">
                <div className="stat-number" id="stats-days">&lt; {daysCount} d</div>
                <div className="stat-label">Días Promedio Miami-GAM</div>
                <p className="stat-sub">Vuelos diarios y directos de carga.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="section testimonials-section">
          <div className="container">
            <div className="section-header text-center">
              <span className="section-tag">Casos de Éxito</span>
              <h2 className="section-title">Comentarios de nuestra comunidad</h2>
              <p className="section-subtitle">Descubre por qué ticos y ticas de todo el país han migrado su logística a BreezeGo.</p>
            </div>

            <div className="testimonials-grid">
              {/* Testimonial 1 */}
              <div className="testimonial-card">
                <div className="rating-stars">⭐⭐⭐⭐⭐</div>
                <p className="testimonial-text">
                  &ldquo;He probado al menos 4 curriers diferentes en el país y BreezeGo está a otro nivel. El sistema para prealertar y ver el desglose exacto de los impuestos me ahorra horas. Además, las alertas automáticas de WhatsApp son increíbles.&rdquo;
                </p>
                <div className="testimonial-user">
                  <div className="user-avatar u1"></div>
                  <div>
                    <h4 className="user-name">Andrea Monge</h4>
                    <p className="user-role">Co-fundadora, Bloom Boutique (San José)</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="testimonial-card">
                <div className="rating-stars">⭐⭐⭐⭐⭐</div>
                <p className="testimonial-text">
                  &ldquo;Como negocio de e-commerce en Costa Rica, la consistencia de BreezeGo ha sido clave. Su calculadora es súper precisa y los paquetes de nuestros clientes llegan exactamente cuando el sistema dice que lo harán. Soporte de primera.&rdquo;
                </p>
                <div className="testimonial-user">
                  <div className="user-avatar u2"></div>
                  <div>
                    <h4 className="user-name">Alejandro Solís</h4>
                    <p className="user-role">Fundador, ElectroSmart CR (Heredia)</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="testimonial-card">
                <div className="rating-stars">⭐⭐⭐⭐⭐</div>
                <p className="testimonial-text">
                  &ldquo;Llevo 6 meses trayendo repuestos de vehículos y calzado deportivo. Me encanta que no redondean el peso y el cobro local a Guanacaste es sumamente económico. La plataforma móvil es la mejor del mercado en Costa Rica.&rdquo;
                </p>
                <div className="testimonial-user">
                  <div className="user-avatar u3"></div>
                  <div>
                    <h4 className="user-name">Roberto Brenes</h4>
                    <p className="user-role">Propietario, Taller Brenes & Co (Liberia)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="section faq-section">
          <div className="container">
            <div className="section-header text-center">
              <span className="section-tag">Centro de Respuestas</span>
              <h2 className="section-title">Preguntas Frecuentes</h2>
              <p className="section-subtitle">¿Tienes dudas sobre importaciones o casilleros? Resolvemos tus preguntas más comunes.</p>
            </div>

            <div className="faq-accordion-list">
              {/* FAQ 1 */}
              <div className={`faq-item ${activeFaqIndex === 0 ? 'active' : ''}`}>
                <button className="faq-trigger" onClick={() => handleFaqToggle(0)}>
                  <span>¿Es gratis registrarse y qué incluye el casillero?</span>
                  <span className="faq-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
                 <div className="faq-panel" style={{ maxHeight: activeFaqIndex === 0 ? '500px' : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <p>¡Sí, la membresía básica de BreezeGo es 100% gratuita! No tiene mensualidades ni costos por apertura. Tu registro te otorga una dirección exclusiva en Miami, Florida con tu suite personal para recibir paquetes a tu nombre, almacenamiento gratuito por hasta 30 días, prealerta digital en línea y servicio al cliente prioritario.</p>
                </div>
              </div>

              {/* FAQ 2 */}
              <div className={`faq-item ${activeFaqIndex === 1 ? 'active' : ''}`}>
                <button className="faq-trigger" onClick={() => handleFaqToggle(1)}>
                  <span>¿Cómo se calculan los impuestos de aduana en Costa Rica?</span>
                  <span className="faq-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
                 <div className="faq-panel" style={{ maxHeight: activeFaqIndex === 1 ? '500px' : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <p>Los impuestos de importación en Costa Rica los define el Ministerio de Hacienda basándose en la clasificación arancelaria y el valor CIF (Valor del artículo + Flete internacional + Seguro). Las categorías generales pagan un 29.95%, la tecnología y computación paga un 13% de IVA y productos cosméticos pueden pagar hasta un 54.55%. Nuestra calculadora hace esta estimación por ti de forma automática.</p>
                </div>
              </div>

              {/* FAQ 3 */}
              <div className={`faq-item ${activeFaqIndex === 2 ? 'active' : ''}`}>
                <button className="faq-trigger" onClick={() => handleFaqToggle(2)}>
                  <span>¿Qué productos tienen restricciones de envío o son prohibidos?</span>
                  <span className="faq-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
                 <div className="faq-panel" style={{ maxHeight: activeFaqIndex === 2 ? '500px' : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <p>Por normativas de aviación y leyes de Costa Rica, está prohibido transportar: pirotecnia, armas de fuego o municiones, narcóticos o sustancias ilícitas, dinero en efectivo o metales preciosos. Artículos restringidos que requieren permisos de salud o ministeriales incluyen: cosméticos, suplementos alimenticios, alimentos de cualquier tipo y perfumes. Consúltanos por soporte antes de enviar este tipo de artículos para ayudarte con el permiso.</p>
                </div>
              </div>

              {/* FAQ 4 */}
              <div className={`faq-item ${activeFaqIndex === 3 ? 'active' : ''}`}>
                <button className="faq-trigger" onClick={() => handleFaqToggle(3)}>
                  <span>¿Cuánto tiempo tarda en llegar mi paquete a Costa Rica?</span>
                  <span className="faq-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
                 <div className="faq-panel" style={{ maxHeight: activeFaqIndex === 3 ? '500px' : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <p>Una vez recibido tu paquete en nuestras bodegas en Miami y debidamente procesado, el traslado aéreo tarda en promedio de 3 a 6 días hábiles. El proceso de nacionalización y aduanas toma entre 24 y 48 horas adicionales. Las entregas en la Gran Área Metropolitana (GAM) se realizan el mismo día de liberación y las zonas rurales en 24 a 48 horas adicionales.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section id="signup" className="section final-cta-section">
          <div className="container cta-box-container">
            <div className="cta-inner-card">
              <div className="glow-overlay"></div>
              <div className="cta-content">
                <h2 className="cta-title">Empieza a traer tus compras hoy mismo</h2>
                 <p className="cta-text">Crea tu cuenta BreezeGo ahora. Únete a miles de costarricenses que importan de forma inteligente con la plataforma de logística más rápida del mercado.</p>
                
                <form 
                  className="cta-form" 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (ctaEmail.trim()) {
                      router.push(`/signup?email=${encodeURIComponent(ctaEmail.trim())}`);
                    }
                  }}
                >
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="Tu correo electrónico..." 
                    required 
                    className="form-control"
                    value={ctaEmail}
                    onChange={(e) => setCtaEmail(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">Obtener Casillero Gratis</button>
                </form>

                <div className="cta-guarantees">
                  <span className="guarantee-item">🛡️ Sin mensualidad fija</span>
                  <span className="guarantee-item">⚡ Suite en Miami inmediata</span>
                  <span className="guarantee-item">🚚 Reparto en todo Costa Rica</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="main-footer">
        <div className="container footer-grid">
          <div className="footer-brand-col">
            <Link href="/" className="logo">
              <img src="/logo.png" alt="BreezeGo Logo" className="brand-logo-img" />
            </Link>
            <p className="footer-brand-desc">
              <strong>Tus paquetes en movimiento.</strong> La plataforma moderna de envíos y logística internacional de Costa Rica. Conectando comercios y personas con el mercado global.
            </p>
            <div className="social-links">
              {/* Custom SVG socials */}
              <a href="#" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="#" aria-label="TikTok">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
              </a>
            </div>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Servicios</h4>
            <ul className="footer-links-list">
              <li><a href="#calculator-section">Casillero Miami</a></li>
              <li><a href="#">Carga Marítima</a></li>
              <li><a href="#">BreezeGo Business</a></li>
              <li><a href="#">Distribución Local</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Recursos</h4>
            <ul className="footer-links-list">
              <li><a href="#calculator-section">Calculadora de Tarifas</a></li>
              <li><a href="#faq">Artículos Restringidos</a></li>
              <li><a href="#faq">Preguntas Frecuentes</a></li>
              <li><a href="#">Soporte de Aduanas</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Contacto</h4>
            <ul className="footer-links-list address-list text-left">
               <li>💬 WhatsApp: <a href="https://wa.me/50660696039" target="_blank" rel="noopener noreferrer" style={{ color: "#46C7D2", textDecoration: "none" }}>+506 6069-6039</a></li>
              <li>📞 +506 6069-6039</li>
              <li>📍 San José, Costa Rica</li>
              <li>🕒 Lun - Vie: 8am - 6pm</li>
            </ul>
          </div>
        </div>

        <div className="container footer-bottom">
          <p>&copy; 2026 BreezeGo Costa Rica S.A. Todos los derechos reservados. | Diseñado y puesto en línea por Latente Studio Cr</p>
          <div className="footer-legal">
            <Link href="/terms.html">Términos de Servicio</Link>
            <Link href="/privacy.html">Política de Privacidad</Link>
            <Link href="/cookies.html">Política de Cookies</Link>
          </div>
        </div>
      {openedModalId && (
        <div className="rates-modal-overlay" onClick={() => { setOpenedModalId(null); setActiveNoteIndex(null); }}>
          <div className="rates-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="rates-modal-close" onClick={() => { setOpenedModalId(null); setActiveNoteIndex(null); }}>
              ✕
            </button>
            <h3 className="rates-modal-title">
              {openedModalId === 'air' ? 'Detalles de Envío Aéreo' : 'Detalles de Envío Marítimo'}
            </h3>
            <div className="rates-modal-location">
              {ratesTab === 'usa' ? 'USA - COSTA RICA' : 'COLOMBIA - COSTA RICA'}
            </div>
            
            <div className="rates-notes-list">
              {(ratesTab === 'usa' 
                ? (openedModalId === 'air' ? usaAirNotes : usaSeaNotes)
                : (openedModalId === 'air' ? colombiaAirNotes : [])
              ).map((note, index) => (
                <div key={index} className="rates-note-item">
                  <div className="rates-note-header" onClick={() => setActiveNoteIndex(activeNoteIndex === index ? null : index)}>
                    <span className="rates-note-title">{note.title}</span>
                    <span className="rates-note-toggle-icon" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                      {activeNoteIndex === index ? '−' : '+'}
                    </span>
                  </div>
                  {activeNoteIndex === index && (
                    <p className="rates-note-desc">{note.desc}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      </footer>
    </div>
  );
}
