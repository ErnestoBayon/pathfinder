"use client";

import { useEffect, useState } from "react";
import type { Prioridad, Subtask } from "@/lib/types";
import { PRIORIDAD_COLORS } from "@/lib/colors";

const PRIORIDADES: Prioridad[] = ["High", "Medium", "Low"];

// Lista de subtareas de una tarea. Vive embebida bajo el título (sin card propia):
// barra de progreso, checklist con borrar-al-hover y un input para agregar.
// Las mutaciones son optimistas y revierten si el request falla.
export default function SubtaskList({
  taskId,
  initialSubtasks,
  onSummaryChange,
  onTaskCompleted,
}: {
  taskId: string;
  initialSubtasks?: Subtask[];
  onSummaryChange?: (summary: { total: number; completed: number }) => void;
  onTaskCompleted?: () => void;
}) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks ?? []);
  const [newTitle, setNewTitle] = useState("");
  const [newPrioridad, setNewPrioridad] = useState<Prioridad>("Medium");
  const [loading, setLoading] = useState(false);
  // El banner de "todas completadas" se puede descartar; reaparece si vuelven a quedar
  // todas hechas tras desmarcar alguna.
  const [dismissed, setDismissed] = useState(false);

  // Al montar, trae las subtareas reales. (initialSubtasks es para SSR futuro.)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`);
        const data = (await res.json()) as { subtasks?: Subtask[] };
        if (!cancelled && res.ok && Array.isArray(data.subtasks)) setSubtasks(data.subtasks);
      } catch {
        // Si falla, dejamos la lista como está.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const total = subtasks.length;
  const done = subtasks.filter((s) => s.completed).length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const allDone = total > 0 && done === total;

  // Reporta total + completadas hacia arriba (para el badge del padre).
  useEffect(() => {
    onSummaryChange?.({ total, completed: done });
  }, [total, done, onSummaryChange]);

  // Si dejan de estar todas completadas, rehabilita el banner para la próxima vez.
  useEffect(() => {
    if (!allDone) setDismissed(false);
  }, [allDone]);

  async function toggle(sub: Subtask) {
    const next = !sub.completed;
    const prev = subtasks;
    setSubtasks((s) => s.map((x) => (x.id === sub.id ? { ...x, completed: next } : x)));
    try {
      const res = await fetch(`/api/subtasks/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSubtasks(prev);
    }
  }

  async function changePriority(sub: Subtask, next: Prioridad) {
    const prev = subtasks;
    setSubtasks((s) => s.map((x) => (x.id === sub.id ? { ...x, prioridad: next } : x)));
    try {
      const res = await fetch(`/api/subtasks/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prioridad: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSubtasks(prev);
    }
  }

  async function remove(sub: Subtask) {
    const prev = subtasks;
    setSubtasks((s) => s.filter((x) => x.id !== sub.id));
    try {
      const res = await fetch(`/api/subtasks/${sub.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setSubtasks(prev);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, prioridad: newPrioridad }),
      });
      const data = (await res.json()) as { subtask?: Subtask };
      if (res.ok && data.subtask) {
        setSubtasks((s) => [...s, data.subtask!]);
        setNewTitle("");
      }
    } catch {
      // Si falla, conservamos el texto para reintentar.
    } finally {
      setLoading(false);
    }
  }

  // Marca la tarea padre como hecha. El codebase usa `estado: "done"` (no existe
  // un campo `completed` en tasks). Avisa al padre para que sincronice su checkbox.
  async function markTaskDone() {
    setDismissed(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "done" }),
      });
      if (!res.ok) throw new Error();
      onTaskCompleted?.();
    } catch {
      setDismissed(false);
    }
  }

  const showDoneBanner = allDone && !dismissed;

  return (
    <div className="mt-1.5 flex flex-col gap-2 pb-1">
      {/* Barra de progreso: solo si hay subtareas. */}
      {total > 0 && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs tabular-nums text-dim">
            {done} / {total}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-base">
            <div
              className="h-full rounded-full bg-done transition-all duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist: guía vertical a la izquierda para anidar visualmente bajo la tarea. */}
      {subtasks.length > 0 && (
        <ul className="flex flex-col gap-0.5 border-l border-line pl-2.5">
          {subtasks.map((sub) => (
            <li
              key={sub.id}
              className="group/sub flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors duration-200 ease-out hover:bg-base"
            >
              {/* Checkbox cuadrado (vs. el círculo de las tareas): se rellena de verde al completar. */}
              <button
                type="button"
                onClick={() => void toggle(sub)}
                aria-label={sub.completed ? "Mark as pending" : "Mark as done"}
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border text-[10px] leading-none transition-all duration-200 ease-out",
                  sub.completed
                    ? "border-done bg-done text-white"
                    : "border-line text-transparent hover:border-accent",
                ].join(" ")}
              >
                ✓
              </button>
              {/* Priority pill — click cycles High → Medium → Low → High. */}
              <button
                type="button"
                onClick={() => {
                  const idx = PRIORIDADES.indexOf(sub.prioridad);
                  void changePriority(sub, PRIORIDADES[(idx + 1) % PRIORIDADES.length]);
                }}
                style={{
                  background: PRIORIDAD_COLORS[sub.prioridad].tint,
                  color: PRIORIDAD_COLORS[sub.prioridad].textOn,
                }}
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none transition-all duration-200 ease-out hover:opacity-80"
                title="Click to change priority"
              >
                {sub.prioridad}
              </button>
              <span
                className={[
                  "min-w-0 flex-1 break-words text-sm leading-snug transition-colors duration-200 ease-out",
                  sub.completed ? "text-dim line-through" : "text-ink",
                ].join(" ")}
              >
                {sub.title}
              </span>
              <button
                type="button"
                onClick={() => void remove(sub)}
                aria-label="Delete subtask"
                className="shrink-0 px-1 text-sm leading-none text-dim opacity-0 transition-opacity duration-200 ease-out hover:text-ink group-hover/sub:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Agregar subtarea: separado de la lista por un divisor sutil. */}
      <form
        onSubmit={add}
        className={[
          "flex items-center gap-2",
          subtasks.length > 0 ? "mt-1 border-t border-line pt-2" : "",
        ].join(" ")}
      >
        <select
          value={newPrioridad}
          onChange={(e) => setNewPrioridad(e.target.value as Prioridad)}
          className="shrink-0 rounded-md border border-line bg-panel px-1.5 py-1 text-xs text-ink outline-none transition-colors duration-200 ease-out focus:border-accent"
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add subtask…"
          className="min-w-0 flex-1 rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-dim focus:border-accent"
        />
        <button
          type="submit"
          disabled={newTitle.trim() === "" || loading}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-accent transition-opacity duration-200 ease-out hover:opacity-80 disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {/* Auto-sugerencia: cerrar la tarea cuando todas las subtareas están hechas. */}
      {showDoneBanner && (
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <span className="min-w-0 flex-1">
            ✓ All subtasks completed — mark task as done?
          </span>
          <button
            type="button"
            onClick={() => void markTaskDone()}
            className="shrink-0 rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-medium text-white transition-colors duration-200 ease-out hover:bg-green-700"
          >
            Mark done
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 px-1 text-base leading-none text-green-700/70 transition-colors duration-200 ease-out hover:text-green-900"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
