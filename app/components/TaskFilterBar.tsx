"use client";

import { PRIORIDAD_ORDEN } from "@/lib/types";
import type { Prioridad } from "@/lib/types";

// Clave de ordenamiento (solo cliente). El default espeja el orden del store
// (prioridad alta→baja); las otras dos son vistas alternativas sobre lo ya cargado.
export type SortKey = "prioridad" | "deadline" | "created";

export const DEFAULT_SORT: SortKey = "prioridad";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "prioridad", label: "Priority (high→low)" },
  { value: "deadline", label: "Deadline (soonest)" },
  { value: "created", label: "Newest" },
];

// Chip ghost/outline: outline en reposo, relleno índigo tenue (accent) al activarse.
function chipClasses(on: boolean): string {
  return [
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out",
    on
      ? "border-accent bg-accent/10 text-accent"
      : "border-line bg-surface text-muted hover:border-accent hover:text-ink",
  ].join(" ");
}

// Barra de filtro/orden 100% cliente. Presentacional: no conoce la URL; recibe
// el estado ya derivado y notifica cambios hacia arriba (TaskList escribe la URL).
export default function TaskFilterBar({
  selected,
  onTogglePrioridad,
  sort,
  onSortChange,
  keystonesOnly,
  onToggleKeystones,
  active,
  onClear,
}: {
  selected: Set<Prioridad>;
  onTogglePrioridad: (p: Prioridad) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  keystonesOnly: boolean;
  onToggleKeystones: () => void;
  active: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Pills de prioridad: una por valor real de `prioridad`, multi-select. */}
      {PRIORIDAD_ORDEN.map((p) => {
        const on = selected.has(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onTogglePrioridad(p)}
            aria-pressed={on}
            className={chipClasses(on)}
          >
            {p}
          </button>
        );
      })}

      {/* Toggle de keystones: solo tareas con es_clave = true. */}
      <button
        type="button"
        onClick={onToggleKeystones}
        aria-pressed={keystonesOnly}
        className={chipClasses(keystonesOnly)}
      >
        <span aria-hidden>★</span> Keystones
      </button>

      {/* Orden: empujado a la derecha. */}
      <div className="ml-auto flex items-center gap-1.5">
        <label htmlFor="task-sort" className="text-xs text-muted">
          Sort
        </label>
        <select
          id="task-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          aria-label="Sort tasks"
          className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink outline-none transition-colors duration-200 ease-out hover:border-accent focus:border-accent"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {active && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-muted underline-offset-2 transition-colors duration-200 ease-out hover:text-accent hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
