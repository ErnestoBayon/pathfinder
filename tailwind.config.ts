import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode — limpio estilo Linear / Notion.
        canvas: "#F8F9FA", // fondo de página, gris muy claro
        surface: "#FFFFFF", // cards
        line: "#E5E7EB", // bordes sutiles
        ink: "#111827", // texto principal (gris muy oscuro)
        muted: "#6B7280", // texto secundario / metadata
        accent: "#4F46E5", // índigo (CTA / acentos)
        "accent-hover": "#4338CA", // índigo más oscuro para hover
        done: "#16A34A", // tarea completada
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Sombras suaves de sticky note sobre fondo claro.
        note: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)",
        "note-hover": "0 4px 12px rgba(16,24,40,0.10), 0 2px 4px rgba(16,24,40,0.06)",
      },
      keyframes: {
        // Animaciones ambientales permitidas solo para los personajes (muy sutiles).
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2.5px)" },
        },
        "dot-float": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "50%": { transform: "translateY(-3px)", opacity: "1" },
        },
        "zzz-rise": {
          "0%": { transform: "translateY(0) scale(0.9)", opacity: "0" },
          "30%": { opacity: "0.9" },
          "100%": { transform: "translateY(-10px) scale(1)", opacity: "0" },
        },
        blink: {
          "0%, 90%, 100%": { transform: "scaleY(1)" },
          "93%": { transform: "scaleY(0.1)" },
          "96%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        bob: "bob 3.2s ease-in-out infinite",
        "dot-float": "dot-float 1.4s ease-in-out infinite",
        "zzz-rise": "zzz-rise 2.4s ease-in-out infinite",
        blink: "blink 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
