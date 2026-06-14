"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";

export default function TaskList({
  projectId,
  initialTasks,
}: {
  projectId: string;
  initialTasks: Task[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [texto, setTexto] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function toggle(task: Task) {
    const nuevoEstado = task.estado === "done" ? "pending" : "done";
    // Optimista: reflejamos el cambio al instante y revertimos si falla.
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, estado: nuevoEstado } : t)),
    );
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, estado: task.estado } : t)),
      );
      setError("No pude guardar el cambio. Intenta de nuevo.");
    }
  }

  const pendientes = tasks.filter((t) => t.estado !== "done").length;

  return (
    <div className="flex flex-col p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink">Tareas</h2>
        <span className="text-xs text-muted">
          {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="mb-4 text-sm text-muted">
          Aún no hay tareas. Agrega la primera abajo.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-1.5">
          {tasks.map((task) => {
            const done = task.estado === "done";
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => void toggle(task)}
                  className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 ease-out hover:bg-canvas"
                >
                  <span
                    aria-hidden
                    className={[
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs leading-none transition-colors duration-200 ease-out",
                      done
                        ? "border-done bg-done text-white"
                        : "border-line text-transparent",
                    ].join(" ")}
                  >
                    ✓
                  </span>
                  <span
                    className={[
                      "text-sm leading-relaxed",
                      done ? "text-muted line-through" : "text-ink",
                    ].join(" ")}
                  >
                    {task.texto}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
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
