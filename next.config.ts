import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
      {
        source: "/tracker.html",
        destination: "/tracking",
        permanent: true,
      },
      {
        source: "/calculator.html",
        destination: "/calculator",
        permanent: true,
      },
      {
        source: "/signup.html",
        destination: "/signup",
        permanent: true,
      },
      {
        source: "/dashboard.html",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/prealert.html",
        destination: "/prealerts",
        permanent: true,
      },
      {
        source: "/packages.html",
        destination: "/packages",
        permanent: true,
      },
      {
        source: "/admin.html",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://i.imgur.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
