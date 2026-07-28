"use client";

import { PRIORIDAD_ORDEN } from "@/lib/types";
import type { Prioridad } from "@/lib/types";
import {
  KEYSTONE_COLOR,
  KEYSTONE_TEXT,
  KEYSTONE_TINT,
  PRIORIDAD_COLORS,
} from "@/lib/colors";

// Clave de ordenamiento (solo cliente). El default espeja el orden del store
// (prioridad alta→baja); las otras dos son vistas alternativas sobre lo ya cargado.
export type SortKey = "prioridad" | "deadline" | "created";

export const DEFAULT_SORT: SortKey = "prioridad";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "prioridad", label: "Priority (high→low)" },
  { value: "deadline", label: "Deadline (soonest)" },
  { value: "created", label: "Newest" },
];

// Base común de las chips ghost/outline. El color de identidad (punto/★) va en un
// glifo aparte; el relleno tintado (style) es lo que señala activo/inactivo — nunca
// dependemos del color solo para el estado.
const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out";
const CHIP_INACTIVE = "border-line bg-panel text-dim hover:text-ink";

// Barra de filtro/orden 100% cliente. Presentacional: no conoce la URL; recibe
// el estado ya derivado y notifica cambios hacia arriba (el caller escribe la URL).
// El orden es opcional: la vista Board no lo usa (columnas con orden fijo), así que
// omitir `sort`/`onSortChange` esconde el dropdown de orden.
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
  sort?: SortKey;
  onSortChange?: (s: SortKey) => void;
  keystonesOnly: boolean;
  onToggleKeystones: () => void;
  active: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Pills de prioridad: una por valor real de `prioridad`, multi-select.
          Punto = identidad (color del badge); relleno tintado = activo. */}
      {PRIORIDAD_ORDEN.map((p) => {
        const on = selected.has(p);
        const c = PRIORIDAD_COLORS[p];
        return (
          <button
            key={p}
            type="button"
            onClick={() => onTogglePrioridad(p)}
            aria-pressed={on}
            className={[CHIP_BASE, on ? "" : CHIP_INACTIVE].join(" ")}
            style={on ? { backgroundColor: c.tint, borderColor: c.dot, color: c.textOn } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: c.dot }}
              aria-hidden
            />
            {p}
          </button>
        );
      })}

      {/* Toggle de keystones: solo tareas con es_clave = true. ★ violeta = identidad. */}
      <button
        type="button"
        onClick={onToggleKeystones}
        aria-pressed={keystonesOnly}
        className={[CHIP_BASE, keystonesOnly ? "" : CHIP_INACTIVE].join(" ")}
        style={
          keystonesOnly
            ? { backgroundColor: KEYSTONE_TINT, borderColor: KEYSTONE_COLOR, color: KEYSTONE_TEXT }
            : undefined
        }
      >
        <span style={{ color: KEYSTONE_COLOR }} aria-hidden>
          ★
        </span>
        Keystones
      </button>

      {/* Orden: empujado a la derecha. Solo en la lista (la vista Board lo omite). */}
      {onSortChange && (
        <div className="ml-auto flex items-center gap-1.5">
          <label htmlFor="task-sort" className="text-xs text-dim">
            Sort
          </label>
          <select
            id="task-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            aria-label="Sort tasks"
            className="cursor-pointer rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-ink outline-none transition-colors duration-200 ease-out hover:border-accent focus:border-accent"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sin dropdown de orden (Board), el "Clear" necesita su propio empuje a la derecha. */}
      {active && (
        <button
          type="button"
          onClick={onClear}
          className={[
            "text-xs font-medium text-dim underline-offset-2 transition-colors duration-200 ease-out hover:text-accent hover:underline",
            onSortChange ? "" : "ml-auto",
          ].join(" ")}
        >
          Clear
        </button>
      )}
    </div>
  );
}
