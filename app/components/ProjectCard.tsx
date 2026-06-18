import Link from "next/link";
import type { Project } from "@/lib/types";

const DEFAULT_COLOR = "#5B5BD6";

/** Card de proyecto: barra de acento a la izquierda con el color del proyecto.
 *  Lleva a /proyecto/[id]. La barra de progreso es placeholder (0% por ahora). */
export default function ProjectCard({ project }: { project: Project }) {
  const color = project.color ?? DEFAULT_COLOR;
  return (
    <Link
      href={`/proyecto/${project.id}`}
      className="group flex flex-col rounded-2xl border border-[#ECECF1] bg-white p-[22px] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-note-hover"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <h3 className="truncate text-[16px] font-semibold text-ink">{project.nombre}</h3>

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
    </Link>
  );
}
