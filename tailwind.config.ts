import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "rgba(255, 255, 255, 0.06)",
        input: "rgba(255, 255, 255, 0.04)",
        ring: "#46C7D2",
        background: "#0b0f19",
        foreground: "#f8fafc",
        primary: {
          DEFAULT: "#46C7D2",
          foreground: "#0b0f19",
        },
        secondary: {
          DEFAULT: "#0C8096",
          foreground: "#white",
        },
        muted: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          foreground: "#94a3b8",
        },
        accent: {
          DEFAULT: "#FC7C58",
          foreground: "#white",
        },
        card: {
          DEFAULT: "rgba(29, 42, 62, 0.55)",
          foreground: "#f8fafc",
        },
        brand: {
          cyan: "#46C7D2",
          teal: "#0C8096",
          orange: "#FC7C58",
          navy: "#1D2A3E",
          dark: "#0b0f19",
        }
      },
      borderRadius: {
        lg: "18px",
        md: "12px",
        sm: "8px",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Montserrat", "sans-serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
};
export default config;
