import Link from "next/link";
import type { Project } from "@/lib/types";

/** Card estilo sticky note: nombre + descripción corta. Lleva a /proyecto/[id]. */
export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/proyecto/${project.id}`}
      className="group flex min-h-[160px] flex-col rounded-2xl border border-line bg-surface p-5 shadow-note transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-note-hover"
    >
      <h3 className="text-lg font-semibold leading-snug tracking-tight text-ink">
        {project.nombre}
      </h3>
      <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted">
        {project.descripcion || "No description"}
      </p>
    </Link>
  );
}
