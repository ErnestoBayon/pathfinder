"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import type { Prioridad, Task } from "@/lib/types";

// Rank para ordenar en cliente (debe espejar el orden del store).
const RANK = Object.fromEntries(PRIORIDAD_ORDEN.map((p, i) => [p, i])) as Record<Prioridad, number>;

// Estilo del badge de prioridad: el color ilumina, no rellena (ver DESIGN.md).
const PRIORIDAD_STYLE: Record<Prioridad, { label: string; color: string; bg: string }> = {
  alta: { label: "Alta", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
  media: { label: "Media", color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  baja: { label: "Baja", color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
};

const STAR_COLOR = "#7c3aed";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-06-15T00:00:00+00" → "15 jun". Trabaja sobre el string para evitar
// corrimientos de zona horaria al construir un Date.
function formatDeadline(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${parseInt(m[3], 10)} ${MESES[parseInt(m[2], 10) - 1]}`;
}

function sortForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      RANK[a.prioridad] - RANK[b.prioridad] ||
      a.orden - b.orden ||
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
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
  taskVersion = 0,
}: {
  projectId: string;
  initialTasks: Task[];
  taskVersion?: number;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [texto, setTexto] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edición inline: id de la tarea en edición y su texto temporal.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  // ESC cancela; evita que el onBlur que dispara después guarde el cambio.
  const skipBlur = useRef(false);

  const sensors = useSensors(
    // Pequeño umbral para no arrancar un drag al hacer click normal en la fila.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
        setError(data.error ?? "No se pudo crear la tarea.");
        return;
      }
      setTasks((prev) => [...prev, data.task!]);
      setTexto("");
    } catch {
      setError("No pude conectar. Revisa tu conexión.");
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
      setError("No pude guardar el cambio. Intenta de nuevo.");
    }
  }

  function toggle(task: Task) {
    void patchTask(task, { estado: task.estado === "done" ? "pending" : "done" });
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
      setError("No pude eliminar la tarea. Intenta de nuevo.");
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
      setError("No pude guardar el nuevo orden. Intenta de nuevo.");
    }
  }

  const pendientes = tasks.filter((t) => t.estado !== "done").length;
  const ordered = sortForDisplay(tasks);

  function renderTask(task: Task) {
    const done = task.estado === "done";
    const editing = editingId === task.id;
    const st = PRIORIDAD_STYLE[task.prioridad];
    return (
      <Sortable key={task.id} id={task.id}>
        {({ setNodeRef, setActivatorNodeRef, attributes, listeners, style, isDragging }) => (
          <li ref={setNodeRef} style={style} className={isDragging ? "relative z-10 opacity-70" : ""}>
            <div className="group flex h-auto items-start gap-1.5 rounded-lg px-1 py-2 transition-colors duration-200 ease-out hover:bg-canvas">
              <span
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label="Reordenar tarea"
                className="shrink-0 cursor-grab touch-none select-none px-0.5 text-sm leading-none text-muted opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 active:cursor-grabbing"
              >
                ⠿
              </span>

              <button
                type="button"
                onClick={() => toggle(task)}
                aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
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
                aria-label={task.es_clave ? "Quitar de tareas clave" : "Marcar como tarea clave"}
                title="Tarea clave"
                style={{ color: STAR_COLOR }}
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
                  aria-label="Fecha límite"
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
                aria-label="Prioridad"
                className="shrink-0 cursor-pointer appearance-none rounded-full px-2 py-0.5 text-[11px] font-medium leading-none outline-none"
                style={{ color: st.color, backgroundColor: st.bg }}
              >
                {PRIORIDAD_ORDEN.map((p) => (
                  <option key={p} value={p} className="bg-surface text-ink">
                    {PRIORIDAD_STYLE[p].label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void remove(task)}
                aria-label="Eliminar tarea"
                className="shrink-0 rounded-md px-1 text-base leading-none text-muted opacity-0 transition-opacity duration-200 ease-out hover:text-ink group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          </li>
        )}
      </Sortable>
    );
  }

  return (
    <div className="flex flex-col p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink">Tareas</h2>
        <span className="text-xs text-muted">
          {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
        </span>
      </div>

      {ordered.length === 0 ? (
        <p className="mb-4 text-sm text-muted">
          Aún no hay tareas. Agrega la primera abajo.
        </p>
      ) : (
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
      )}

      <form onSubmit={add} className="flex items-center gap-2.5">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Agregar una tarea…"
          disabled={adding}
          className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={adding || texto.trim() === ""}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
        >
          {adding ? "…" : "Agregar"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
