"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import ProjectCard from "./ProjectCard";
import NewProjectCard from "./NewProjectCard";
import NewProjectModal from "./NewProjectModal";

export default function HomeProjects({
  initialProjects,
  taskCounts,
}: {
  initialProjects: Project[];
  taskCounts: Record<string, { done: number; total: number }>;
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);

  function handleCreated(project: Project) {
    setProjects((prev) => [...prev, project]);
    setModalOpen(false);
  }

  function handleColorChange(id: string, color: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, color } : p)));
  }

  return (
    <>
      {projects.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-6 py-20 text-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl leading-none text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
            aria-label="Create project"
          >
            +
          </button>
          <h2 className="mt-5 text-lg font-semibold text-ink">Create your first project</h2>
          <p className="mt-2 max-w-xs text-sm text-muted">
            You don't have any projects yet. Start by creating one to organize your tasks.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              taskCount={taskCounts[p.id]}
              onColorChange={handleColorChange}
            />
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
