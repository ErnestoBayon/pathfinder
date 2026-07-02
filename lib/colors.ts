// Paleta de acentos de proyecto. Única fuente de verdad: la usan el modal de
// creación, el editor de color en las cards, el endpoint de proyectos y el store.

import type { Prioridad } from "./types";

/** Los 6 colores seleccionables para un proyecto (el primero es el default). */
export const PROJECT_COLORS = [
  "#5B5BD6",
  "#0E9F6E",
  "#D97706",
  "#EC4899",
  "#E11D48",
  "#0891B2",
] as const;

/** Color de acento por defecto cuando un proyecto no tiene color (cards antiguas). */
export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

/** True si `color` es uno de los acentos válidos de la paleta. */
export function isValidProjectColor(color: string): boolean {
  return (PROJECT_COLORS as readonly string[]).includes(color);
}

// ── Prioridad ───────────────────────────────────────────────────────────────
// Única fuente de verdad para los colores de High/Medium/Low. La consumen el
// badge/`select` de prioridad en la lista de tareas y las pills de filtro.
export interface PriorityColor {
  /** Color de identidad (vívido): punto de la pill y color del badge. */
  dot: string;
  /** Relleno tenue sobre blanco: fondo del badge y fill de la pill activa. */
  tint: string;
  /** Tono oscuro del mismo matiz, legible (WCAG AA) sobre `tint` en texto pequeño. */
  textOn: string;
}

export const PRIORIDAD_COLORS: Record<Prioridad, PriorityColor> = {
  High: { dot: "#DC2626", tint: "rgba(220,38,38,0.12)", textOn: "#991B1B" },
  Medium: { dot: "#D97706", tint: "rgba(217,119,6,0.12)", textOn: "#92400E" },
  // Slate/blue-gray a propósito: el verde queda reservado para tareas completadas.
  Low: { dot: "#64748B", tint: "rgba(100,116,139,0.14)", textOn: "#334155" },
};

// ── Subtareas ─────────────────────────────────────────────────────────────────
// Color del pill de subtareas según el progreso: índigo (neutral, 0 hechas),
// ámbar (en progreso) o verde (todas completas). Compartido por la fila de la
// lista y la card del tablero Kanban.
export function subtaskPillClasses(total: number, completed: number): string {
  if (completed >= total) return "border-green-200 bg-green-50 text-green-700";
  if (completed > 0) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-indigo-200 bg-indigo-50 text-indigo-600";
}

// ── Keystone (tarea clave) ────────────────────────────────────────────────────
/** Violeta del ⭐ de tareas clave. Identidad única del icono y de la pill de keystones. */
export const KEYSTONE_COLOR = "#7C3AED";
/** Relleno tenue para la pill de keystones activa. */
export const KEYSTONE_TINT = "rgba(124,58,237,0.12)";
/** Violeta oscuro legible (WCAG AA) sobre `KEYSTONE_TINT` en texto pequeño. */
export const KEYSTONE_TEXT = "#6D28D9";
