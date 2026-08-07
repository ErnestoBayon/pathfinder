"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Prioridad, Task } from "@/lib/types";

// Acento verde de marca para las cards de sugerencia.
const GREEN = "#1FA855";

// Badge de prioridad: el color ilumina, no rellena (mismo lenguaje que TaskList).
const PRIORITY_BADGE: Record<Prioridad, { label: string; color: string; bg: string }> = {
  High: { label: "High", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
  Medium: { label: "Medium", color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  Low: { label: "Low", color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
};

/**
 * Panel de tareas sugeridas por la IA, arriba del listado. Cada sugerencia se
 * aprueba (PATCH suggested=false → pasa al listado) o se rechaza (DELETE → se borra).
 * `onChange` avisa al padre para que TaskList re-lea sus tareas. Si no hay
 * sugerencias, no renderiza nada.
 */
export default function SuggestionsPanel({
  initialSuggested,
  onChange,
}: {
  initialSuggested: Task[];
  onChange?: () => void;
}) {
  const [suggested, setSuggested] = useState<Task[]>(initialSuggested);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(task: Task) {
    if (busyId) return;
    setBusyId(task.id);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggested: false }),
      });
      if (!res.ok) throw new Error();
      setSuggested((prev) => prev.filter((t) => t.id !== task.id));
      onChange?.();
    } catch {
      setError("Couldn't approve the suggestion. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(task: Task) {
    if (busyId) return;
    setBusyId(task.id);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSuggested((prev) => prev.filter((t) => t.id !== task.id));
      onChange?.();
    } catch {
      setError("Couldn't reject the suggestion. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (suggested.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-line bg-panel p-5 shadow-note">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-accent" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">AI Suggestions</h2>
      </div>

      <ul className="flex flex-col gap-2.5">
        {suggested.map((task) => {
          const badge = PRIORITY_BADGE[task.prioridad];
          const busy = busyId === task.id;
          return (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-raise p-3"
              style={{ borderLeft: `4px solid ${GREEN}` }}
            >
              <span className="min-w-0 flex-1 whitespace-normal break-words text-sm text-ink">
                {task.texto}
              </span>

              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.label}
              </span>

              <button
                type="button"
                onClick={() => void approve(task)}
                disabled={busy}
                aria-label="Approve suggestion"
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity duration-200 ease-out hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: GREEN }}
              >
                ✓ Approve
              </button>

              <button
                type="button"
                onClick={() => void reject(task)}
                disabled={busy}
                aria-label="Reject suggestion"
                className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-dim transition-colors duration-200 ease-out hover:text-ink disabled:opacity-40"
              >
                ✗ Reject
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
