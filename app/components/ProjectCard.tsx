"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from "@/lib/colors";

/** Card de proyecto: barra de acento a la izquierda con el color del proyecto.
 *  Lleva a /proyecto/[id]. Un punto de color arriba a la derecha abre un popover
 *  para recolorear el proyecto sin salir del Home. La barra de progreso es
 *  placeholder (0% por ahora). */
export default function ProjectCard({
  project,
  onColorChange,
}: {
  project: Project;
  onColorChange?: (id: string, color: string) => void;
}) {
  const color = project.color ?? DEFAULT_PROJECT_COLOR;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar el popover al hacer click fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(e: React.MouseEvent) {
    // Estamos dentro de un <Link>: frenamos la navegación al tocar el editor.
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  }

  async function pick(e: React.MouseEvent, c: string) {
    e.preventDefault();
    e.stopPropagation();
    if (c === color || saving) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: c }),
      });
      if (res.ok) onColorChange?.(project.id, c);
    } catch {
      // Silencioso: si falla, la card mantiene su color anterior.
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <Link
      href={`/proyecto/${project.id}`}
      className="group relative flex flex-col rounded-2xl border border-[#ECECF1] bg-white p-[22px] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-note-hover"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <h3 className="truncate pr-7 text-[16px] font-semibold text-ink">{project.nombre}</h3>

      <p className="mt-1.5 line-clamp-2 min-h-[42px] text-[13.5px] leading-snug text-[#73737F]">
        {project.descripcion || "No description"}
      </p>

      {/* Barra de progreso (placeholder: 0% por ahora). */}
      <div className="mt-3 h-[5px] w-full overflow-hidden rounded bg-[#EFEFF3]">
        <div className="h-full rounded" style={{ width: 0, backgroundColor: color }} />
      </div>

      <span className="mt-3 text-[13px] font-medium" style={{ color }}>
        View project →
      </span>

      {/* Editor de color: punto + popover de swatches, arriba a la derecha. */}
      <div ref={ref} className="absolute right-3 top-3">
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          aria-label="Change project color"
          aria-haspopup="true"
          aria-expanded={open}
          className="h-[18px] w-[18px] rounded-full ring-1 ring-black/10 transition-transform duration-200 ease-out hover:scale-110 disabled:opacity-50"
          style={{ backgroundColor: color }}
        />
        {open && (
          <div
            role="menu"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute right-0 top-[26px] z-10 flex items-center gap-2 rounded-xl border border-[#ECECF1] bg-white p-2.5 shadow-note-hover"
          >
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="menuitemradio"
                aria-checked={color === c}
                onClick={(e) => pick(e, c)}
                aria-label={`Color ${c}`}
                className="h-5 w-5 rounded-full transition-transform duration-200 ease-out hover:scale-110"
                style={{
                  backgroundColor: c,
                  boxShadow: color === c ? `0 0 0 2px #ffffff, 0 0 0 4px ${c}` : undefined,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
