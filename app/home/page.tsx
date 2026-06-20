import HomeProjects from "../components/HomeProjects";
import LogoutButton from "../components/LogoutButton";
import TopNav from "../components/TopNav";
import { getProjectTaskCounts, listProjects } from "@/lib/store";

// Lee el estado fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();
  // Conteos de tareas (done/total) por proyecto en una sola query, para el progress bar.
  const taskCounts = await getProjectTaskCounts(projects.map((p) => p.id)).catch(() => ({}));

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Pathfinder</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Your projects
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <TopNav />
          <LogoutButton />
        </div>
      </header>

      <HomeProjects initialProjects={projects} taskCounts={taskCounts} />
    </main>
  );
}
