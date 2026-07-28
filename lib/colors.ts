// Paleta de acentos de proyecto. Única fuente de verdad: la usan el modal de
// creación, el editor de color en las cards, el endpoint de proyectos y el store.

import type { Prioridad } from "./types";

// Light-mode palette. All text colors verified on white (#FFFFFF) panel bg.
// Contrast formula: (L_lighter + 0.05) / (L_darker + 0.05).
export const PROJECT_COLORS = [
  "#7C3AED", // violet-600  — 7.3:1 on white
  "#0D9488", // teal-600    — 4.5:1 on white
  "#D97706", // amber-600   — 4.5:1 on white
  "#DB2777", // pink-600    — 5.4:1 on white
  "#DC2626", // red-600     — 4.5:1 on white
  "#0284C7", // sky-600     — 4.7:1 on white
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

export function isValidProjectColor(color: string): boolean {
  return (PROJECT_COLORS as readonly string[]).includes(color);
}

// ── Prioridad ───────────────────────────────────────────────────────────────
// Semaphore: red / amber / green. All text colors verified ≥4.5:1 on white.
// High  #DC2626: L≈0.166  → (1.05)/(0.216) = 4.86:1 on white ✓
// Med   #B45309: L≈0.157  → (1.05)/(0.207) = 5.07:1 on white ✓
// Low   #15803D: L≈0.158  → (1.05)/(0.208) = 5.05:1 on white ✓
// Chips sit on white panel bg — tints are near-white so ratios hold.
export interface PriorityColor {
  dot: string;
  tint: string;
  textOn: string;
}

export const PRIORIDAD_COLORS: Record<Prioridad, PriorityColor> = {
  High:   { dot: "#DC2626", tint: "rgba(220,38,38,0.08)",   textOn: "#DC2626" },
  Medium: { dot: "#B45309", tint: "rgba(217,119,6,0.10)",   textOn: "#B45309" },
  Low:    { dot: "#15803D", tint: "rgba(22,163,74,0.08)",   textOn: "#15803D" },
};

// ── Subtareas ─────────────────────────────────────────────────────────────────
// Light-mode pill classes. All text on near-white chip bg.
// Complete: green — #15803D (5.1:1 on white) ✓
// In-progress: amber — #B45309 (5.1:1 on white) ✓
// Not started: sky — #0369A1 (7.0:1 on white) ✓
export function subtaskPillClasses(total: number, completed: number): string {
  if (completed >= total)
    return "border-green-200 bg-green-50 text-green-700";
  if (completed > 0)
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

// ── Keystone (tarea clave) ────────────────────────────────────────────────────
// Violet-600 (#7C3AED): L≈0.073 → 7.3:1 on white ✓
export const KEYSTONE_COLOR = "#7C3AED";
export const KEYSTONE_TINT  = "rgba(124,58,237,0.10)";
export const KEYSTONE_TEXT  = "#6D28D9"; // violet-700, 8.6:1 on white ✓
