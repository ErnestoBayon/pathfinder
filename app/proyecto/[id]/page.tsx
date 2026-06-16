import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectWorkspace from "../../components/ProjectWorkspace";
import MiniCalendar from "../../components/MiniCalendar";
import { getProject, listTasks, loadMessages } from "@/lib/store";

// Lee el estado fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function ProyectoPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id).catch(() => null);
  if (!project) notFound();

  const tasks = await listTasks(params.id).catch(() => []);
  const messages = await loadMessages(params.id).catch(() => []);
  const deadlineDates = tasks.filter((t) => t.deadline).map((t) => t.deadline!.slice(0, 10));

  return (
    <div className="min-h-screen">
      {/* Navbar simple */}
      <nav className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-200 ease-out hover:text-ink"
          >
            <span aria-hidden>←</span> Proyectos
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
        {/* Título y descripción: full width, arriba del grid. */}
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {project.nombre}
          </h1>
          {project.descripcion && (
            <div className="mt-2 max-h-28 max-w-2xl overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-500">
              {project.descripcion}
            </div>
          )}
        </header>

        <ProjectWorkspace
          projectId={project.id}
          initialTasks={tasks}
          initialMessages={messages}
          calendar={<MiniCalendar deadlineDates={deadlineDates} projectId={project.id} />}
        />
      </main>
    </div>
  );
}
