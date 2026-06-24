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
        // Design system: dark slate base with electric blue accent
        ink: {
          950: "#070B14",
          900: "#0D1220",
          800: "#141A2E",
          700: "#1C2440",
          600: "#243058",
        },
        signal: {
          DEFAULT: "#2D6BE4",
          light: "#4B85F0",
          dim: "#1A4FA8",
          glow: "rgba(45,107,228,0.25)",
        },
        glass: "rgba(255,255,255,0.04)",
        rim: "rgba(255,255,255,0.08)",
        active: "#22D3A5",   // teal-green for live/speaking states
        warn: "#F59E0B",
        danger: "#EF4444",
        neutral: {
          50: "#F8FAFC",
          200: "#E2E8F0",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        "signal": "0 0 20px rgba(45,107,228,0.3), 0 0 60px rgba(45,107,228,0.1)",
        "active": "0 0 20px rgba(34,211,165,0.3)",
        "panel": "0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow": "spin 3s linear infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "blink": "blink 1.2s step-start infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
      },
    },
  },
  plugins: [],
};
export default config;
