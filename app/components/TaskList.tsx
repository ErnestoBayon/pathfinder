"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/types";

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

  // Re-lee las tareas cuando el padre incrementa la versión (p. ej. el chat creó
  // tareas). Saltamos el primer render: initialTasks ya trae el estado fresco del SSR.
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

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditText(task.texto);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function commitEdit(task: Task) {
    const value = editText.trim();
    // Sin cambios o vacío: salimos sin tocar nada.
    if (!value || value === task.texto) {
      cancelEdit();
      return;
    }
    cancelEdit();
    // Optimista: aplicamos el nuevo texto y revertimos si el PATCH falla.
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, texto: value } : t)));
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, texto: task.texto } : t)));
      setError("No pude guardar el cambio. Intenta de nuevo.");
    }
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
            const editing = editingId === task.id;
            return (
              <li key={task.id}>
                <div className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-200 ease-out hover:bg-canvas">
                  <button
                    type="button"
                    onClick={() => void toggle(task)}
                    aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
                    className={[
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs leading-none transition-colors duration-200 ease-out",
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
                          void commitEdit(task);
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
                        void commitEdit(task);
                      }}
                      className="flex-1 rounded-md border border-accent bg-surface px-2 py-0.5 text-sm leading-relaxed text-ink outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(task)}
                      className={[
                        "flex-1 cursor-text text-sm leading-relaxed",
                        done ? "text-muted line-through" : "text-ink",
                      ].join(" ")}
                    >
                      {task.texto}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => void remove(task)}
                    aria-label="Eliminar tarea"
                    className="shrink-0 rounded-md px-1.5 text-base leading-none text-muted opacity-0 transition-opacity duration-200 ease-out hover:text-ink group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
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
