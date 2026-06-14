import ProjectCard from "./components/ProjectCard";
import NewProjectCard from "./components/NewProjectCard";
import { listProjects } from "@/lib/store";

// Lee el estado fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Pathfinder</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Tus proyectos
        </h1>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        <NewProjectCard />
      </div>
    </main>
  );
}
