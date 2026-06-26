"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { mockDb } from "@/lib/supabase";
import { BusinessSettings } from "@/types";
import "./calculator.css";

export default function CalculatorPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dbSettings, setDbSettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await mockDb.settings.get();
        setDbSettings(s);
      } catch (e) {
        console.error("Error loading settings in calculator page", e);
      }
    };
    loadSettings();
  }, []);

  // Form State
  const [transportMode, setTransportMode] = useState<"air" | "sea">("air");
  const [origin, setOrigin] = useState<string>("miami");
  const [weight, setWeight] = useState<number | "">(2.5);
  const [unit, setUnit] = useState<string>("kgs");
  const [dimUnit, setDimUnit] = useState<string>("in");
  const [length, setLength] = useState<number>(8);
  const [width, setWidth] = useState<number>(6);
  const [height, setHeight] = useState<number>(4);
  const [isElectronicOver450, setIsElectronicOver450] = useState<boolean>(false);
  const [declaredValue, setDeclaredValue] = useState<number>(85);
  const [province, setProvince] = useState<string>("sanjose");
  const [delivery, setDelivery] = useState<boolean>(true);
  const [isRegularTariff, setIsRegularTariff] = useState<boolean>(false);
  const [wantsInsurance, setWantsInsurance] = useState<boolean>(true);

  // Calculations
  const exchangeRate = 500;

  // Weight in Kgs - handles kgs, lbs and grams (g) conversions
  const weightInKgs = useMemo(() => {
    let w = weight === "" ? 0.001 : (weight || 0.001);
    if (unit === "lbs") {
      w = w / 2.20462;
    } else if (unit === "g") {
      w = w * 0.001;
    }
    if (w < 0.001) w = 0.001;
    return w;
  }, [weight, unit]);

  // Convert dimensions to Inches
  const dimsInInches = useMemo(() => {
    let l = length || 1;
    let w = width || 1;
    let h = height || 1;
    if (dimUnit === "cm") {
      l = l / 2.54;
      w = w / 2.54;
      h = h / 2.54;
    }
    return { l, w, h };
  }, [length, width, height, dimUnit]);

  // Volumetric weight: (L * W * H) / 366 for Kg, or (L * W * H) / 5000 if cm
  const volumetricKgs = useMemo(() => {
    let l = length || 1;
    let w = width || 1;
    let h = height || 1;
    if (dimUnit === "cm") {
      return (l * w * h) / 5000;
    }
    return (l * w * h) / 366;
  }, [length, width, height, dimUnit]);

  // Chargeable Weight = max(actual, volumetric) in Kg
  const chargeableWeightKgs = useMemo(() => {
    return Math.max(weightInKgs, volumetricKgs);
  }, [weightInKgs, volumetricKgs]);

  // Base Freight computation
  const freightTotal = useMemo(() => {
    let freightCRC = 0;
    if (transportMode === "air") {
      if (origin === "colombia") {
        const ratePerKg = isRegularTariff ? 7500 : 6500;
        freightCRC = weightInKgs * ratePerKg;
      } else if (origin === "miami") {
        const ratePerKg = isRegularTariff 
          ? (dbSettings ? dbSettings.miamiRegularRate : 7000) 
          : (dbSettings ? dbSettings.miamiLaunchRate : 6000);
        freightCRC = chargeableWeightKgs * ratePerKg;
      } else if (origin === "europe") {
        const ratePerKgUsd = 13.22;
        freightCRC = chargeableWeightKgs * ratePerKgUsd * exchangeRate;
      } else if (origin === "china") {
        const ratePerKgUsd = 19.84;
        freightCRC = chargeableWeightKgs * ratePerKgUsd * exchangeRate;
      }
    } else {
      // Sea Mode
      if (origin === "miami") {
        // CFT = (L * W * H) / 1728
        const dims = dimsInInches;
        const cubicFeet = (dims.l * dims.w * dims.h) / 1728;
        const ratePerCftUsd = isRegularTariff ? 29 : 27;
        freightCRC = cubicFeet * ratePerCftUsd * exchangeRate;
      } else if (origin === "europe") {
        const ratePerKgUsd = 2.5 * 2.20462;
        freightCRC = chargeableWeightKgs * ratePerKgUsd * exchangeRate;
      } else if (origin === "china") {
        const ratePerKgUsd = 1.8 * 2.20462;
        freightCRC = chargeableWeightKgs * ratePerKgUsd * exchangeRate;
      }
    }

    let minFreightCRC = 0;
    if (transportMode === "air") {
      if (origin === "miami" || origin === "colombia") {
        // Miami/Colombia air calculates exactly from 1 gram, no minimum limit applied
        minFreightCRC = 0;
      } else if (origin === "europe") {
        minFreightCRC = 13.22 * 2 * exchangeRate;
      } else if (origin === "china") {
        minFreightCRC = 25.0 * exchangeRate;
      }
    } else {
      if (origin === "miami" || origin === "colombia") {
        minFreightCRC = 0;
      } else if (origin === "europe") {
        minFreightCRC = 30.0 * exchangeRate;
      } else if (origin === "china") {
        minFreightCRC = 25.0 * exchangeRate;
      }
    }

    return Math.max(minFreightCRC, freightCRC) / exchangeRate;
  }, [transportMode, origin, chargeableWeightKgs, isRegularTariff, dbSettings, dimsInInches, weightInKgs]);

  // Insurance Fee
  const insuranceTotal = useMemo(() => {
    return wantsInsurance && declaredValue > 0 ? Number((declaredValue * 0.02).toFixed(2)) : 0;
  }, [declaredValue, wantsInsurance]);

  // Box Consolidation Fee
  const boxFeeTotal = 0;

  const cifValue = useMemo(() => {
    return declaredValue + freightTotal + insuranceTotal + boxFeeTotal;
  }, [declaredValue, freightTotal, insuranceTotal, boxFeeTotal]);

  const taxRate = 0.13; // Fixed 13% IVA

  const taxesTotal = useMemo(() => {
    return (freightTotal + insuranceTotal + boxFeeTotal) * taxRate;
  }, [freightTotal, insuranceTotal, boxFeeTotal, taxRate]);

  // Handling Fees
  const handlingTotal = 0;

  // Local Reparto Delivery
  const deliveryTotal = useMemo(() => {
    if (!delivery) return 0;
    let deliveryCRC = 0;
    
    const gamFee = dbSettings ? dbSettings.deliveryGamFee : 3500;
    const cartagoAlajuelaFee = dbSettings ? dbSettings.deliveryCartagoAlajuelaFee : 4500;
    const ruralFee = dbSettings ? dbSettings.deliveryRuralFee : 5000;
    
    if (province === "sanjose" || province === "heredia") {
      deliveryCRC = gamFee;
    } else if (province === "cartago" || province === "alajuela") {
      deliveryCRC = cartagoAlajuelaFee;
    } else {
      deliveryCRC = ruralFee; // Guanacaste, Puntarenas, Limon rural delivery
    }
    return deliveryCRC / exchangeRate;
  }, [delivery, province, dbSettings]);

  // Combined totals
  const totalUSD = useMemo(() => {
    return freightTotal + insuranceTotal + taxesTotal + deliveryTotal;
  }, [freightTotal, insuranceTotal, taxesTotal, deliveryTotal]);

  const totalCRC = useMemo(() => {
    return totalUSD * exchangeRate;
  }, [totalUSD]);

  // Delivery Date Estimator
  const deliveryETAString = useMemo(() => {
    const today = new Date();
    let daysToAdd = transportMode === "air" ? (origin === "colombia" ? 5 : 4) : 15;
    if (origin === "europe" && transportMode === "air") daysToAdd = 7;

    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + daysToAdd);

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };
    const dateStr = deliveryDate.toLocaleDateString("es-CR", dateOptions);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }, [transportMode, origin]);

  // Dynamic recommendations
  const recommendations = useMemo(() => {
    const list = [];
    if (volumetricKgs > weightInKgs) {
      list.push({
        type: "warning",
        icon: "⚠️",
        title: "Peso Volumétrico Aplicado (IATA):",
        text: `Tu paquete tiene dimensiones grandes. El flete se calculará por su volumen (${volumetricKgs.toFixed(1)} Kg) en vez de su peso real (${weightInKgs.toFixed(1)} Kg). Recomendamos solicitar reempaque consolidado en Miami para reducir la caja.`,
      });
    }
    if (declaredValue >= 500) {
      list.push({
        type: "warning",
        icon: "⚠️",
        title: "Trámite de Póliza Formal:",
        text: "Las importaciones cuyo valor de factura sea superior a $500 FOB no pueden liberarse con aforo simplificado. Requieren una póliza formal por medio de Agencia de Aduanas BreezeGo.",
      });
    }
    if (transportMode === "sea") {
      const dims = dimsInInches;
      const cubicFeet = (dims.l * dims.w * dims.h) / 1728;
      list.push({
        type: "info",
        icon: "🚢",
        title: "Tarifa Marítima Habilitada:",
        text: `Su paquete se calcula por volumen a una tarifa de $${isRegularTariff ? "29.00" : "27.00"} USD/CFT. Volumen estimado: ${cubicFeet.toFixed(2)} CFT.`,
      });
    }
    if (isElectronicOver450) {
      list.push({
        type: "warning",
        icon: "⚡",
        title: "Impuesto Especial de Electrónicos (FOB > $450):",
        text: `Al marcar el artículo como un electrónico de más de $450 USD, se aplica un recargo especial del 10% sobre el valor del artículo ($${(declaredValue * 0.10).toFixed(2)} USD) en el cálculo de aduanas.`,
      });
    }
    list.push({
      type: "info",
      icon: "📲",
      title: "Permisos Especiales en Aduanas:",
      text: "Ciertos artículos (alimentos, cosméticos, lociones, etc.) requieren permisos especiales y pueden generar costos de nacionalización adicionales. Consúltanos por WhatsApp al +506 6069-6039 para evitar sorpresas.",
    });
    return list;
  }, [volumetricKgs, weightInKgs, declaredValue, transportMode, isRegularTariff, isElectronicOver450]);

  return (
    <div className="calculator-page-root">
      {/* Simple Modern Navbar */}
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
              <li><Link href="/tracking" className="nav-link">Rastreo</Link></li>
              <li><Link href="/calculator" className="nav-link active">Calculadora</Link></li>
              <li><Link href="/#faq" className="nav-link">Preguntas</Link></li>
            </ul>
            <div className="nav-actions">
              {user ? (
                <Link href="/dashboard" className="btn btn-ghost">Mi Panel</Link>
              ) : (
                <Link href="/login" className="btn btn-ghost">Ingresar</Link>
              )}
              {user ? (
                <Link href="/dashboard" className="btn btn-primary">Dashboard</Link>
              ) : (
                <Link href="/signup" className="btn btn-primary">Crear Casillero</Link>
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
              <li><Link href="/tracking" onClick={() => setMobileMenuOpen(false)}>Rastreo Satelital</Link></li>
              <li><Link href="/calculator" className="active" onClick={() => setMobileMenuOpen(false)}>Calculadora de Tarifas</Link></li>
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

      <main className="calc-main">
        <div className="container">
          {/* Page Header */}
          <div className="page-title-block text-center">
            <span className="badge-tag">Herramienta de Cotización</span>
            <h1>Calculadora de Envío e Impuestos</h1>
            <p>
              Estima costos de fletes aéreos y marítimos, aforos de aduana del Ministerio de Hacienda y fletes locales
              a domicilio en Costa Rica con transparencia total.
            </p>
          </div>

          {/* Main Layout Grid */}
          <div className="calculator-layout-grid">
            {/* INPUT FORM CARD (Left / Stripe Style) */}
            <section className="calc-form-card">
              {/* 1. SHIPPING TYPE SELECTOR (Aéreo vs Marítimo Tabs) */}
              <div className="form-group">
                <label>Tipo de Transporte</label>
                <div className="shipping-type-selector">
                  <button
                    type="button"
                    className={`type-tab ${transportMode === "air" ? "active" : ""}`}
                    onClick={() => setTransportMode("air")}
                  >
                    <span className="tab-icon">✈️</span>
                    <div className="tab-meta">
                      <span className="tab-title">Aéreo Express</span>
                      <span className="tab-sub">Miami-CR (3-6 días hábiles)</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`type-tab ${transportMode === "sea" ? "active" : ""}`}
                    onClick={() => setTransportMode("sea")}
                    disabled={origin === "colombia"}
                    style={origin === "colombia" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    <span className="tab-icon">🚢</span>
                    <div className="tab-meta">
                      <span className="tab-title">Marítimo Económico</span>
                      <span className="tab-sub">Carga &gt; 30 Kg (~22 días hábiles)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tarifas Phase Selector */}
              <div className="form-group">
                <label>Fase de Operación (Tarifas)</label>
                <div className="shipping-type-selector">
                  <button
                    type="button"
                    className={`type-tab ${!isRegularTariff ? "active" : ""}`}
                    onClick={() => setIsRegularTariff(false)}
                    style={{ flex: 1, padding: "8px" }}
                  >
                    <div className="tab-meta" style={{ textAlign: "center", width: "100%" }}>
                      <span className="tab-title" style={{ fontSize: "0.85rem" }}>Lanzamiento</span>
                      <span className="tab-sub" style={{ fontSize: "0.7rem" }}>
                        {origin === "colombia"
                          ? "₡6.500 / Kg"
                          : transportMode === "air"
                            ? "₡6.000 / Kg"
                            : "₡16.500 / CFT"}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`type-tab ${isRegularTariff ? "active" : ""}`}
                    onClick={() => setIsRegularTariff(true)}
                    style={{ flex: 1, padding: "8px" }}
                  >
                    <div className="tab-meta" style={{ textAlign: "center", width: "100%" }}>
                      <span className="tab-title" style={{ fontSize: "0.85rem" }}>Regular</span>
                      <span className="tab-sub" style={{ fontSize: "0.7rem" }}>
                        {origin === "colombia"
                          ? "₡7.500 / Kg"
                          : transportMode === "air"
                            ? "₡7.000 / Kg"
                            : "₡17.500 / CFT"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. ORIGIN HUB SELECTOR */}
              <div className="form-group">
                <label htmlFor="input-origin">Origen del Envío (Casillero)</label>
                <select
                  id="input-origin"
                  className="form-control"
                  value={origin}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOrigin(val);
                    if (val === "colombia") {
                      setTransportMode("air");
                    }
                  }}
                >
                  <option value="miami">Miami, USA (Centro Logístico Principal)</option>
                  <option value="colombia">Colombia (Bello, Antioquia)</option>
                </select>
                <div className="mt-2 text-[11px] text-brand-cyan/95 flex flex-wrap items-center gap-1.5 leading-relaxed">
                  <span className="font-semibold">⏱️ Tránsito estimado:</span>
                  <span>
                    {origin === "colombia"
                      ? "3-6 días hábiles (Aéreo)"
                      : "3-6 días hábiles (Aéreo) | 22 días hábiles (Marítimo)"}
                  </span>
                </div>
              </div>

              {/* 3. WEIGHT INPUT */}
              <div className="form-row">
                <div className="form-group col-6">
                  <label htmlFor="input-weight">Peso del Paquete</label>
                  <div className="input-badge-wrapper">
                    <input
                      type="number"
                      id="input-weight"
                      className="form-control"
                      value={weight}
                      min="0.001"
                      step="0.001"
                      onChange={(e) => {
                        const val = e.target.value;
                        setWeight(val === "" ? "" : (parseFloat(val) || 0));
                      }}
                    />
                    <span className="input-badge" id="lbl-weight-unit">
                      {unit === "lbs" ? "Lb" : unit === "g" ? "g" : "Kg"}
                    </span>
                  </div>
                </div>
                <div className="form-group col-6">
                  <label htmlFor="input-unit">Unidad de Peso</label>
                  <select
                    id="input-unit"
                    className="form-control"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="kgs">Kilogramos (Kg)</option>
                    <option value="lbs">Libras (Lb)</option>
                    <option value="g">Gramos (g)</option>
                  </select>
                </div>
              </div>

              {/* 4. DIMENSIONS INPUT (Length, Width, Height) */}
              <div className="form-group">
                <div className="dimensions-header-row">
                  <label>Dimensiones del Paquete (Volumen)</label>
                  <select
                    id="input-dim-unit"
                    className="dim-unit-select"
                    value={dimUnit}
                    onChange={(e) => setDimUnit(e.target.value)}
                  >
                    <option value="in">Pulgadas (in)</option>
                    <option value="cm">Centímetros (cm)</option>
                  </select>
                </div>
                <div className="dimensions-inputs-grid">
                  <div className="dim-input-box">
                    <input
                      type="number"
                      id="input-length"
                      className="form-control"
                      value={length}
                      min="1"
                      placeholder="Largo"
                      onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                    />
                    <span className="dim-label">Largo</span>
                  </div>
                  <div className="dim-input-box">
                    <input
                      type="number"
                      id="input-width"
                      className="form-control"
                      value={width}
                      min="1"
                      placeholder="Ancho"
                      onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    />
                    <span className="dim-label">Ancho</span>
                  </div>
                  <div className="dim-input-box">
                    <input
                      type="number"
                      id="input-height"
                      className="form-control"
                      value={height}
                      min="1"
                      placeholder="Alto"
                      onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    />
                    <span className="dim-label">Alto</span>
                  </div>
                </div>
                <span className="input-hint">
                  Necesario para calcular flete volumétrico en artículos sobredimensionados.
                </span>
              </div>

              {/* SPECIAL ELECTRONICS CHECKBOX */}
              <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                <input
                  type="checkbox"
                  id="input-is-electronic"
                  checked={isElectronicOver450}
                  onChange={(e) => setIsElectronicOver450(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                />
                <label htmlFor="input-is-electronic" style={{ margin: 0, cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold' }}>
                  ¿Es un artículo electrónico con valor mayor a $450 USD?
                </label>
              </div>

              {/* 6. VALUE INPUT (FOB) */}
              <div className="form-group">
                <label htmlFor="input-value">Valor Declarado (FOB en USD)</label>
                <div className="input-prefix-wrapper">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    id="input-value"
                    className="form-control"
                    value={declaredValue}
                    min="1"
                    onChange={(e) => setDeclaredValue(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <span className="input-hint">El valor total neto indicado en la factura comercial de compra.</span>
              </div>

              <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 0' }}>
                <input
                  type="checkbox"
                  id="input-wants-insurance"
                  checked={wantsInsurance}
                  onChange={(e) => setWantsInsurance(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="input-wants-insurance" style={{ margin: 0, cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold' }}>
                    ¿Aplicar seguro de carga BreezeGo (2% del valor)?
                  </label>
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', lineHeight: 'normal' }}>
                    Protege tu paquete ante pérdidas, robos, daños o retrasos en el tránsito.
                  </span>
                </div>
              </div>

              {!wantsInsurance && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  color: '#f87171',
                  fontSize: '11px',
                  lineHeight: 'normal',
                  marginBottom: '15px'
                }}>
                  ⚠️ <strong>Atención:</strong> BreezeGo no se hace responsable por algún daño en los paquetes si decides no aplicar el seguro.
                </div>
              )}

              {/* Consolidación de Cajas */}
              <div className="p-4 rounded-2xl border border-brand-teal/20 bg-brand-cyan/5 text-xs space-y-2 mb-8">
                <span className="text-brand-teal font-extrabold block">📦 Consolidación & Reempaque</span>
                <p className="text-slate-700 leading-normal font-medium">
                  ¿Deseas consolidar o reempacar múltiples paquetes para optimizar su volumen? Ofrecemos reempaque gratuito en Miami.
                </p>
                <a
                  href="https://wa.me/50660696039?text=Hola,%20quisiera%20consultar%20sobre%20las%20tarifas%20de%20consolidación%20de%20paquetes%20con%20BreezeGo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-brand-teal font-bold hover:underline pt-1"
                >
                  <span>Consultar tarifas por WhatsApp</span>
                  <span>↗</span>
                </a>
              </div>

              {/* 7. DESTINATION PROVINCE */}
              <div className="form-row">
                <div className="form-group col-6">
                  <label htmlFor="input-destination">Provincia de Costa Rica</label>
                  <select
                    id="input-destination"
                    className="form-control"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  >
                    <option value="sanjose">San José (GAM)</option>
                    <option value="alajuela">Alajuela</option>
                    <option value="heredia">Heredia</option>
                    <option value="cartago">Cartago</option>
                    <option value="guanacaste">Guanacaste (Rural)</option>
                    <option value="puntarenas">Puntarenas (Rural)</option>
                    <option value="limon">Limón (Rural)</option>
                  </select>
                </div>
                <div className="form-group col-6 flex-align-end">
                  <label className="toggle-container">
                    <input
                      type="checkbox"
                      id="input-delivery"
                      checked={delivery}
                      onChange={(e) => setDelivery(e.target.checked)}
                    />
                    <span className="slider"></span>
                    <span className="toggle-label">Entrega a Domicilio</span>
                  </label>
                </div>
              </div>
            </section>

            {/* RESULTS & RECOMMENDATIONS PANEL (Right / Fintech dark style) */}
            <div className="calc-results-sidebar">
              {/* DYNAMIC ESTIMATED PRICING PANEL */}
              <section className="results-pricing-card">
                <div className="glow-overlay-bg"></div>
                <h3 className="panel-card-title">Costo Total Estimado</h3>

                <div className="total-price-banner">
                  <span className="usd-total" id="res-usd-total">
                    ${totalUSD.toFixed(2)}
                  </span>
                  <span className="crc-total" id="res-crc-total">
                    ≈ ₡{Math.round(totalCRC).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  </span>
                </div>

                {/* Precise delivery estimations */}
                <div className="delivery-eta-badge">
                  <span className="badge-icon">📅</span>
                  <div className="eta-meta">
                    <span className="eta-lbl">FECHA ESTIMADA DE ENTREGA</span>
                    <span className="eta-val" id="res-delivery-eta">
                      Llega: {deliveryETAString}
                    </span>
                  </div>
                </div>

                <hr className="panel-divider" />

                {/* Transparent Fees Section */}
                <div className="pricing-breakdown-details">
                  <h4 className="breakdown-heading">Desglose Detallado de Tarifas</h4>

                  <div className="fee-row">
                    <span className="fee-label">
                      Flete Internacional{" "}
                      <span className="fee-sub" id="breakdown-weight-flete">
                        {origin === "miami" ? "Miami" : origin === "colombia" ? "Colombia" : origin === "china" ? "China" : "España"} a SJO (
                        {transportMode === "sea"
                          ? `${((dimsInInches.l * dimsInInches.w * dimsInInches.h) / 1728).toFixed(2)} CFT`
                          : `${weightInKgs.toFixed(2)} Kg`
                        })
                      </span>
                    </span>
                    <span className="fee-val" id="breakdown-freight">
                      ${freightTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="fee-row">
                    <span className="fee-label">
                      Impuestos Aduana (Hacienda){" "}
                      <span className="fee-sub" id="breakdown-tax-rate">
                        Aforo CIF ({(taxRate * 100).toFixed(2)}%)
                      </span>
                    </span>
                    <span className="fee-val" id="breakdown-taxes">
                      ${taxesTotal.toFixed(2)}
                    </span>
                  </div>



                  <div className="fee-row">
                    <span className="fee-label">
                      Seguro de Carga Courier <span className="fee-sub">Protección total BreezeGo (2% FOB)</span>
                    </span>
                    <span className="fee-val" id="breakdown-insurance">
                      ${insuranceTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="fee-row">
                    <span className="fee-label">
                      Envío / Retiro Local{" "}
                      <span className="fee-sub" id="breakdown-delivery-zone">
                        {!delivery
                          ? "Retiro en Sucursal"
                          : province === "sanjose" || province === "heredia"
                            ? "GAM Standard (₡3.500)"
                            : province === "cartago" || province === "alajuela"
                              ? "Cartago / Alajuela (₡4.500)"
                              : "Zonas Rurales (₡5.000)"}
                      </span>
                    </span>
                    <span className="fee-val" id="breakdown-delivery">
                      {!delivery ? "Gratis" : `$${deliveryTotal.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <div className="price-disclaimer">
                  * Los impuestos y fletes indicados representan cotizaciones aproximadas con base en regulaciones
                  vigentes y peso reportado. Sujeto a aforo físico final en aduana.
                </div>
              </section>

              {/* INTELLIGENT WARNINGS & RECOMMENDATIONS (Shopify style) */}
              <section className="recommendations-card" id="recom-card-panel">
                <h3 className="card-title text-dark">📋 Recomendaciones de Importación</h3>
                <p className="card-subtitle text-dark">
                  Alertas de aforo y embalaje para optimizar tu tarifa de aduanas.
                </p>

                <div className="recom-list" id="recommendations-container">
                  {recommendations.map((recom, idx) => (
                    <div key={idx} className={`recom-item ${recom.type}`}>
                      <span className="recom-item-icon">{recom.icon}</span>
                      <div className="recom-item-text">
                        <strong>{recom.title}</strong>
                        {recom.text}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="calc-footer text-center">
        <div className="container">
          <p>&copy; 2026 BreezeGo Costa Rica. Tarifas transparentes con aduanas automatizadas.</p>
          <div className="legal-links">
            <Link href="/terms.html">Términos de Servicio</Link>
            <Link href="/privacy.html">Política de Privacidad</Link>
            <Link href="/cookies.html">Política de Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
