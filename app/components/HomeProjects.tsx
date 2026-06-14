"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import ProjectCard from "./ProjectCard";
import NewProjectCard from "./NewProjectCard";
import NewProjectModal from "./NewProjectModal";

export default function HomeProjects({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);

  function handleCreated(project: Project) {
    setProjects((prev) => [...prev, project]);
    setModalOpen(false);
  }

  return (
    <>
      {projects.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-6 py-20 text-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl leading-none text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
            aria-label="Crear proyecto"
          >
            +
          </button>
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
          <NewProjectCard onClick={() => setModalOpen(true)} />
        </div>
      )}

      {modalOpen && (
        <NewProjectModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
