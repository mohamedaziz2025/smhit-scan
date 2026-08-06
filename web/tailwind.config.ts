import type { Config } from "tailwindcss";

/**
 * Design system SMHIT — voir §12 du cahier des charges.
 * Palette orange SMHIT sur base neutre claire, coins arrondis 16px.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          light: "#FFF1E6",
          DEFAULT: "#F26A21",
          600: "#D2551A",
        },
        ink: "#0F172A",
        muted: "#64748B",
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        border: "#E7EAF0",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Sora", "sans-serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 24px -8px rgb(15 23 42 / 0.06), 0 2px 4px rgb(15 23 42 / 0.04)",
        brand: "0 8px 20px -4px rgb(242 106 33 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
