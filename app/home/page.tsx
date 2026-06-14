import HomeProjects from "../components/HomeProjects";
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

      <HomeProjects initialProjects={projects} />
    </main>
  );
}
