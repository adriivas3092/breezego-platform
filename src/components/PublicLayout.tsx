"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Compass, Calculator, MapPin, LogIn, Menu, X } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-white">
      {/* Sticky Blurred Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0b0f19]/85 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl h-20 px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            {/* Enlarged brand logo in Header */}
            <img 
              src="/logo.png" 
              alt="BreezeGo Logo" 
              className="h-16 w-auto object-contain transition-transform hover:scale-[1.02] duration-200" 
            />
            <span className="bg-brand-cyan/15 text-brand-cyan text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-widest font-heading">SaaS</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8 text-sm">
            <Link href="/calculator" className="flex items-center gap-1 text-slate-300 hover:text-brand-cyan transition-colors">
              <Calculator className="h-4 w-4" />
              Calculadora
            </Link>
            <Link href="/tracking" className="flex items-center gap-1 text-slate-300 hover:text-brand-cyan transition-colors">
              <MapPin className="h-4 w-4" />
              Rastreo Satelital
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-cyan text-[#0b0f19] px-4 py-2.5 rounded-xl hover:bg-brand-cyan/90 transition-all active:scale-95 shadow-md shadow-brand-cyan/10"
              >
                <Compass className="h-3.5 w-3.5" />
                Mi Command Center
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold border border-white/10 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-slate-200"
              >
                <LogIn className="h-3.5 w-3.5" />
                Ingresar
              </Link>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-20 bottom-0 z-40 bg-[#0b0f19]/95 backdrop-blur-md border-t border-white/5 md:hidden flex flex-col p-6 space-y-6">
            <Link
              href="/calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 text-lg text-slate-200 hover:text-brand-cyan transition-colors py-3 border-b border-white/5"
            >
              <Calculator className="h-5 w-5 text-brand-cyan" />
              Calculadora
            </Link>
            <Link
              href="/tracking"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 text-lg text-slate-200 hover:text-brand-cyan transition-colors py-3 border-b border-white/5"
            >
              <MapPin className="h-5 w-5 text-brand-cyan" />
              Rastreo Satelital
            </Link>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1">
        {children}
      </main>

      {/* Premium Dark Footer */}
      <footer className="border-t border-white/5 bg-[#090d16] py-12 text-slate-400 text-xs text-left">
        <div className="container mx-auto max-w-7xl px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col space-y-4">
            {/* Enlarged brand logo in Footer */}
            <Link href="/" className="logo">
              <img src="/logo.png" alt="BreezeGo Logo" className="brand-logo-img" />
            </Link>
            <p className="text-slate-500 leading-relaxed max-w-xs">
              La plataforma moderna de envíos y logística internacional de Costa Rica. Conectando comercios y personas con el mercado global.
            </p>
            
            {/* TikTok, Facebook and Instagram Social Links row */}
            <div className="flex items-center space-x-3 pt-2">
              <a href="#" className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-brand-cyan hover:bg-white/10 transition-all" aria-label="Facebook">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-brand-cyan hover:bg-white/10 transition-all" aria-label="Instagram">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              {/* TikTok SVG Icon Replacing Twitter */}
              <a href="#" className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-brand-orange hover:bg-white/10 transition-all" aria-label="TikTok">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
              </a>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-[10px]">Servicios</h4>
            <Link href="/calculator" className="hover:text-brand-cyan transition-colors">Casillero Miami</Link>
            <a href="#" className="hover:text-brand-cyan transition-colors">Carga Marítima</a>
            <a href="#" className="hover:text-brand-cyan transition-colors">BreezeGo Business</a>
          </div>

          <div className="flex flex-col space-y-3">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-[10px]">Recursos</h4>
            <Link href="/calculator" className="hover:text-brand-cyan transition-colors">Calculadora de Tarifas</Link>
            <Link href="/tracking" className="hover:text-brand-cyan transition-colors">Rastreo en Reparto</Link>
            <a href="#" className="hover:text-brand-cyan transition-colors">Artículos Restringidos</a>
          </div>

          <div className="flex flex-col space-y-3">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-[10px]">Soporte</h4>
            <a href="https://wa.me/50660696039" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-cyan transition-colors">💬 WhatsApp: +506 6069-6039</a>
            <a href="mailto:logistics@breezego.net" className="text-slate-500 hover:text-brand-cyan transition-colors">✉️ logistics@breezego.net</a>
            <span className="text-slate-500">📞 +506 6069-6039</span>
            <span className="text-slate-500">🕒 Lun - Vie: 8am - 6pm</span>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500">
          <p>&copy; 2026 BreezeGo Costa Rica S.A. Todos los derechos reservados.</p>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <Link href="/terms" className="hover:text-brand-cyan transition-colors">Términos</Link>
            <Link href="/privacy.html" className="hover:text-brand-cyan transition-colors">Privacidad</Link>
            <Link href="/cookies.html" className="hover:text-brand-cyan transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
