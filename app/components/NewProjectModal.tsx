"use client";

import { useEffect, useState } from "react";
import type { Project } from "@/lib/types";
import { PROJECT_COLORS } from "@/lib/colors";

export default function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cerrar con Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nombreTrim = nombre.trim();
    if (!nombreTrim || saving) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreTrim, descripcion: descripcion.trim(), color }),
      });
      const data = (await res.json()) as { project?: Project; error?: string };
      if (!res.ok || !data.project) {
        setError(data.error ?? "Couldn't create the project.");
        return;
      }
      onCreated(data.project);
    } catch {
      setError("Couldn't connect. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />

      {/* Card del modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-note-hover">
        <h2 id="new-project-title" className="text-lg font-semibold tracking-tight text-ink">
          New project
        </h2>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="np-nombre" className="text-sm font-medium text-ink">
              Name <span className="text-accent">*</span>
            </label>
            <input
              id="np-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="My new project"
              autoFocus
              required
              className="rounded-lg border border-line bg-panel px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-dim focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="np-desc" className="text-sm font-medium text-ink">
              Description <span className="text-dim">(optional)</span>
            </label>
            <textarea
              id="np-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="resize-none rounded-lg border border-line bg-panel px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-dim focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Color</span>
            <div className="flex items-center gap-2.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  className="h-6 w-6 rounded-full transition-transform duration-200 ease-out hover:scale-110"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px #111111, 0 0 0 4px ${c}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-dim transition-colors duration-200 ease-out hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || saving}
              className="bg-cta px-5 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-colors duration-200 ease-out hover:bg-cta-hover disabled:opacity-40 disabled:hover:bg-cta"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
