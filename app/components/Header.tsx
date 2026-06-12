"use client";

import type { Project } from "@/lib/types";

function nextDeadline(project: Project): string | null {
  const deadlines = project.niveles
    .flatMap((l) => l.quests)
    .filter((q) => q.estado === "pending" && q.deadline)
    .map((q) => q.deadline as string)
    .sort();
  return deadlines[0] ?? null;
}

export default function Header({ project }: { project: Project }) {
  const nivelActual = project.niveles.find((l) => l.estado === "active");
  const deadline = nextDeadline(project);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Pathfinder</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{project.nombre}</h1>
      </div>

      <dl className="flex items-center gap-6 text-sm">
        <div>
          <dt className="text-xs text-muted">XP total</dt>
          <dd className="font-semibold text-spark tabular-nums">{project.xp_total}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Nivel actual</dt>
          <dd className="font-medium text-active">{nivelActual?.nombre ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Próximo deadline</dt>
          <dd className="font-medium text-ink">
            {deadline ? new Date(deadline).toLocaleDateString("es") : "sin deadline"}
          </dd>
        </div>
      </dl>
    </header>
  );
}
