import Link from "next/link";
import type { ProjectSummary } from "@/lib/types";

export default function ProjectCard({ project }: { project: ProjectSummary }) {
  const pct =
    project.questsTotal > 0
      ? Math.round((project.questsDone / project.questsTotal) * 100)
      : 0;

  return (
    <Link
      href={`/proyecto/${project.id}`}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-note transition-all duration-200 ease-out hover:-translate-y-1 hover:border-white/15 hover:shadow-note-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-ink">
          {project.nombre}
        </h3>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-spark">
          {project.xp_total} XP
        </span>
      </div>

      <div className="mt-3">
        <span className="inline-flex items-center rounded-full bg-active/10 px-2.5 py-1 text-xs font-medium text-active">
          {project.nivelActual ?? "Sin nivel activo"}
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
          <span>Avance</span>
          <span className="tabular-nums">
            {project.questsDone}/{project.questsTotal} · {pct}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-done" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-muted">
        <span className="text-muted/70">Próxima: </span>
        <span className="text-ink/90">{project.proximaQuest ?? "¡todo hecho! 🎉"}</span>
      </p>
    </Link>
  );
}
