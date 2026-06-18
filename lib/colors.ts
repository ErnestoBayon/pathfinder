// Paleta de acentos de proyecto. Única fuente de verdad: la usan el modal de
// creación, el editor de color en las cards, el endpoint de proyectos y el store.

/** Los 6 colores seleccionables para un proyecto (el primero es el default). */
export const PROJECT_COLORS = [
  "#5B5BD6",
  "#0E9F6E",
  "#D97706",
  "#7C5CFC",
  "#E11D48",
  "#0891B2",
] as const;

/** Color de acento por defecto cuando un proyecto no tiene color (cards antiguas). */
export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

/** True si `color` es uno de los acentos válidos de la paleta. */
export function isValidProjectColor(color: string): boolean {
  return (PROJECT_COLORS as readonly string[]).includes(color);
}
