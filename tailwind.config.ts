import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Estructura: neutros limpios tipo Linear
        canvas: "#fbfbfa",
        card: "#ffffff",
        line: "#ebebe9",
        ink: "#1c1c1a",
        muted: "#6b6b66",
        // Acento por estado
        done: "#16a34a",
        active: "#2563eb",
        locked: "#9ca3af",
        // Celebración / feedback
        spark: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Sombra sutil, nunca pesada
        card: "0 1px 2px rgba(0, 0, 0, 0.04)",
      },
      keyframes: {
        "check-pop": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "xp-float": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-28px)", opacity: "0" },
        },
        "celebrate": {
          "0%": { transform: "scale(0.96)", opacity: "0.4" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "check-pop": "check-pop 250ms ease-out",
        "xp-float": "xp-float 300ms ease-out forwards",
        "celebrate": "celebrate 250ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
