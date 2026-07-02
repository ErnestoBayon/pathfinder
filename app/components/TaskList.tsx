"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PRIORIDAD_ORDEN } from "@/lib/types";
import type { Prioridad, Task, TaskState } from "@/lib/types";
import { KEYSTONE_COLOR, PRIORIDAD_COLORS, subtaskPillClasses } from "@/lib/colors";
import { formatDeadline } from "@/lib/dates";
import SubtaskList from "./SubtaskList";
import KanbanBoard from "./KanbanBoard";
import TaskFilterBar, {
  DEFAULT_SORT,
  DEFAULT_VIEW,
  type SortKey,
  type ViewMode,
} from "./TaskFilterBar";

// Rank para ordenar en cliente (debe espejar el orden del store).
const RANK = Object.fromEntries(PRIORIDAD_ORDEN.map((p, i) => [p, i])) as Record<Prioridad, number>;

function sortForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      RANK[a.prioridad] - RANK[b.prioridad] ||
      a.orden - b.orden ||
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
}

// ── Filtro/orden en cliente ────────────────────────────────────────────────
// Lee/valida los query params contra los valores REALES del dominio; cualquier
// valor desconocido se ignora (la URL es editable a mano / compartible).
const VALID_PRIORIDADES = new Set<Prioridad>(PRIORIDAD_ORDEN);

function parsePrioridades(raw: string | null): Set<Prioridad> {
  const set = new Set<Prioridad>();
  if (!raw) return set;
  for (const part of raw.split(",")) {
    const v = part.trim() as Prioridad;
    if (VALID_PRIORIDADES.has(v)) set.add(v);
  }
  return set;
}

function parseSort(raw: string | null): SortKey {
  return raw === "deadline" || raw === "created" ? raw : DEFAULT_SORT;
}

function parseView(raw: string | null): ViewMode {
  return raw === "kanban" ? "kanban" : DEFAULT_VIEW;
}

// Ordena la lista ya filtrada según la clave elegida. Las fechas son strings ISO,
// así que localeCompare las ordena cronológicamente sin construir Date.
function applySort(list: Task[], sort: SortKey): Task[] {
  if (sort === "deadline") {
    // Deadline ascendente (más próximo primero); sin deadline al final.
    return [...list].sort((a, b) => {
      const ad = a.deadline ?? "";
      const bd = b.deadline ?? "";
      if (!ad && !bd) return (a.created_at ?? "").localeCompare(b.created_at ?? "");
      if (!ad) return 1;
      if (!bd) return -1;
      return ad.localeCompare(bd);
    });
  }
  if (sort === "created") {
    // Más reciente primero (created_at descendente).
    return [...list].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }
  return sortForDisplay(list);
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.9 6.26 6.85.6-5.18 4.52 1.55 6.7L12 17.1 5.88 20.58l1.55-6.7L2.25 8.86l6.85-.6z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

type SortableState = ReturnType<typeof useSortable>;
interface SortableRenderProps {
  setNodeRef: SortableState["setNodeRef"];
  setActivatorNodeRef: SortableState["setActivatorNodeRef"];
  attributes: SortableState["attributes"];
  listeners: SortableState["listeners"];
  style: React.CSSProperties;
  isDragging: boolean;
}

// Envoltorio sortable por fila: aísla el hook useSortable y entrega los refs/listeners
// al markup de la fila vía render prop, sin propagar decenas de props.
function Sortable({ id, children }: { id: string; children: (p: SortableRenderProps) => ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return <>{children({ setNodeRef, setActivatorNodeRef, attributes, listeners, style, isDragging })}</>;
}

export default function TaskList({
  projectId,
  initialTasks,
  initialSubtaskCounts,
  taskVersion = 0,
}: {
  projectId: string;
  initialTasks: Task[];
  initialSubtaskCounts?: Record<string, { total: number; done: number }>;
  taskVersion?: number;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [texto, setTexto] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edición inline: id de la tarea en edición y su texto temporal.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Subtareas: qué tareas tienen el panel expandido y el resumen (total/completadas)
  // por tarea. El resumen arranca vacío y SubtaskList lo reporta tras su primer fetch.
  const [showSubtasks, setShowSubtasks] = useState<Record<string, boolean>>({});
  // Sembrado con los counts del SSR para que los pills se vean desde el primer render;
  // SubtaskList lo refina (a {total, completed}) al expandir.
  const [subtaskSummary, setSubtaskSummary] = useState<
    Record<string, { total: number; completed: number }>
  >(() =>
    Object.fromEntries(
      Object.entries(initialSubtaskCounts ?? {}).map(([id, c]) => [
        id,
        { total: c.total, completed: c.done },
      ]),
    ),
  );

  function toggleSubtasks(id: string) {
    setShowSubtasks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setSummary(id: string, s: { total: number; completed: number }) {
    setSubtaskSummary((prev) => {
      const cur = prev[id];
      if (cur && cur.total === s.total && cur.completed === s.completed) return prev;
      return { ...prev, [id]: s };
    });
  }

  // Sincroniza el checkbox de la tarea cuando SubtaskList la cierra desde su banner
  // (el PATCH ya lo hizo SubtaskList; aquí solo actualizamos el estado local).
  function markTaskDoneLocal(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "done" } : t)));
  }
  // ESC cancela; evita que el onBlur que dispara después guarde el cambio.
  const skipBlur = useRef(false);

  const sensors = useSensors(
    // Pequeño umbral para no arrancar un drag al hacer click normal en la fila.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Estado de filtro/orden: la URL es la única fuente de verdad (vistas compartibles
  // y persistentes al refrescar). No toca el store ni dispara queries.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const selectedPrios = useMemo(
    () => parsePrioridades(searchParams.get("prioridad")),
    [searchParams],
  );
  const sort = parseSort(searchParams.get("sort"));
  const keystonesOnly = searchParams.get("keystones") === "1";
  const view = parseView(searchParams.get("view"));
  const filtersActive = selectedPrios.size > 0 || keystonesOnly;

  // Reescribe los query params conservando los que no gestionamos aquí.
  const updateQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  function togglePrioridad(p: Prioridad) {
    updateQuery((params) => {
      const next = new Set(selectedPrios);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      // Serializamos en el orden canónico para que la URL sea estable/legible.
      if (next.size === 0) params.delete("prioridad");
      else params.set("prioridad", PRIORIDAD_ORDEN.filter((x) => next.has(x)).join(","));
    });
  }

  function changeSort(next: SortKey) {
    updateQuery((params) => {
      if (next === DEFAULT_SORT) params.delete("sort");
      else params.set("sort", next);
    });
  }

  function changeView(next: ViewMode) {
    updateQuery((params) => {
      if (next === DEFAULT_VIEW) params.delete("view");
      else params.set("view", next);
    });
  }

  function toggleKeystones() {
    updateQuery((params) => {
      if (keystonesOnly) params.delete("keystones");
      else params.set("keystones", "1");
    });
  }

  function clearFilters() {
    updateQuery((params) => {
      params.delete("prioridad");
      params.delete("keystones");
      params.delete("sort");
    });
  }

  // Re-lee las tareas cuando el padre incrementa la versión (p. ej. el chat creó
  // o reorganizó tareas). Saltamos el primer render: initialTasks ya viene del SSR.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`);
        const data = (await res.json()) as { tasks?: Task[] };
        if (!cancelled && res.ok && Array.isArray(data.tasks)) setTasks(data.tasks);
      } catch {
        // Si el refetch falla, dejamos la lista como está.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, taskVersion]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = texto.trim();
    if (!value || adding) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: value }),
      });
      const data = (await res.json()) as { task?: Task; error?: string };
      if (!res.ok || !data.task) {
        setError(data.error ?? "Couldn't create the task.");
        return;
      }
      setTasks((prev) => [...prev, data.task!]);
      setTexto("");
    } catch {
      setError("Couldn't connect. Check your connection.");
    } finally {
      setAdding(false);
    }
  }

  // Patch optimista genérico: aplica el cambio al instante y revierte si el PATCH falla.
  async function patchTask(task: Task, patch: Partial<Task>) {
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prevTasks);
      setError("Couldn't save the change. Please try again.");
    }
  }

  function toggle(task: Task) {
    void patchTask(task, { estado: task.estado === "done" ? "todo" : "done" });
  }

  function setPrioridad(task: Task, prioridad: Prioridad) {
    void patchTask(task, { prioridad });
  }

  function toggleClave(task: Task) {
    void patchTask(task, { es_clave: !task.es_clave });
  }

  function setDeadline(task: Task, value: string) {
    void patchTask(task, { deadline: value || null });
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditText(task.texto);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function commitEdit(task: Task) {
    const value = editText.trim();
    cancelEdit();
    // Sin cambios o vacío: no tocamos nada.
    if (!value || value === task.texto) return;
    void patchTask(task, { texto: value });
  }

  async function remove(task: Task) {
    // Optimista: la quitamos de la lista y la devolvemos si el DELETE falla.
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prevTasks);
      setError("Couldn't delete the task. Please try again.");
    }
  }

  // Drag & drop: solo reordena dentro de la misma prioridad. Al soltar, reasigna
  // `orden` secuencial dentro del grupo y lo persiste en Supabase.
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    const overTask = tasks.find((t) => t.id === over.id);
    if (!activeTask || !overTask || activeTask.prioridad !== overTask.prioridad) return;

    const group = sortForDisplay(tasks.filter((t) => t.prioridad === activeTask.prioridad));
    const from = group.findIndex((t) => t.id === active.id);
    const to = group.findIndex((t) => t.id === over.id);
    if (from === -1 || to === -1) return;
    const reordered = arrayMove(group, from, to);

    const ordenById = new Map(reordered.map((t, i) => [t.id, i]));
    const prevTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (ordenById.has(t.id) ? { ...t, orden: ordenById.get(t.id)! } : t)),
    );
    setError(null);
    try {
      await Promise.all(
        reordered.map((t, i) =>
          fetch(`/api/tasks/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orden: i }),
          }).then((r) => {
            if (!r.ok) throw new Error();
          }),
        ),
      );
    } catch {
      setTasks(prevTasks);
      setError("Couldn't save the new order. Please try again.");
    }
  }

  const pendientes = tasks.filter((t) => t.estado !== "done").length;

  // Filtro cliente sobre lo ya cargado: prioridades seleccionadas (multi) + keystones.
  const filtered = useMemo(() => {
    let v = tasks;
    if (selectedPrios.size > 0) v = v.filter((t) => selectedPrios.has(t.prioridad));
    if (keystonesOnly) v = v.filter((t) => t.es_clave);
    return v;
  }, [tasks, selectedPrios, keystonesOnly]);
  const ordered = useMemo(() => applySort(filtered, sort), [filtered, sort]);

  // Drag & drop reordena dentro de una prioridad escribiendo `orden`; eso solo es
  // coherente en la vista por defecto (prioridad, sin filtros). Con filtros o con
  // otro orden mostramos una lista plana no arrastrable — ver nota en el commit.
  const dndEnabled = sort === "prioridad" && !filtersActive;

  // Progreso del proyecto (tareas hechas / total) para la barra de la cabecera.
  const totalTasks = tasks.length;
  const doneTasks = totalTasks - pendientes;
  const taskPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  const allTasksDone = totalTasks > 0 && doneTasks === totalTasks;

  // Fila de tarea. `s` trae los refs/listeners de dnd-kit cuando el drag está activo;
  // si es null (vista filtrada u orden no-prioridad) la fila es estática, sin manija.
  function renderTaskRow(task: Task, drag: SortableRenderProps | null) {
    const done = task.estado === "done";
    const editing = editingId === task.id;
    const st = PRIORIDAD_COLORS[task.prioridad];
    return (
          <li
            key={task.id}
            ref={drag?.setNodeRef}
            style={drag?.style}
            className={drag?.isDragging ? "relative z-10 opacity-70" : ""}
          >
            <div className="group flex h-auto items-start gap-1.5 rounded-lg px-1 py-2 transition-colors duration-200 ease-out hover:bg-canvas">
              {drag ? (
                <span
                  ref={drag.setActivatorNodeRef}
                  {...drag.attributes}
                  {...drag.listeners}
                  aria-label="Reorder task"
                  className="shrink-0 cursor-grab touch-none select-none px-0.5 text-sm leading-none text-muted opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 active:cursor-grabbing"
                >
                  ⠿
                </span>
              ) : (
                // Espaciador invisible: conserva la alineación de la fila sin manija.
                <span className="shrink-0 select-none px-0.5 text-sm leading-none opacity-0" aria-hidden>
                  ⠿
                </span>
              )}

              <button
                type="button"
                onClick={() => toggle(task)}
                aria-label={done ? "Mark as pending" : "Mark as done"}
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs leading-none transition-colors duration-200 ease-out",
                  done ? "border-done bg-done text-white" : "border-line text-transparent hover:border-accent",
                ].join(" ")}
              >
                ✓
              </button>

              {editing ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit(task);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      skipBlur.current = true;
                      cancelEdit();
                    }
                  }}
                  onBlur={() => {
                    if (skipBlur.current) {
                      skipBlur.current = false;
                      return;
                    }
                    commitEdit(task);
                  }}
                  className="min-w-0 flex-1 rounded-md border border-accent bg-surface px-2 py-0.5 text-sm leading-relaxed text-ink outline-none"
                />
              ) : (
                <span
                  onClick={() => startEdit(task)}
                  className={[
                    "min-w-0 flex-1 cursor-text whitespace-normal break-words text-sm leading-snug",
                    done ? "text-muted line-through" : "text-ink",
                  ].join(" ")}
                >
                  {task.texto}
                </span>
              )}

              {/* Tarea clave: ⭐ morada, siempre visible si está marcada; al hover (atenuada) si no. */}
              <button
                type="button"
                onClick={() => toggleClave(task)}
                aria-label={task.es_clave ? "Remove from key tasks" : "Mark as key task"}
                title="Key task"
                style={{ color: KEYSTONE_COLOR }}
                className={[
                  "flex shrink-0 items-center leading-none transition-opacity duration-200 ease-out",
                  task.es_clave
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-50 hover:!opacity-100",
                ].join(" ")}
              >
                <StarIcon />
              </button>

              {/* Deadline: ícono al hover; si hay fecha, se muestra "15 jun". */}
              <div className="relative flex shrink-0 items-center justify-end">
                <input
                  type="date"
                  value={task.deadline ? task.deadline.slice(0, 10) : ""}
                  onChange={(e) => setDeadline(task, e.target.value)}
                  aria-label="Deadline"
                  className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                />
                {task.deadline ? (
                  <span className="pointer-events-none whitespace-nowrap text-xs text-muted">
                    {formatDeadline(task.deadline)}
                  </span>
                ) : (
                  <span className="pointer-events-none text-muted opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                    <CalendarIcon />
                  </span>
                )}
              </div>

              {/* Prioridad: dropdown nativo, coloreado según el valor actual. */}
              <select
                value={task.prioridad}
                onChange={(e) => setPrioridad(task, e.target.value as Prioridad)}
                aria-label="Priority"
                className="shrink-0 cursor-pointer appearance-none rounded-full px-2 py-0.5 text-[11px] font-medium leading-none outline-none"
                style={{ color: st.dot, backgroundColor: st.tint }}
              >
                {PRIORIDAD_ORDEN.map((p) => (
                  <option key={p} value={p} className="bg-surface text-ink">
                    {p}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void remove(task)}
                aria-label="Delete task"
                className="shrink-0 rounded-md px-1 text-base leading-none text-muted opacity-0 transition-opacity duration-200 ease-out hover:text-ink group-hover:opacity-100"
              >
                ×
              </button>
            </div>

            {/* Subtareas: badge/pill + panel, indentado para alinear bajo el título. */}
            <div className="pl-9 pr-1">
              {(() => {
                const expanded = !!showSubtasks[task.id];
                const total = subtaskSummary[task.id]?.total ?? 0;
                const completed = subtaskSummary[task.id]?.completed ?? 0;

                if (total === 0) {
                  // Sin subtareas: solo un texto muted que abre el panel para agregar.
                  return (
                    <button
                      type="button"
                      onClick={() => toggleSubtasks(task.id)}
                      aria-expanded={expanded}
                      className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted transition-colors duration-200 ease-out hover:text-ink"
                    >
                      <span aria-hidden>{expanded ? "▾" : "▸"}</span>
                      Add subtasks
                    </button>
                  );
                }

                // Con subtareas: pill compacto visible aun colapsado.
                return (
                  <button
                    type="button"
                    onClick={() => toggleSubtasks(task.id)}
                    aria-expanded={expanded}
                    aria-label={`Subtasks: ${completed} of ${total} completed`}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors duration-200 ease-out",
                      subtaskPillClasses(total, completed),
                    ].join(" ")}
                  >
                    <span aria-hidden>{expanded ? "▾" : "▸"}</span>
                    <ListIcon />
                    <span className="tabular-nums">{total}</span>
                    <span className="opacity-50">·</span>
                    <span className="tabular-nums">
                      {completed}/{total}
                    </span>
                  </button>
                );
              })()}
              {showSubtasks[task.id] && (
                <SubtaskList
                  taskId={task.id}
                  onSummaryChange={(summary) => setSummary(task.id, summary)}
                  onTaskCompleted={() => markTaskDoneLocal(task.id)}
                />
              )}
            </div>
          </li>
    );
  }

  // Envoltorio sortable: aísla useSortable y pasa sus refs/listeners a la fila.
  function renderTask(task: Task) {
    return (
      <Sortable key={task.id} id={task.id}>
        {(drag) => renderTaskRow(task, drag)}
      </Sortable>
    );
  }

  return (
    <div className="flex flex-col p-6">
      <div className={totalTasks > 0 ? "flex items-baseline justify-between" : "mb-4 flex items-baseline justify-between"}>
        <h2 className="text-sm font-semibold text-ink">Tasks</h2>
        <span className="text-xs text-muted">
          {pendientes} {pendientes === 1 ? "pending" : "pending"}
        </span>
      </div>

      {/* Barra de progreso del proyecto: tareas completadas / total. */}
      {totalTasks > 0 && (
        <div className="mb-2 flex items-center gap-2 py-2">
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {doneTasks} / {totalTasks} tasks
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={[
                "h-full rounded-full transition-all duration-200 ease-out",
                allTasksDone ? "bg-green-500" : "bg-indigo-500",
              ].join(" ")}
              style={{ width: `${taskPct}%` }}
            />
          </div>
        </div>
      )}

      {totalTasks === 0 ? (
        <p className="mb-4 text-sm text-muted">
          No tasks yet. Add the first one below.
        </p>
      ) : (
        <>
          <TaskFilterBar
            selected={selectedPrios}
            onTogglePrioridad={togglePrioridad}
            sort={sort}
            onSortChange={changeSort}
            keystonesOnly={keystonesOnly}
            onToggleKeystones={toggleKeystones}
            view={view}
            onViewChange={changeView}
            // En Kanban el orden es fijo, así que "Clear" solo refleja los filtros visibles.
            active={view === "kanban" ? filtersActive : filtersActive || sort !== DEFAULT_SORT}
            onClear={clearFilters}
          />

          {/* Affordance: explica por qué el drag está en pausa fuera de la vista por
              defecto. Solo en la lista (el Kanban tiene su propio drag entre columnas)
              y con filas visibles. Desaparece por completo en la vista default (dndEnabled). */}
          {view === "list" && !dndEnabled && ordered.length > 0 && (
            <p className="-mt-2 mb-3 text-xs text-muted">
              Reordering is paused while filters or sorting are active.
            </p>
          )}

          {ordered.length === 0 ? (
            // Filtros que no matchean ninguna tarea (nunca cuando totalTasks === 0).
            <div className="mb-4 rounded-lg border border-line bg-canvas px-4 py-6 text-center">
              <p className="text-sm text-muted">No tasks match these filters.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-xs font-medium text-accent transition-colors duration-200 ease-out hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : view === "kanban" ? (
            // Tablero Kanban: recibe las tareas ya filtradas (prioridad + keystones);
            // el orden por columna es fijo, así que `sort` se ignora aquí.
            <KanbanBoard
              tasks={filtered}
              subtaskSummary={subtaskSummary}
              onMove={(task, estado: TaskState) => void patchTask(task, { estado })}
            />
          ) : dndEnabled ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <ul className="mb-4 flex flex-col gap-1.5">
                {/* Un SortableContext por prioridad: dnd-kit solo resuelve el `over`
                    dentro del mismo grupo, así el guard de prioridad nunca aborta un drop válido. */}
                {PRIORIDAD_ORDEN.map((prioridad) => {
                  const group = ordered.filter((t) => t.prioridad === prioridad);
                  if (group.length === 0) return null;
                  return (
                    <SortableContext
                      key={prioridad}
                      items={group.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {group.map((task) => renderTask(task))}
                    </SortableContext>
                  );
                })}
              </ul>
            </DndContext>
          ) : (
            // Vista filtrada u orden no-prioridad: lista plana, sin drag & drop.
            <ul className="mb-4 flex flex-col gap-1.5">
              {ordered.map((task) => renderTaskRow(task, null))}
            </ul>
          )}
        </>
      )}

      <form onSubmit={add} className="flex items-center gap-2.5">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Add a task…"
          disabled={adding}
          className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={adding || texto.trim() === ""}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
        >
          {adding ? "…" : "Add"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
