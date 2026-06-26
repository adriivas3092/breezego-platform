import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Casillero Costa Rica | Traer Compras de USA a Costa Rica | BreezeGo",
  description: "¿Cómo traer compras de USA a Costa Rica? BreezeGo es tu casillero gratis en Miami para envíos rápidos y aduanas automáticas sin tarifas ocultas. ¡Regístrate hoy!",
  openGraph: {
    title: "Casillero Costa Rica | Traer Compras de USA a Costa Rica | BreezeGo",
    description: "¿Cómo traer compras de USA a Costa Rica? BreezeGo es tu casillero gratis en Miami para envíos rápidos y aduanas automáticas sin tarifas ocultas.",
    images: ["https://breezego.net/logo.png"],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-body">
        <AuthProvider>
          {children}
        </AuthProvider>
        <SpeedInsights />
        <Script src="/cookie-consent.js" strategy="lazyOnload" />
        <Script src="/help-assistant.js" strategy="lazyOnload" />
        
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18229770397"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18229770397');
          `}
        </Script>
      </body>
    </html>
  );
}

