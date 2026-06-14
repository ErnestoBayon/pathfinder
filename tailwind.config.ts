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
        wire: "rgba(255,255,255,0.15)", // conectores del mapa
        ink: "#f5f5f7", // texto normal (blanco hueso)
        muted: "#86868b", // labels y metadata
        active: "#2997ff", // nivel activo / CTA
        done: "#30d158", // completado
        spark: "#ffd60a", // XP, ámbar luminoso
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Glow del nivel activo (la luz, no la pintura).
        glow: "0 0 0 1px rgba(41,151,255,0.6), 0 0 24px 2px rgba(41,151,255,0.35)",
        // Glow de XP ámbar.
        ember: "0 0 12px rgba(255,214,10,0.55)",
        // Elevación de sticky note (sutil sobre el fondo oscuro).
        note: "0 1px 2px rgba(0,0,0,0.4), 0 12px 28px -18px rgba(0,0,0,0.75)",
        "note-hover": "0 2px 4px rgba(0,0,0,0.45), 0 20px 40px -20px rgba(0,0,0,0.85)",
      },
      keyframes: {
        "check-pop": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "60%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "xp-float": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-34px)", opacity: "0" },
        },
        // Celebración: glow azul-violeta que se expande y se desvanece (transform/opacity).
        celebrate: {
          "0%": { transform: "scale(0.6)", opacity: "0.85" },
          "100%": { transform: "scale(1.9)", opacity: "0" },
        },
        // Animación ambiental permitida solo para los personajes (muy sutil).
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
        "check-pop": "check-pop 250ms ease-out",
        "xp-float": "xp-float 300ms ease-out forwards",
        celebrate: "celebrate 280ms ease-out forwards",
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
