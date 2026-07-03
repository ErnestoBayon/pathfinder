"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Prioridad } from "@/lib/types";
import { PRIORIDAD_COLORS } from "@/lib/colors";

// Tarea aplanada para el calendario (datos ya serializables desde el server).
export interface CalendarTask {
  id: string;
  title: string;
  priority: Prioridad;
  projectId: string;
  projectName: string;
  projectColor: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

const MESES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DIAS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type PriorityFilter = Prioridad | "all";

// Pills del filtro de prioridad: activo = fondo sólido del color; inactivo = borde del color.
const PRIORITY_FILTERS: { key: PriorityFilter; label: string; active: string; inactive: string }[] = [
  { key: "all", label: "All", active: "bg-gray-900 text-white", inactive: "border border-gray-200 text-gray-600 hover:bg-gray-50" },
  { key: "High", label: "High", active: "bg-red-500 text-white", inactive: "border border-red-300 text-red-600 hover:bg-red-50" },
  { key: "Medium", label: "Medium", active: "bg-amber-500 text-white", inactive: "border border-amber-300 text-amber-600 hover:bg-amber-50" },
  { key: "Low", label: "Low", active: "bg-gray-400 text-white", inactive: "border border-gray-300 text-gray-500 hover:bg-gray-50" },
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
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  // Las tareas completadas se ven (atenuadas) por defecto; este toggle las oculta.
  const [showCompleted, setShowCompleted] = useState(true);
  // Popover del filtro de proyecto.
  const [projectOpen, setProjectOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectOpen) return;
    function onOutside(e: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node))
        setProjectOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setProjectOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [projectOpen]);

  // Proyectos únicos con al menos una tarea con deadline (cualquier mes).
  // Derivado del conjunto completo para que los chips sean estables al navegar meses
  // y para que deep-links ?project=X siempre rendericen el chip activo.
  const allProjects = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>();
    for (const list of Object.values(tasksByDate)) {
      for (const t of list) {
        if (!seen.has(t.projectId))
          seen.set(t.projectId, { name: t.projectName, color: t.projectColor });
      }
    }
    return Array.from(seen, ([id, { name, color }]) => ({ id, name, color }));
  }, [tasksByDate]);
  const showProjectFilter = allProjects.length > 1;

  // Filtro de proyecto via URL param ?project={id} (ausente = todos).
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const rawProject = searchParams.get("project") ?? "all";
  // Si el param referencia un id desconocido, lo ignoramos gracefully.
  const projectFilter =
    rawProject === "all" || allProjects.some((p) => p.id === rawProject)
      ? rawProject
      : "all";

  const toggleProject = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "all" || id === projectFilter) {
        params.delete("project");
      } else {
        params.set("project", id);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router, projectFilter],
  );

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

  // Tareas de un día tras aplicar ambos filtros.
  function tasksFor(dateStr: string): CalendarTask[] {
    return (tasksByDate[dateStr] ?? []).filter(
      (t) =>
        (priorityFilter === "all" || t.priority === priorityFilter) &&
        (projectFilter === "all" || t.projectId === projectFilter) &&
        (showCompleted || !t.completed),
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

          {/* Filtro por proyecto: dropdown, estado en ?project= */}
          {showProjectFilter && (() => {
            const activeProject = projectFilter !== "all"
              ? allProjects.find((p) => p.id === projectFilter)
              : null;
            return (
              <div ref={projectDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProjectOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors duration-200 ease-out hover:bg-gray-50"
                >
                  {activeProject && (
                    <span
                      style={{ backgroundColor: activeProject.color }}
                      className="h-2 w-2 shrink-0 rounded-full"
                    />
                  )}
                  <span>{activeProject ? activeProject.name : "All projects"}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-400">
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {projectOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                    {/* All projects */}
                    <button
                      type="button"
                      onClick={() => { toggleProject("all"); setProjectOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50"
                    >
                      <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                        {projectFilter === "all" && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className={projectFilter === "all" ? "font-semibold text-gray-900" : "font-medium text-gray-600"}>
                        All projects
                      </span>
                    </button>

                    {allProjects.map((p) => {
                      const active = projectFilter === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { toggleProject(p.id); setProjectOpen(false); }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50"
                        >
                          <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                            {active && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span
                            style={{ backgroundColor: p.color }}
                            className="h-2 w-2 shrink-0 rounded-full"
                          />
                          <span className={active ? "font-semibold text-gray-900" : "font-medium text-gray-600"}>
                            {p.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Mostrar / ocultar tareas completadas (visibles por defecto) */}
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            aria-pressed={showCompleted}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out",
              showCompleted
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50",
            ].join(" ")}
          >
            {showCompleted ? "Hide completed" : "Show completed"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={prevMonth} aria-label="Previous month" className={navBtn}>
            ‹
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition-colors duration-200 ease-out hover:bg-gray-50"
          >
            Today
          </button>
          <button type="button" onClick={nextMonth} aria-label="Next month" className={navBtn}>
            ›
          </button>
        </div>
      </div>

      {!hasVisibleTasks && (
        <p className="mb-4 text-center text-sm text-gray-500">No tasks with a deadline this month</p>
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
                  "flex min-h-[120px] flex-col gap-1 rounded-lg border border-gray-100 p-2",
                  isToday ? "bg-red-50/40" : "bg-white",
                ].join(" ")}
              >
                {/* Número del día, arriba a la derecha */}
                <div className="flex justify-end">
                  {isToday ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-sm font-semibold text-white">
                      {cell.date.getDate()}
                    </span>
                  ) : (
                    <span className={["text-sm", cell.inMonth ? "text-gray-500" : "text-gray-300"].join(" ")}>
                      {cell.date.getDate()}
                    </span>
                  )}
                </div>

                {/* Chips de tareas */}
                <div className="flex flex-col gap-0.5">
                  {visible.map((t) => (
                    <Link key={t.id} href={`/proyecto/${t.projectId}`} className="group/chip relative block">
                      <span
                        style={{
                          borderLeft: `3px solid ${t.projectColor}`,
                          backgroundColor: `${t.projectColor}14`,
                        }}
                        className={[
                          "flex items-center gap-1.5 overflow-hidden rounded px-2 py-0.5 text-[11px] font-medium leading-tight text-gray-800 transition-transform duration-100 hover:scale-[1.02]",
                          t.completed ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <span
                          style={{ backgroundColor: PRIORIDAD_COLORS[t.priority]?.dot ?? "#64748B" }}
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                        />
                        <span className={["min-w-0 truncate", t.completed ? "line-through" : ""].join(" ")}>
                          {truncate(t.title)}
                        </span>
                      </span>
                      {/* Tooltip: título completo + proyecto */}
                      <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-max max-w-[220px] rounded-xl bg-gray-900/95 px-2.5 py-1.5 text-xs font-normal leading-snug text-white shadow-xl backdrop-blur-sm group-hover/chip:block">
                        {t.title}
                        <span className="mt-0.5 block text-[10px] font-medium text-blue-400">{t.projectName}</span>
                      </span>
                    </Link>
                  ))}
                  {extra > 0 && (
                    <span className="px-1.5 text-[11px] font-medium text-gray-500">+{extra} more</span>
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
