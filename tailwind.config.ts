import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── dblzero light tokens ─────────────────────────────────────────
        // Surfaces
        base:   "#F4F4F2", // page background — warm light gray
        panel:  "#FFFFFF", // cards, panels
        raise:  "#FAFAF8", // hover / slightly elevated

        // Text
        ink:    "#1F1F1D", // primary text — soft near-black, never #000
        dim:    "#6E6E68", // secondary text / metadata
        faint:  "#9A9A93", // annotations, decorative labels (low contrast — decorative only)
        ghost:  "#C4C4BC", // nearly invisible, dividers

        // Borders
        line:         "rgba(0,0,0,0.07)",  // hairline 1px
        "line-strong":"rgba(0,0,0,0.12)",  // active / hover borders

        // Accent — radar green
        // #178A43 for text/icons on white/light bg (≈4.4:1 on #F4F4F2, 4.7:1 on #FFF)
        accent:        "#178A43",
        "accent-hover":"#14773A",
        "accent-fill": "rgba(23,138,67,0.10)", // soft tint bg

        // Primary CTA — brighter green, white text
        // Note: white on #1FA855 ≈ 3.1:1. Use at ≥16px bold or swap to #15803D for AA.
        cta:        "#1FA855",
        "cta-hover":"#1A9249",

        // Semantic
        done: "#15803D", // completed state (5.1:1 on white)

        // (legacy aliases removed — all components now use canonical token names)
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        note:        "0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.06)",
        "note-hover":"0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.09)",
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
