// Formateo de fechas del dominio (deadlines). Compartido por la lista y el tablero
// Kanban para no duplicar el parseo. Trabaja sobre el string ISO para evitar
// corrimientos de zona horaria al construir un Date.

const MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-06-15T00:00:00+00" → "15 Jun".
export function formatDeadline(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${parseInt(m[3], 10)} ${MESES[parseInt(m[2], 10) - 1]}`;
}
