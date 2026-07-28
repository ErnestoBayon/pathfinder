"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Prioridad } from "@/lib/types";
import { PRIORIDAD_COLORS } from "@/lib/colors";

export interface CalendarTask {
  id: string;
  title: string;
  priority: Prioridad;
  projectId: string;
  projectName: string;
  projectColor: string;
  date: string;
  completed: boolean;
}

const MESES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MESES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DIAS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type PriorityFilter = Prioridad | "all";

// Semaphore pills — active uses solid color, inactive uses tinted border.
const PRIORITY_FILTERS: { key: PriorityFilter; label: string; active: string; inactive: string }[] = [
  {
    key: "all",
    label: "All",
    active: "border border-accent bg-accent-fill text-ink",
    inactive: "border border-line text-dim hover:bg-raise",
  },
  {
    key: "High",
    label: "High",
    active: "bg-red-600 text-white",
    inactive: "border border-red-200 text-red-600 hover:bg-red-50",
  },
  {
    key: "Medium",
    label: "Medium",
    active: "bg-amber-600 text-white",
    inactive: "border border-amber-200 text-amber-700 hover:bg-amber-50",
  },
  {
    key: "Low",
    label: "Low",
    active: "bg-[#15803D] text-white",
    inactive: "border border-[rgba(21,128,61,0.3)] text-[#15803D] hover:bg-[rgba(21,128,61,0.05)]",
  },
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function truncate(s: string) { return s.length > 20 ? `${s.slice(0, 20)}…` : s; }
function getMonday(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day);
  const dow = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
}

export default function CalendarView({
  tasksByDate,
  fixedProjectId,
}: {
  tasksByDate: Record<string, CalendarTask[]>;
  fixedProjectId?: string;
}) {
  const today = useMemo(() => new Date(), []);
  const todayStr = ymd(today);

  const [anchor, setAnchor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  }));

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [projectOpen, setProjectOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectOpen) return;
    function onOutside(e: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node))
        setProjectOpen(false);
    }
    function onEscape(e: KeyboardEvent) { if (e.key === "Escape") setProjectOpen(false); }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [projectOpen]);

  const allProjects = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>();
    for (const list of Object.values(tasksByDate)) {
      for (const t of list) {
        if (!seen.has(t.projectId)) seen.set(t.projectId, { name: t.projectName, color: t.projectColor });
      }
    }
    return Array.from(seen, ([id, { name, color }]) => ({ id, name, color }));
  }, [tasksByDate]);
  const showProjectFilter = !fixedProjectId && allProjects.length > 1;

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const rawProject = searchParams.get("project") ?? "all";
  const projectFilter = fixedProjectId
    ?? (rawProject === "all" || allProjects.some((p) => p.id === rawProject) ? rawProject : "all");

  const toggleProject = useCallback(
    (id: string) => {
      if (fixedProjectId) return;
      const params = new URLSearchParams(searchParams.toString());
      if (id === "all" || id === projectFilter) { params.delete("project"); }
      else { params.set("project", id); }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [fixedProjectId, searchParams, pathname, router, projectFilter],
  );

  const calView: "month" | "week" = searchParams.get("view") === "week" ? "week" : "month";

  const toggleCalView = useCallback(
    (v: "month" | "week") => {
      if (v === calView) return;
      const params = new URLSearchParams(searchParams.toString());
      if (v === "month") {
        params.delete("view");
        const mon = getMonday(anchor.year, anchor.month, anchor.day);
        setAnchor({ year: mon.getFullYear(), month: mon.getMonth(), day: 1 });
      } else {
        params.set("view", "week");
        const inCurrentMonth = today.getFullYear() === anchor.year && today.getMonth() === anchor.month;
        if (inCurrentMonth) setAnchor({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [calView, anchor, today, searchParams, pathname, router],
  );

  const monthCells = useMemo(() => {
    const first = new Date(anchor.year, anchor.month, 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(anchor.year, anchor.month + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(anchor.year, anchor.month, 1 - lead + i);
      return { date: d, str: ymd(d), inMonth: d.getMonth() === anchor.month };
    });
  }, [anchor]);

  const weekCells = useMemo(() => {
    const mon = getMonday(anchor.year, anchor.month, anchor.day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
      return { date: d, str: ymd(d), inMonth: true };
    });
  }, [anchor]);

  const cells = calView === "week" ? weekCells : monthCells;

  const headerTitle = useMemo(() => {
    if (calView === "month") return `${MESES[anchor.month]} ${anchor.year}`;
    const mon = getMonday(anchor.year, anchor.month, anchor.day);
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    return `${MESES_SHORT[mon.getMonth()]} ${mon.getDate()} – ${MESES_SHORT[sun.getMonth()]} ${sun.getDate()}, ${sun.getFullYear()}`;
  }, [calView, anchor]);

  function tasksFor(dateStr: string): CalendarTask[] {
    return (tasksByDate[dateStr] ?? []).filter(
      (t) =>
        (priorityFilter === "all" || t.priority === priorityFilter) &&
        (projectFilter === "all" || t.projectId === projectFilter) &&
        (showCompleted || !t.completed),
    );
  }

  const hasVisibleTasks = cells.some((c) => tasksFor(c.str).length > 0);

  function prev() {
    if (calView === "month") {
      setAnchor((a) => a.month === 0 ? { year: a.year - 1, month: 11, day: 1 } : { year: a.year, month: a.month - 1, day: 1 });
    } else {
      setAnchor((a) => { const d = new Date(a.year, a.month, a.day - 7); return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }; });
    }
  }
  function next() {
    if (calView === "month") {
      setAnchor((a) => a.month === 11 ? { year: a.year + 1, month: 0, day: 1 } : { year: a.year, month: a.month + 1, day: 1 });
    } else {
      setAnchor((a) => { const d = new Date(a.year, a.month, a.day + 7); return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }; });
    }
  }
  function goToday() { setAnchor({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() }); }

  const navBtn = "flex h-8 w-8 items-center justify-center rounded-full text-dim transition-colors duration-200 ease-out hover:bg-raise";

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{headerTitle}</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter pills */}
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

          {/* Project filter dropdown */}
          {showProjectFilter && (() => {
            const activeProject = projectFilter !== "all" ? allProjects.find((p) => p.id === projectFilter) : null;
            return (
              <div ref={projectDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProjectOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-dim transition-colors duration-200 ease-out hover:bg-raise"
                >
                  {activeProject && (
                    <span style={{ backgroundColor: activeProject.color }} className="h-2 w-2 shrink-0 rounded-full" />
                  )}
                  <span>{activeProject ? activeProject.name : "All projects"}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-ghost">
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {projectOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-line bg-panel py-1 shadow-note">
                    <button
                      type="button"
                      onClick={() => { toggleProject("all"); setProjectOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-raise"
                    >
                      <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                        {projectFilter === "all" && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#1F1F1D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className={projectFilter === "all" ? "font-semibold text-ink" : "font-medium text-dim"}>
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
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-raise"
                        >
                          <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                            {active && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#1F1F1D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span style={{ backgroundColor: p.color }} className="h-2 w-2 shrink-0 rounded-full" />
                          <span className={active ? "font-semibold text-ink" : "font-medium text-dim"}>
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

          {/* Show/hide completed */}
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            aria-pressed={showCompleted}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out",
              showCompleted ? "border border-accent bg-accent-fill text-ink" : "border border-line bg-panel text-dim hover:bg-raise",
            ].join(" ")}
          >
            {showCompleted ? "Hide completed" : "Show completed"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Month / Week segmented toggle */}
          <div className="flex items-center overflow-hidden rounded-full border border-line text-xs font-medium">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => toggleCalView(v)}
                className={[
                  "px-3 py-1 capitalize transition-colors duration-200 ease-out",
                  calView === v ? "bg-accent-fill text-ink font-semibold" : "text-dim hover:bg-raise",
                ].join(" ")}
              >
                {v === "month" ? "Month" : "Week"}
              </button>
            ))}
          </div>

          <button type="button" onClick={prev} aria-label="Previous" className={navBtn}>‹</button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-dim ring-1 ring-line transition-colors duration-200 ease-out hover:bg-raise"
          >
            Today
          </button>
          <button type="button" onClick={next} aria-label="Next" className={navBtn}>›</button>
        </div>
      </div>

      {!hasVisibleTasks && (
        <p className="mb-4 text-center text-sm text-dim">
          No tasks with a deadline this {calView === "week" ? "week" : "month"}
        </p>
      )}

      {/* Calendar grid */}
      <div className="rounded-xl border border-line bg-panel p-2 shadow-note">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-2 pb-2">
          {DIAS.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-faint">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell) => {
            const isToday = cell.str === todayStr;
            const dayTasks = tasksFor(cell.str);
            const capLimit = calView === "week" ? 6 : 3;
            const capVisible = calView === "week" ? 5 : 2;
            const showAll = dayTasks.length <= capLimit;
            const visible = showAll ? dayTasks : dayTasks.slice(0, capVisible);
            const extra = showAll ? 0 : dayTasks.length - capVisible;

            return (
              <div
                key={cell.str}
                className={[
                  "flex flex-col gap-1 rounded-lg border border-line p-2",
                  calView === "week" ? "min-h-[240px]" : "min-h-[120px]",
                  isToday ? "bg-accent-fill" : "bg-panel",
                ].join(" ")}
              >
                <div className="flex justify-end">
                  {isToday ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                      {cell.date.getDate()}
                    </span>
                  ) : (
                    <span className={["text-sm", cell.inMonth ? "text-dim" : "text-ghost"].join(" ")}>
                      {cell.date.getDate()}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  {visible.map((t) => (
                    <Link key={t.id} href={`/proyecto/${t.projectId}`} className="group/chip relative block">
                      <span
                        style={{
                          borderLeft: `3px solid ${t.projectColor}`,
                          backgroundColor: `${t.projectColor}14`,
                        }}
                        className={[
                          "flex items-center gap-1.5 overflow-hidden rounded px-2 py-0.5 text-[11px] font-medium leading-tight text-ink transition-transform duration-100 hover:scale-[1.02]",
                          t.completed ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <span
                          style={{ backgroundColor: PRIORIDAD_COLORS[t.priority]?.dot ?? "#6E6E68" }}
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                        />
                        <span className={["min-w-0 truncate", t.completed ? "line-through" : ""].join(" ")}>
                          {truncate(t.title)}
                        </span>
                      </span>
                      {/* Tooltip */}
                      <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-max max-w-[220px] rounded-xl border border-line bg-ink/95 px-2.5 py-1.5 text-xs font-normal leading-snug text-panel shadow-note-hover backdrop-blur-sm group-hover/chip:block">
                        {t.title}
                        <span className="mt-0.5 block text-[10px] font-medium text-ghost">{t.projectName}</span>
                      </span>
                    </Link>
                  ))}
                  {extra > 0 && (
                    <span className="px-1.5 text-[11px] font-medium text-dim">+{extra} more</span>
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
