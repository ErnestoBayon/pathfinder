import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectView from "../../components/ProjectView";
import { readProject } from "@/lib/store";

// Lee el estado fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function ProyectoPage({ params }: { params: { id: string } }) {
  const project = await readProject(params.id).catch(() => null);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-ink"
      >
        <span aria-hidden>←</span> Proyectos
      </Link>

      <div className="mt-6">
        <ProjectView initialProject={project} />
      </div>
    </main>
  );
}
