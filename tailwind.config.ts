import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── dblzero dark tokens ──────────────────────────────────────────
        // Surfaces
        base:   "#0A0A0A", // page background — near-black
        panel:  "#111111", // cards, panels
        raise:  "#161616", // hover / slightly elevated

        // Text
        ink:    "#E4E4E4", // primary text — soft near-white, never #FFF
        dim:    "rgba(228,228,228,0.65)",  // secondary text / metadata
        faint:  "rgba(228,228,228,0.40)",  // annotations, decorative labels (low contrast — decorative only)
        ghost:  "rgba(255,255,255,0.15)",  // nearly invisible, dividers

        // Borders
        line:         "rgba(255,255,255,0.07)",  // hairline 1px
        "line-strong":"rgba(255,255,255,0.14)",  // active / hover borders

        // Accent — lime/chartreuse
        accent:        "#D4FF00",
        "accent-hover":"#BFE600",
        "accent-fill": "rgba(212,255,0,0.10)", // soft tint bg

        // Primary CTA — same lime, black text (bg pairs with dark text, not white)
        cta:        "#D4FF00",
        "cta-hover":"#BFE600",

        // Semantic — unchanged: already verified for white text on fill, independent of page bg
        done: "#15803D", // completed state (5.1:1 with white text)

        // (legacy aliases removed — all components now use canonical token names)
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        note:        "0 0 0 1px rgba(255,255,255,0.07)",
        "note-hover":"0 0 0 1px rgba(255,255,255,0.14), 0 4px 16px rgba(212,255,0,0.08)",
      },
      keyframes: {
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-2.5px)" },
        },
        "dot-float": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "50%":       { transform: "translateY(-3px)", opacity: "1" },
        },
        "zzz-rise": {
          "0%":   { transform: "translateY(0) scale(0.9)", opacity: "0" },
          "30%":  { opacity: "0.9" },
          "100%": { transform: "translateY(-10px) scale(1)", opacity: "0" },
        },
        blink: {
          "0%, 90%, 100%": { transform: "scaleY(1)" },
          "93%":            { transform: "scaleY(0.1)" },
          "96%":            { transform: "scaleY(1)" },
        },
        "cursor-blink": {
          "0%, 49%":   { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        bob:            "bob 3.2s ease-in-out infinite",
        "dot-float":    "dot-float 1.4s ease-in-out infinite",
        "zzz-rise":     "zzz-rise 2.4s ease-in-out infinite",
        blink:          "blink 5s ease-in-out infinite",
        "cursor-blink": "cursor-blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};

export default config;
