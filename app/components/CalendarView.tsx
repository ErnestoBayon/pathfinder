"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Prioridad } from "@/lib/types";

// Tarea aplanada para el calendario (datos ya serializables desde el server).
export interface CalendarTask {
  id: string;
  title: string;
  priority: Prioridad;
  projectId: string;
  projectName: string;
  date: string; // YYYY-MM-DD
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

// Chip por prioridad (light, vibrante con ring).
const CHIP_STYLE: Record<Prioridad, string> = {
  alta: "bg-red-50 text-red-600 ring-1 ring-red-200",
  media: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
  baja: "bg-gray-50 text-gray-500 ring-1 ring-gray-200",
};
const CHIP_FALLBACK = "bg-gray-50 text-gray-500 ring-1 ring-gray-200";

type PriorityFilter = Prioridad | "todas";

// Pills del filtro de prioridad: activo = fondo sólido del color; inactivo = borde del color.
const PRIORITY_FILTERS: { key: PriorityFilter; label: string; active: string; inactive: string }[] = [
  { key: "todas", label: "Todas", active: "bg-gray-900 text-white", inactive: "border border-gray-200 text-gray-600 hover:bg-gray-50" },
  { key: "alta", label: "Alta", active: "bg-red-500 text-white", inactive: "border border-red-300 text-red-600 hover:bg-red-50" },
  { key: "media", label: "Media", active: "bg-amber-500 text-white", inactive: "border border-amber-300 text-amber-600 hover:bg-amber-50" },
  { key: "baja", label: "Baja", active: "bg-gray-400 text-white", inactive: "border border-gray-300 text-gray-500 hover:bg-gray-50" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function truncate(s: string) {
  return s.length > 20 ? `${s.slice(0, 20)}…` : s;
}

export default function CalendarView({
  tasksByDate,
}: {
  tasksByDate: Record<string, CalendarTask[]>;
}) {
  const today = useMemo(() => new Date(), []);
  const todayStr = ymd(today);
  const [view, setView] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));

  // Filtros (client-side, sin refetch).
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("todas");
  const [projectFilter, setProjectFilter] = useState<string>("todos");

  // Celdas del grid (semana inicia lunes), con relleno de meses adyacentes.
  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const lead = (first.getDay() + 6) % 7; // 0 = lunes
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(view.year, view.month, 1 - lead + i);
      return { date: d, str: ymd(d), inMonth: d.getMonth() === view.month };
    });
  }, [view]);

  const monthPrefix = `${view.year}-${pad(view.month + 1)}`;

  // Proyectos únicos con tareas en el mes visible (para el filtro de proyecto).
  const monthProjects = useMemo(() => {
    const seen = new Map<string, string>();
    for (const [date, list] of Object.entries(tasksByDate)) {
      if (!date.startsWith(monthPrefix)) continue;
      for (const t of list) if (!seen.has(t.projectId)) seen.set(t.projectId, t.projectName);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [tasksByDate, monthPrefix]);
  const showProjectFilter = monthProjects.length > 1;

  // Si el proyecto filtrado ya no tiene tareas en el mes visible, vuelve a "todos".
  useEffect(() => {
    if (projectFilter !== "todos" && !monthProjects.some((p) => p.id === projectFilter)) {
      setProjectFilter("todos");
    }
  }, [monthProjects, projectFilter]);

  // Tareas de un día tras aplicar ambos filtros.
  function tasksFor(dateStr: string): CalendarTask[] {
    return (tasksByDate[dateStr] ?? []).filter(
      (t) =>
        (priorityFilter === "todas" || t.priority === priorityFilter) &&
        (projectFilter === "todos" || t.projectId === projectFilter),
    );
  }

  const hasVisibleTasks = cells.some((c) => tasksFor(c.str).length > 0);

  function prevMonth() {
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  }
  function nextMonth() {
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  }
  function goToday() {
    setView({ year: today.getFullYear(), month: today.getMonth() });
  }

  const navBtn =
    "flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors duration-200 ease-out hover:bg-gray-100";

  return (
    <div>
      {/* Header: título · filtros · navegación */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {MESES[view.month]} {view.year}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por prioridad */}
          <div className="flex items-center gap-1">
            {PRIORITY_FILTERS.map((f) => {
              const active = priorityFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setPriorityFilter(f.key)}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out",
                    active ? f.active : f.inactive,
                  ].join(" ")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Filtro por proyecto (solo si hay más de uno con tareas este mes) */}
          {showProjectFilter && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filtrar por proyecto"
              className="cursor-pointer rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 outline-none transition-colors duration-200 ease-out hover:bg-gray-50"
            >
              <option value="todos">Todos los proyectos</option>
              {monthProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={prevMonth} aria-label="Mes anterior" className={navBtn}>
            ‹
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition-colors duration-200 ease-out hover:bg-gray-50"
          >
            Hoy
          </button>
          <button type="button" onClick={nextMonth} aria-label="Mes siguiente" className={navBtn}>
            ›
          </button>
        </div>
      </div>

      {!hasVisibleTasks && (
        <p className="mb-4 text-center text-sm text-gray-500">No hay tareas con deadline este mes</p>
      )}

      {/* Contenedor del grid */}
      <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
        {/* Fila de días de la semana */}
        <div className="grid grid-cols-7 gap-2 pb-2">
          {DIAS.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Grid del mes */}
        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell) => {
            const isToday = cell.str === todayStr;
            const dayTasks = tasksFor(cell.str);
            const showAll = dayTasks.length <= 3;
            const visible = showAll ? dayTasks : dayTasks.slice(0, 2);
            const extra = showAll ? 0 : dayTasks.length - 2;

            return (
              <div
                key={cell.str}
                className={[
                  "flex min-h-[100px] flex-col gap-1 rounded-lg border border-gray-100 p-1.5",
                  isToday ? "bg-blue-50/60" : "bg-white",
                ].join(" ")}
              >
                {/* Número del día, arriba a la derecha */}
                <div className="flex justify-end">
                  {isToday ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                      {cell.date.getDate()}
                    </span>
                  ) : (
                    <span className={["text-xs", cell.inMonth ? "text-gray-500" : "text-gray-300"].join(" ")}>
                      {cell.date.getDate()}
                    </span>
                  )}
                </div>

                {/* Chips de tareas */}
                <div className="flex flex-col gap-0.5">
                  {visible.map((t) => (
                    <Link key={t.id} href={`/proyecto/${t.projectId}`} className="group/chip relative block">
                      <span
                        className={[
                          "block overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight transition-transform duration-100 hover:scale-[1.02]",
                          CHIP_STYLE[t.priority] ?? CHIP_FALLBACK,
                        ].join(" ")}
                      >
                        {truncate(t.title)}
                      </span>
                      {/* Tooltip: título completo + proyecto */}
                      <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-max max-w-[220px] rounded-xl bg-gray-900/95 px-2.5 py-1.5 text-xs font-normal leading-snug text-white shadow-xl backdrop-blur-sm group-hover/chip:block">
                        {t.title}
                        <span className="mt-0.5 block text-[10px] font-medium text-blue-400">{t.projectName}</span>
                      </span>
                    </Link>
                  ))}
                  {extra > 0 && (
                    <span className="px-1.5 text-[11px] font-medium text-gray-500">+{extra} más</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
