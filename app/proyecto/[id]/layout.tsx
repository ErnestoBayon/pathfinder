import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, loadMessages } from "@/lib/store";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";
import ProjectTabs from "../../components/ProjectTabs";
import FloatingChatBubble from "../../components/FloatingChatBubble";

// Lee el proyecto fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

// Layout compartido por las sub-vistas del proyecto (Overview / Board): navbar,
// cabecera del proyecto (acento de color + nombre + descripción) y las pestañas.
// Cada `page.tsx` hijo aporta solo su contenido dentro del mismo contenedor.
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const project = await getProject(params.id).catch(() => null);
  if (!project) notFound();

  const messages = await loadMessages(params.id).catch(() => []);

  return (
    <>
    <div className="min-h-screen">
      {/* Navbar simple */}
      <nav className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-200 ease-out hover:text-ink"
          >
            <span aria-hidden>←</span> Projects
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        {/* Cabecera: acento de color del proyecto + nombre + descripción. */}
        <header>
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
              aria-hidden
            />
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {project.nombre}
            </h1>
          </div>
          {project.descripcion && (
            <div className="mt-2 max-h-28 max-w-2xl overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-500">
              {project.descripcion}
            </div>
          )}
        </header>

        <ProjectTabs projectId={project.id} />

        {children}
      </main>
    </div>
    <FloatingChatBubble projectId={project.id} initialMessages={messages} />
    </>
  );
}
