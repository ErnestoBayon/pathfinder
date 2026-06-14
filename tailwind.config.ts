import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidad "premium espacial" — color como luz sobre fondo oscuro.
        canvas: "#0a0a0a", // fondo base, casi negro
        surface: "#1a1a1c", // tarjetas
        line: "rgba(255,255,255,0.08)", // borde sutil de superficies
        ink: "#f5f5f7", // texto normal (blanco hueso)
        muted: "#86868b", // labels y metadata
        active: "#2997ff", // acento / CTA
        done: "#30d158", // tarea completada
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Elevación de sticky note (sutil sobre el fondo oscuro).
        note: "0 1px 2px rgba(0,0,0,0.4), 0 12px 28px -18px rgba(0,0,0,0.75)",
        "note-hover": "0 2px 4px rgba(0,0,0,0.45), 0 20px 40px -20px rgba(0,0,0,0.85)",
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
        // Parpadeo ocasional del personaje: abierto casi todo el ciclo, un cierre rápido.
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
