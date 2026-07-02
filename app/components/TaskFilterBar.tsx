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

// Vista de las tareas: lista (default) o tablero Kanban. Persistida en la URL.
export type ViewMode = "list" | "kanban";

export const DEFAULT_VIEW: ViewMode = "list";

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
const CHIP_INACTIVE = "border-line bg-surface text-muted hover:text-ink";

// Segmento del toggle List/Board: activo = relleno índigo; inactivo = ghost.
const SEG_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out";

function ListGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function BoardGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="9.5" y="4" width="5" height="11" rx="1" />
      <rect x="16" y="4" width="5" height="8" rx="1" />
    </svg>
  );
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
  view,
  onViewChange,
  active,
  onClear,
}: {
  selected: Set<Prioridad>;
  onTogglePrioridad: (p: Prioridad) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  keystonesOnly: boolean;
  onToggleKeystones: () => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
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

      {/* Bloque derecho: toggle de vista + orden (este último solo en lista). */}
      <div className="ml-auto flex items-center gap-3">
        {/* Toggle List / Board. Segmentos ghost; el activo se rellena en índigo. */}
        <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
          <button
            type="button"
            onClick={() => onViewChange("list")}
            aria-pressed={view === "list"}
            className={[SEG_BASE, view === "list" ? "bg-accent text-white" : "text-muted hover:text-ink"].join(" ")}
          >
            <ListGlyph />
            List
          </button>
          <button
            type="button"
            onClick={() => onViewChange("kanban")}
            aria-pressed={view === "kanban"}
            className={[SEG_BASE, view === "kanban" ? "bg-accent text-white" : "text-muted hover:text-ink"].join(" ")}
          >
            <BoardGlyph />
            Board
          </button>
        </div>

        {/* Orden: irrelevante en Kanban (las columnas tienen orden fijo), se oculta ahí. */}
        {view === "list" && (
          <div className="flex items-center gap-1.5">
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
        )}
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
