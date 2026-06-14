import ProjectCard from "../components/ProjectCard";
import NewProjectCard from "../components/NewProjectCard";
import { listProjects } from "@/lib/store";

// Lee el estado fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Pathfinder</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Tus proyectos
        </h1>
      </header>

      {projects.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-6 py-20 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl leading-none text-white">
            +
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">Crea tu primer proyecto</h2>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Aún no tienes proyectos. Empieza creando uno para organizar tus tareas.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          <NewProjectCard />
        </div>
      )}
    </main>
  );
}
