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
          DEFAULT: "#F26A21",
          600: "#D2551A",
        },
        ink: "#0F172A",
        muted: "#64748B",
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        heading: ["Sora", "Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
