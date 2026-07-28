"use client";

import { useEffect, useState } from "react";
import { PRIORIDAD_ORDEN } from "@/lib/types";
import type { Prioridad, Task, TaskState } from "@/lib/types";
import { KEYSTONE_COLOR, KEYSTONE_TEXT, KEYSTONE_TINT, PRIORIDAD_COLORS } from "@/lib/colors";
import SubtaskList from "./SubtaskList";

const ESTADO_OPTIONS: { value: TaskState; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "doing", label: "In Progress" },
  { value: "done", label: "Done" },
];

// Modal de detalles de una tarea del tablero. Edita título, prioridad, estado,
// deadline y keystone; incluye la sección de subtareas completa (mismo componente
// que la lista). Guarda via PATCH /api/tasks/[id] en un solo request.
// Nota: el campo `description` no existe en el tipo Task; se omite por ahora.
export default function TaskDetailModal({
  task,
  onUpdate,
  onDelete,
  onTaskCompleted,
  onSummaryChange,
  onClose,
}: {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  onTaskCompleted: (taskId: string) => void;
  onSummaryChange: (taskId: string, s: { total: number; completed: number }) => void;
  onClose: () => void;
}) {
  const [texto, setTexto] = useState(task.texto);
  const [prioridad, setPrioridad] = useState<Prioridad>(task.prioridad);
  const [estado, setEstado] = useState<TaskState>(task.estado);
  const [deadline, setDeadline] = useState(task.deadline?.slice(0, 10) ?? "");
  const [esClave, setEsClave] = useState(task.es_clave);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza el formulario cuando se abre para una tarea diferente.
  useEffect(() => {
    setTexto(task.texto);
    setPrioridad(task.prioridad);
    setEstado(task.estado);
    setDeadline(task.deadline?.slice(0, 10) ?? "");
    setEsClave(task.es_clave);
    setConfirmDelete(false);
    setError(null);
  }, [task.id]);

  // Escape cierra el modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isDirty =
    texto.trim() !== task.texto ||
    prioridad !== task.prioridad ||
    estado !== task.estado ||
    deadline !== (task.deadline?.slice(0, 10) ?? "") ||
    esClave !== task.es_clave;

  async function save() {
    const trimmed = texto.trim();
    if (!trimmed) return;
    const patch: Record<string, unknown> = {};
    if (trimmed !== task.texto) patch.texto = trimmed;
    if (prioridad !== task.prioridad) patch.prioridad = prioridad;
    if (estado !== task.estado) patch.estado = estado;
    const origDeadline = task.deadline?.slice(0, 10) ?? "";
    if (deadline !== origDeadline) patch.deadline = deadline || null;
    if (esClave !== task.es_clave) patch.es_clave = esClave;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { task?: Task; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      onUpdate(data.task!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't delete");
      onDelete(task.id);
    } catch {
      setError("Couldn't delete the task.");
      setDeleting(false);
    }
  }

  const st = PRIORIDAD_COLORS[prioridad];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        className="relative z-10 my-auto w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-note-hover"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título + cierre */}
        <div className="mb-5 flex items-start gap-3">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
            }}
            placeholder="Task title"
            className={[
              "min-w-0 flex-1 rounded-lg border border-line bg-base px-3 py-2 text-base font-medium outline-none transition-colors duration-200 ease-out focus:border-accent",
              estado === "done" ? "text-dim line-through" : "text-ink",
            ].join(" ")}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-1 shrink-0 rounded-lg p-1 text-xl leading-none text-dim transition-colors duration-200 ease-out hover:text-ink"
          >
            ×
          </button>
        </div>

        {/* Metadatos: prioridad, estado, deadline, keystone */}
        <div className="mb-5 flex flex-wrap gap-2">
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value as Prioridad)}
            aria-label="Priority"
            className="cursor-pointer appearance-none rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors duration-200 ease-out"
            style={{ color: st.dot, backgroundColor: st.tint, borderColor: `${st.dot}60` }}
          >
            {PRIORIDAD_ORDEN.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as TaskState)}
            aria-label="Status"
            className="cursor-pointer appearance-none rounded-full border border-line bg-base px-3 py-1 text-xs font-medium text-ink outline-none transition-colors duration-200 ease-out hover:border-accent"
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Deadline"
            className="cursor-pointer rounded-full border border-line bg-base px-3 py-1 text-xs text-ink outline-none transition-colors duration-200 ease-out hover:border-accent"
          />

          <button
            type="button"
            onClick={() => setEsClave(!esClave)}
            aria-pressed={esClave}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out",
              esClave ? "" : "border-line bg-panel text-dim hover:text-ink",
            ].join(" ")}
            style={
              esClave
                ? { backgroundColor: KEYSTONE_TINT, borderColor: KEYSTONE_COLOR, color: KEYSTONE_TEXT }
                : undefined
            }
          >
            <span style={{ color: KEYSTONE_COLOR }} aria-hidden>
              ★
            </span>
            Keystone
          </button>
        </div>

        {/* Subtareas — mismo componente que la lista */}
        <div className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dim">
            Subtasks
          </h3>
          <SubtaskList
            taskId={task.id}
            onSummaryChange={(s) => onSummaryChange(task.id, s)}
            onTaskCompleted={() => {
              setEstado("done");
              onTaskCompleted(task.id);
            }}
          />
        </div>

        {/* Footer: borrar (izq) + guardar (der) */}
        <div className="flex items-center gap-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink">Delete this task?</span>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors duration-200 ease-out hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full border border-line px-3 py-1 text-xs font-medium text-dim transition-colors duration-200 ease-out hover:text-ink"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-dim transition-colors duration-200 ease-out hover:border-red-300 hover:text-red-600"
            >
              Delete
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-dim transition-colors duration-200 ease-out hover:text-ink"
            >
              {isDirty ? "Discard" : "Close"}
            </button>
            {isDirty && (
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !texto.trim()}
                className="rounded-full bg-cta px-4 py-1.5 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-cta-hover disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
