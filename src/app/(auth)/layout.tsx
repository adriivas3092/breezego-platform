import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-teal/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header with enlarged logo */}
      <header className="h-24 flex items-center px-6 md:px-12 z-10 shrink-0">
        <Link href="/" className="flex items-center space-x-2">
          <img 
            src="/logo.png" 
            alt="BreezeGo Logo" 
            className="h-16 w-auto object-contain transition-transform hover:scale-[1.02] duration-200" 
          />
        </Link>
      </header>

      {/* Main Form Area */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-[450px]">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 flex items-center justify-center text-slate-600 text-[10px] z-10 shrink-0">
        &copy; 2026 BreezeGo Costa Rica S.A. Todos los derechos reservados.
      </footer>
    </div>
  );
}
