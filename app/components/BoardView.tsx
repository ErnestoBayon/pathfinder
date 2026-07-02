"use client";

import { useMemo, useState } from "react";
import type { Task, TaskState } from "@/lib/types";
import { useTaskFilters } from "./useTaskFilters";
import KanbanBoard from "./KanbanBoard";
import TaskFilterBar from "./TaskFilterBar";

// Vista Board (ruta /proyecto/[id]/board): tablero Kanban a todo el ancho.
// Reutiliza el filtro por URL (prioridad + keystones) que comparte con la lista;
// aquí NO hay orden (`sort`) ni toggle de vista (la vista es la ruta).
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

  // Summary estático desde el SSR (el tablero no expande subtareas): done → completed.
  const subtaskSummary = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(initialSubtaskCounts ?? {}).map(([id, c]) => [
          id,
          { total: c.total, completed: c.done },
        ]),
      ),
    [initialSubtaskCounts],
  );

  const filtered = useMemo(() => filterTasks(tasks), [filterTasks, tasks]);

  // Mover una card entre columnas cambia `estado`: patch optimista con rollback,
  // mismo flujo que toggle() en la lista (PATCH /api/tasks/[id]).
  async function moveTask(task: Task, estado: TaskState) {
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, estado } : t)));
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prevTasks);
      setError("Couldn't move the task. Please try again.");
    }
  }

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
        <KanbanBoard tasks={filtered} subtaskSummary={subtaskSummary} onMove={moveTask} />
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
