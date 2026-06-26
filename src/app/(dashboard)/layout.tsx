"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Compass, Package as PkgIcon, FileText, Mail, Bell, Shield, LogOut, Loader2, Boxes, ShieldAlert, MapPin } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Authentication Guard middleware sync
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="h-8 w-8 text-brand-cyan animate-spin" />
        <span className="text-xs font-semibold">Validando credenciales de seguridad...</span>
      </div>
    );
  }

  const handleLogoutClick = async () => {
    await logout();
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: Compass },
    { label: "Mis Paquetes", href: "/packages", icon: PkgIcon },
    { label: "Rastreo", href: "/rastreo", icon: MapPin },
    { label: "Prealerta", href: "/prealerts", icon: FileText },
    { label: "Fulfillment", href: "/fulfillment", icon: Boxes }, // B2B Fulfillment
    { label: "Mi Casillero", href: "/mailbox", icon: Mail },
    { label: "Términos", href: "/terms", icon: ShieldAlert },     // Terms & Conditions Tab
    { label: "Notificaciones", href: "/notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative transition-colors duration-300 bg-[#0b0f19] text-white">
      
      {/* 1. DESKTOP SIDEBAR FIXED NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 p-6 space-y-8 justify-between border-r border-white/5 bg-[#090d16]">
        <div className="space-y-8">
          {/* Logo brand - Rendered as image logo.png */}
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="BreezeGo Logo" 
              className="h-16 w-auto object-contain transition-transform hover:scale-[1.02] duration-200" 
            />
          </Link>

          {/* User profile capsule card */}
          <div className="p-3.5 rounded-xl space-y-1.5 text-xs border bg-white/5 border-white/5">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 bg-brand-cyan/10 text-brand-cyan rounded-lg flex items-center justify-center font-bold font-heading text-[10px]">
                EM
              </div>
              <div className="truncate">
                <strong className="block font-bold truncate leading-tight text-white">{user.fullName}</strong>
                <span className="text-[9px] block tracking-wider font-mono text-slate-400">{user.suiteCode}</span>
              </div>
            </div>
          </div>

          {/* Links Nav */}
          <nav className="flex flex-col space-y-1 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-brand-cyan/10 text-brand-cyan font-bold border-l-2 border-brand-cyan"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout button */}
        <button
          onClick={handleLogoutClick}
          className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:text-brand-orange hover:bg-brand-orange/5 transition-all text-xs font-semibold text-left w-full border-t pt-4 text-slate-500 border-white/5"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* 2. MOBILE BOTTOM CAPSULE NAVIGATION BAR (Uber Eats / Mobile-first UX) */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 h-14 rounded-2xl flex items-center justify-around px-2 py-1 shadow-2xl glass-panel text-white">
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all ${
                isActive ? "text-brand-cyan font-bold scale-105" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[7px] mt-0.5 uppercase font-bold tracking-widest">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogoutClick}
          className="flex flex-col items-center justify-center p-1 rounded-xl text-slate-500 hover:text-brand-orange"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="text-[7px] mt-0.5 uppercase font-bold tracking-widest">Salir</span>
        </button>
      </nav>

      {/* 3. MAIN WORKSPACE CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col overflow-y-auto pb-24 md:pb-0 h-screen">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 border-b px-4 flex items-center justify-between shrink-0 border-white/5 bg-[#090d16]">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="BreezeGo Logo" 
              className="h-10 w-auto object-contain" 
            />
          </Link>
          <span className="text-[10px] font-mono font-bold text-brand-cyan bg-brand-cyan/15 px-2 py-0.5 rounded-lg">
            {user.suiteCode}
          </span>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
