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

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={["text-3xl font-semibold tabular-nums tracking-tight", tone ?? "text-ink"].join(" ")}>
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

export default function Header({ project }: { project: Project }) {
  const nivelActual = project.niveles.find((l) => l.estado === "active");
  const deadline = nextDeadline(project);

  return (
    <header className="flex flex-col gap-8 pt-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Pathfinder</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {project.nombre}
        </h1>
      </div>

      <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
        <Stat label="XP total" value={String(project.xp_total)} tone="text-spark" />
        <Stat label="Nivel actual" value={nivelActual?.nombre ?? "—"} tone="text-active" />
        <Stat
          label="Próximo deadline"
          value={deadline ? new Date(deadline).toLocaleDateString("es") : "Sin deadline"}
        />
      </div>
    </header>
  );
}
