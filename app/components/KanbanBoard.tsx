"use client";

import { type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PRIORIDAD_ORDEN } from "@/lib/types";
import type { Prioridad, Task, TaskState } from "@/lib/types";
import { KEYSTONE_COLOR, PRIORIDAD_COLORS, subtaskPillClasses } from "@/lib/colors";
import { formatDeadline } from "@/lib/dates";

// Rank de prioridad para el orden interno de cada columna (espeja el store).
const RANK = Object.fromEntries(PRIORIDAD_ORDEN.map((p, i) => [p, i])) as Record<Prioridad, number>;

// Las tres columnas del tablero, mapeadas 1:1 a los valores reales de `estado`.
const COLUMNS: { estado: TaskState; title: string }[] = [
  { estado: "todo", title: "To Do" },
  { estado: "doing", title: "In Progress" },
  { estado: "done", title: "Done" },
];
const VALID_ESTADOS = new Set<TaskState>(COLUMNS.map((c) => c.estado));

// Orden interno de una columna: prioridad (alta→baja), luego `orden`, luego creación.
function sortColumn(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      RANK[a.prioridad] - RANK[b.prioridad] ||
      a.orden - b.orden ||
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.9 6.26 6.85.6-5.18 4.52 1.55 6.7L12 17.1 5.88 20.58l1.55-6.7L2.25 8.86l6.85-.6z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

// Card arrastrable. En Kanban el drag cambia `estado` (no reordena), así que
// usamos useDraggable simple: la card se traslada y al soltar el tablero decide
// la columna destino por colisión.
function Card({
  task,
  summary,
}: {
  task: Task;
  summary?: { total: number; completed: number };
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: task.id });
  const done = task.estado === "done";
  const st = PRIORIDAD_COLORS[task.prioridad];
  const total = summary?.total ?? 0;
  const completed = summary?.completed ?? 0;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        "cursor-grab touch-none select-none rounded-xl border border-line bg-surface p-3 shadow-note transition-shadow duration-200 ease-out hover:shadow-note-hover active:cursor-grabbing",
        isDragging ? "relative z-10 opacity-80 shadow-note-hover" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <p
          className={[
            "min-w-0 flex-1 whitespace-normal break-words text-sm leading-snug",
            done ? "text-muted line-through" : "text-ink",
          ].join(" ")}
        >
          {task.texto}
        </p>
        {task.es_clave && (
          <span className="shrink-0 leading-none" style={{ color: KEYSTONE_COLOR }} title="Key task" aria-label="Key task">
            <StarIcon />
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {/* Badge de prioridad: mismo lenguaje visual que las pills de la lista. */}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none"
          style={{ color: st.dot, backgroundColor: st.tint }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.dot }} aria-hidden />
          {task.prioridad}
        </span>

        {task.deadline && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <CalendarIcon />
            {formatDeadline(task.deadline)}
          </span>
        )}

        {/* Pill de subtareas (solo lectura en el tablero): reutiliza subtaskPillClasses. */}
        {total > 0 && (
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
              subtaskPillClasses(total, completed),
            ].join(" ")}
            aria-label={`Subtasks: ${completed} of ${total} completed`}
          >
            <ListIcon />
            <span className="tabular-nums">
              {completed}/{total}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

// Columna droppable. El ref envuelve también el placeholder para que una columna
// vacía siga siendo un destino válido de drop.
function Column({
  estado,
  title,
  tasks,
  children,
}: {
  estado: TaskState;
  title: string;
  tasks: Task[];
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
        <span className="text-xs tabular-nums text-muted">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={[
          "flex min-h-[6rem] flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors duration-200 ease-out",
          isOver ? "border-accent/40 bg-accent/5" : "border-line bg-canvas",
        ].join(" ")}
      >
        {tasks.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted/70">Drop tasks here</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// Tablero Kanban: recibe las tareas YA filtradas (prioridad + keystones) y las
// reparte por `estado`. El drag entre columnas cambia `estado` vía onMove
// (patch optimista con rollback, definido en TaskList).
export default function KanbanBoard({
  tasks,
  subtaskSummary,
  onMove,
}: {
  tasks: Task[];
  subtaskSummary: Record<string, { total: number; completed: number }>;
  onMove: (task: Task, estado: TaskState) => void;
}) {
  const sensors = useSensors(
    // Mismo umbral que la lista para no arrancar un drag en un click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const dest = over.id as TaskState;
    if (!VALID_ESTADOS.has(dest)) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task || task.estado === dest) return;
    onMove(task, dest);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {COLUMNS.map(({ estado, title }) => {
          const group = sortColumn(tasks.filter((t) => t.estado === estado));
          return (
            <Column key={estado} estado={estado} title={title} tasks={group}>
              {group.map((task) => (
                <Card key={task.id} task={task} summary={subtaskSummary[task.id]} />
              ))}
            </Column>
          );
        })}
      </div>
    </DndContext>
  );
}
