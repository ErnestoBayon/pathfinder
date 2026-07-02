"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import SubtaskList from "./SubtaskList";

const RANK = Object.fromEntries(PRIORIDAD_ORDEN.map((p, i) => [p, i])) as Record<Prioridad, number>;

const COLUMNS: { estado: TaskState; title: string }[] = [
  { estado: "todo", title: "To Do" },
  { estado: "doing", title: "In Progress" },
  { estado: "done", title: "Done" },
];
const VALID_ESTADOS = new Set<TaskState>(COLUMNS.map((c) => c.estado));

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
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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

// Card arrastrable. El drag handle (⠿) es el único elemento con los listeners de
// dnd-kit; el resto de la card es clickable para abrir el modal de detalle.
// Esto permite que click ≠ drag sin necesidad de detectar el movimiento.
function Card({
  task,
  summary,
  expanded,
  onCardClick,
  onSubtaskToggle,
  onSummaryChange,
  onTaskCompleted,
}: {
  task: Task;
  summary?: { total: number; completed: number };
  expanded: boolean;
  onCardClick: (task: Task) => void;
  onSubtaskToggle: (taskId: string) => void;
  onSummaryChange: (s: { total: number; completed: number }) => void;
  onTaskCompleted: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const done = task.estado === "done";
  const st = PRIORIDAD_COLORS[task.prioridad];
  const total = summary?.total ?? 0;
  const completed = summary?.completed ?? 0;

  const style: React.CSSProperties = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group/card select-none rounded-xl border border-line bg-surface shadow-note transition-shadow duration-200 ease-out",
        isDragging ? "relative z-10 opacity-80 shadow-note-hover" : "hover:shadow-note-hover",
      ].join(" ")}
    >
      {/* Área clickable (abre modal). No incluye el grip ni el pill de subtareas. */}
      <div
        className="cursor-pointer p-3 pb-2"
        onClick={() => onCardClick(task)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onCardClick(task);
        }}
        aria-label={`Open task: ${task.texto}`}
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
          {/* Keystone star */}
          {task.es_clave && (
            <span
              className="shrink-0 leading-none"
              style={{ color: KEYSTONE_COLOR }}
              title="Key task"
              aria-label="Key task"
            >
              <StarIcon />
            </span>
          )}
          {/* Drag handle: solo este elemento activa el drag; el resto de la card es clickable. */}
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to move"
            className="shrink-0 cursor-grab touch-none select-none text-sm leading-none text-muted/40 transition-opacity duration-200 ease-out group-hover/card:text-muted/70 active:cursor-grabbing"
          >
            ⠿
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {/* Badge de prioridad */}
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
        </div>
      </div>

      {/* Pill de subtareas: fuera del área clickable del modal para evitar conflicto.
          Es un botón propio que expande/colapsa el panel de subtareas inline. */}
      {total > 0 && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSubtaskToggle(task.id);
            }}
            aria-expanded={expanded}
            aria-label={`Subtasks: ${completed} of ${total} completed`}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors duration-200 ease-out",
              subtaskPillClasses(total, completed),
            ].join(" ")}
          >
            <span aria-hidden>{expanded ? "▾" : "▸"}</span>
            <ListIcon />
            <span className="tabular-nums">
              {completed}/{total}
            </span>
          </button>
        </div>
      )}

      {/* Panel de subtareas inline (expandible) */}
      {expanded && (
        <div className="border-t border-line px-3 pb-3 pt-2">
          <SubtaskList
            taskId={task.id}
            onSummaryChange={onSummaryChange}
            onTaskCompleted={onTaskCompleted}
          />
        </div>
      )}
    </div>
  );
}

// Columna droppable: incluye el formulario de quick-add al final y, para la columna
// Done, el botón de limpiar completadas (con confirmación inline).
function Column({
  estado,
  title,
  tasks,
  children,
  isAdding,
  onAddRequest,
  onAdd,
  onAddCancel,
  onClearCompleted,
}: {
  estado: TaskState;
  title: string;
  tasks: Task[];
  children: ReactNode;
  isAdding: boolean;
  onAddRequest: () => void;
  onAdd: (texto: string) => void;
  onAddCancel: () => void;
  onClearCompleted?: () => void;
}) {
  const [addText, setAddText] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  useEffect(() => {
    if (isAdding) {
      setAddText("");
      // rAF needed because the input may not be in the DOM yet on this tick
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isAdding]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = addText.trim();
    if (!text) return;
    onAdd(text);
    setAddText("");
  }

  const doneTasks = tasks.filter((t) => t.estado === "done");
  const hasDone = onClearCompleted !== undefined && doneTasks.length > 0;

  return (
    <div className="flex min-w-0 flex-col">
      {/* Cabecera: título + contador + "Clear completed" (solo Done) */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
        <span className="tabular-nums text-xs text-muted">{tasks.length}</span>
        {hasDone && (
          <div className="ml-auto flex items-center gap-1">
            {confirmClear ? (
              <>
                <span className="text-xs text-muted">Clear {tasks.length}?</span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmClear(false);
                    onClearCompleted?.();
                  }}
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-red-600 transition-colors duration-200 ease-out hover:bg-red-50"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded px-1.5 py-0.5 text-xs text-muted transition-colors duration-200 ease-out hover:text-ink"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded px-1.5 py-0.5 text-xs text-muted transition-colors duration-200 ease-out hover:text-red-600"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Área droppable */}
      <div
        ref={setNodeRef}
        className={[
          "flex min-h-[24rem] flex-1 flex-col gap-2 rounded-xl border p-2.5 transition-colors duration-200 ease-out",
          isOver ? "border-accent/40 bg-accent/5" : "border-line bg-canvas",
        ].join(" ")}
      >
        {tasks.length === 0 && !isAdding && (
          <p className="px-2 py-4 text-center text-xs text-muted/70">Drop tasks here</p>
        )}

        {children}

        {/* Quick-add: formulario o botón según el estado */}
        {isAdding ? (
          <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-1.5">
            <input
              ref={inputRef}
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onAddCancel();
                }
              }}
              placeholder="Task title…"
              className="w-full rounded-lg border border-accent bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!addText.trim()}
                className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white transition-colors duration-200 ease-out hover:bg-accent-hover disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={onAddCancel}
                className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted transition-colors duration-200 ease-out hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={onAddRequest}
            className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted/70 transition-colors duration-200 ease-out hover:bg-line/40 hover:text-muted"
          >
            <span aria-hidden className="text-base leading-none">+</span>
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

// Tablero Kanban con CRUD completo. Recibe tareas ya filtradas (prioridad + keystones)
// y las reparte por estado. Gestiona el estado local de UI (quick-add, confirmación
// de limpieza); las mutaciones de datos fluyen hacia arriba vía callbacks.
export default function KanbanBoard({
  tasks,
  subtaskSummary,
  expandedSubtasks,
  onMove,
  onCardClick,
  onSubtaskToggle,
  onSummaryChange,
  onTaskCompleted,
  onAddTask,
  onClearCompleted,
}: {
  tasks: Task[];
  subtaskSummary: Record<string, { total: number; completed: number }>;
  expandedSubtasks: Set<string>;
  onMove: (task: Task, estado: TaskState) => void;
  onCardClick: (task: Task) => void;
  onSubtaskToggle: (taskId: string) => void;
  onSummaryChange: (taskId: string, s: { total: number; completed: number }) => void;
  onTaskCompleted: (taskId: string) => void;
  onAddTask: (estado: TaskState, texto: string) => void;
  onClearCompleted: () => void;
}) {
  const [addingToColumn, setAddingToColumn] = useState<TaskState | null>(null);

  const sensors = useSensors(
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
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(({ estado, title }) => {
          const group = sortColumn(tasks.filter((t) => t.estado === estado));
          return (
            <Column
              key={estado}
              estado={estado}
              title={title}
              tasks={group}
              isAdding={addingToColumn === estado}
              onAddRequest={() => setAddingToColumn(estado)}
              onAdd={(texto) => {
                onAddTask(estado, texto);
                setAddingToColumn(null);
              }}
              onAddCancel={() => setAddingToColumn(null)}
              onClearCompleted={estado === "done" ? onClearCompleted : undefined}
            >
              {group.map((task) => (
                <Card
                  key={task.id}
                  task={task}
                  summary={subtaskSummary[task.id]}
                  expanded={expandedSubtasks.has(task.id)}
                  onCardClick={onCardClick}
                  onSubtaskToggle={onSubtaskToggle}
                  onSummaryChange={(s) => onSummaryChange(task.id, s)}
                  onTaskCompleted={() => onTaskCompleted(task.id)}
                />
              ))}
            </Column>
          );
        })}
      </div>
    </DndContext>
  );
}
