"use client";

import { useMemo, useState } from "react";
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

// Color del chip según prioridad (light mode).
const CHIP_STYLE: Record<Prioridad, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baja: "bg-gray-100 text-gray-600",
};
const CHIP_FALLBACK = "bg-gray-100 text-gray-600";

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
  const hasTasksThisMonth = Object.keys(tasksByDate).some(
    (d) => d.startsWith(monthPrefix) && tasksByDate[d].length > 0,
  );

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
    "flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors duration-200 ease-out hover:bg-canvas hover:text-ink";

  return (
    <div>
      {/* Header: mes/año + navegación */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-ink">
          {MESES[view.month]} {view.year}
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevMonth} aria-label="Mes anterior" className={navBtn}>
            ‹
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-200 ease-out hover:bg-canvas hover:text-ink"
          >
            Hoy
          </button>
          <button type="button" onClick={nextMonth} aria-label="Mes siguiente" className={navBtn}>
            ›
          </button>
        </div>
      </div>

      {!hasTasksThisMonth && (
        <p className="mb-4 text-center text-sm text-muted">No hay tareas con deadline este mes</p>
      )}

      {/* Fila de días de la semana */}
      <div className="grid grid-cols-7">
        {DIAS.map((d, i) => (
          <div key={i} className="pb-2 text-center text-xs font-medium text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* Grid del mes: gap-px sobre bg-line crea los bordes finos entre celdas. */}
      <div className="grid grid-cols-7 gap-px rounded-lg border border-line bg-line">
        {cells.map((cell) => {
          const isToday = cell.str === todayStr;
          const dayTasks = tasksByDate[cell.str] ?? [];
          const showAll = dayTasks.length <= 3;
          const visible = showAll ? dayTasks : dayTasks.slice(0, 2);
          const extra = showAll ? 0 : dayTasks.length - 2;

          return (
            <div
              key={cell.str}
              className={[
                "flex min-h-[104px] flex-col gap-1 p-1.5",
                isToday ? "bg-blue-50" : "bg-surface",
              ].join(" ")}
            >
              {/* Número del día, arriba a la derecha */}
              <div className="flex justify-end">
                {isToday ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                    {cell.date.getDate()}
                  </span>
                ) : (
                  <span className={["text-xs", cell.inMonth ? "text-muted" : "text-gray-300"].join(" ")}>
                    {cell.date.getDate()}
                  </span>
                )}
              </div>

              {/* Chips de tareas */}
              <div className="flex flex-col gap-0.5">
                {visible.map((t) => (
                  <Link
                    key={t.id}
                    href={`/proyecto/${t.projectId}`}
                    className="group/chip relative block"
                  >
                    <span
                      className={[
                        "block overflow-hidden text-ellipsis whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight",
                        CHIP_STYLE[t.priority] ?? CHIP_FALLBACK,
                      ].join(" ")}
                    >
                      {truncate(t.title)}
                    </span>
                    {/* Tooltip: título completo + proyecto */}
                    <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-max max-w-[220px] rounded-md bg-ink px-2 py-1 text-xs font-normal leading-snug text-white shadow-note group-hover/chip:block">
                      {t.title}
                      <span className="mt-0.5 block text-[10px] text-gray-300">{t.projectName}</span>
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
  );
}
