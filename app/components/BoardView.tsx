"use client";

import { useMemo, useState } from "react";
import type { Task, TaskState } from "@/lib/types";
import { useTaskFilters } from "./useTaskFilters";
import KanbanBoard from "./KanbanBoard";
import TaskFilterBar from "./TaskFilterBar";
import TaskDetailModal from "./TaskDetailModal";

// Vista Board (ruta /proyecto/[id]/board): tablero Kanban a todo el ancho.
// Gestiona todas las mutaciones de datos: quick-add, drag-to-move, edición vía
// modal, borrar, subtareas y limpiar completadas. Las queries van al mismo
// PATCH /DELETE /POST que usa la lista, sin nuevas rutas.
export default function BoardView({
  projectId,
  initialTasks,
  initialSubtaskCounts,
}: {
  projectId: string;
  initialTasks: Task[];
  initialSubtaskCounts?: Record<string, { total: number; done: number }>;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Inicializado desde SSR (done → completed); SubtaskList lo actualiza al expandir.
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

  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    selectedPrios,
    keystonesOnly,
    filtersActive,
    togglePrioridad,
    toggleKeystones,
    clearFilters,
    filterTasks,
  } = useTaskFilters();

  const filtered = useMemo(() => filterTasks(tasks), [filterTasks, tasks]);

  // ── Mutaciones ────────────────────────────────────────────────────────────

  // Patch optimista genérico: actualiza el estado local y revierte si el PATCH falla.
  // Devuelve la tarea actualizada desde el servidor para que el caller la use si quiere.
  async function patchTask(task: Task, patch: Partial<Task>): Promise<Task | null> {
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { task?: Task; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      if (data.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task! : t)));
        return data.task;
      }
      return null;
    } catch {
      setTasks(prevTasks);
      setError("Couldn't save the change. Please try again.");
      return null;
    }
  }

  function moveTask(task: Task, estado: TaskState) {
    void patchTask(task, { estado });
  }

  async function addTask(estado: TaskState, texto: string) {
    // Optimistic: insertar una tarea temporal mientras llega la respuesta del servidor.
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: Task = {
      id: tempId,
      project_id: projectId,
      texto,
      estado,
      prioridad: "Medium",
      orden: 9999,
      es_clave: false,
      suggested: false,
    };
    setTasks((prev) => [...prev, optimistic]);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, estado }),
      });
      const data = (await res.json()) as { task?: Task; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't create task");
      // Reemplazar la tarea temporal con la real del servidor.
      setTasks((prev) => prev.map((t) => (t.id === tempId ? data.task! : t)));
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setError("Couldn't create the task. Please try again.");
    }
  }

  async function clearCompleted() {
    const doneTasks = tasks.filter((t) => t.estado === "done");
    if (doneTasks.length === 0) return;
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.estado !== "done"));
    setError(null);
    try {
      await Promise.all(
        doneTasks.map((t) =>
          fetch(`/api/tasks/${t.id}`, { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error();
          }),
        ),
      );
    } catch {
      setTasks(prevTasks);
      setError("Couldn't clear completed tasks. Please try again.");
    }
  }

  // ── Callbacks del modal ───────────────────────────────────────────────────

  function handleTaskUpdated(updatedTask: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    // Sincronizar activeTask para que el modal refleje los cambios inmediatamente.
    setActiveTask(updatedTask);
    // Si el save cerró el modal (sin cambios adicionales), onUpdate llama a onClose.
    // Aquí dejamos el modal abierto (el modal llama onClose si no hay más cambios).
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setActiveTask(null);
  }

  function handleTaskCompleted(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, estado: "done" as TaskState } : t)),
    );
    setActiveTask((prev) =>
      prev?.id === taskId ? { ...prev, estado: "done" as TaskState } : prev,
    );
  }

  function updateSummary(taskId: string, s: { total: number; completed: number }) {
    setSubtaskSummary((prev) => {
      const cur = prev[taskId];
      if (cur && cur.total === s.total && cur.completed === s.completed) return prev;
      return { ...prev, [taskId]: s };
    });
  }

  function toggleExpanded(taskId: string) {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (tasks.length === 0) {
    return (
      <p className="mt-10 text-sm text-muted">No tasks yet. Add them from the Overview tab.</p>
    );
  }

  return (
    <div className="mt-10">
      <TaskFilterBar
        selected={selectedPrios}
        onTogglePrioridad={togglePrioridad}
        keystonesOnly={keystonesOnly}
        onToggleKeystones={toggleKeystones}
        active={filtersActive}
        onClear={clearFilters}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-line bg-canvas px-4 py-6 text-center">
          <p className="text-sm text-muted">No tasks match these filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-xs font-medium text-accent transition-colors duration-200 ease-out hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <KanbanBoard
          tasks={filtered}
          subtaskSummary={subtaskSummary}
          expandedSubtasks={expandedSubtasks}
          onMove={moveTask}
          onCardClick={(task) => setActiveTask(task)}
          onSubtaskToggle={toggleExpanded}
          onSummaryChange={updateSummary}
          onTaskCompleted={handleTaskCompleted}
          onAddTask={addTask}
          onClearCompleted={clearCompleted}
        />
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {activeTask && (
        <TaskDetailModal
          task={activeTask}
          onUpdate={(updatedTask) => {
            handleTaskUpdated(updatedTask);
            setActiveTask(null);
          }}
          onDelete={handleTaskDeleted}
          onTaskCompleted={handleTaskCompleted}
          onSummaryChange={updateSummary}
          onClose={() => setActiveTask(null)}
        />
      )}
    </div>
  );
}
