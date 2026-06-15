import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectWorkspace from "../../components/ProjectWorkspace";
import { getProject, listTasks, loadMessages } from "@/lib/store";

// Lee el estado fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function ProyectoPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id).catch(() => null);
  if (!project) notFound();

  const tasks = await listTasks(params.id).catch(() => []);
  const messages = await loadMessages(params.id).catch(() => []);
  const hasDeadline = tasks.some((t) => t.deadline);

  return (
    <div className="min-h-screen">
      {/* Navbar simple */}
      <nav className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-200 ease-out hover:text-ink"
          >
            <span aria-hidden>←</span> Proyectos
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-12">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {project.nombre}
          </h1>
          {project.descripcion && (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
              {project.descripcion}
            </p>
          )}
          {hasDeadline && (
            <Link
              href="/calendar"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted transition-colors duration-200 ease-out hover:bg-blue-50 hover:text-accent"
            >
              📅 Ver en calendario
            </Link>
          )}
        </header>

        <ProjectWorkspace
          projectId={project.id}
          initialTasks={tasks}
          initialMessages={messages}
        />
      </main>
    </div>
  );
}
