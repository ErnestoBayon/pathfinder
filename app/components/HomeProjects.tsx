"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import ProjectCard from "./ProjectCard";
import NewProjectCard from "./NewProjectCard";
import NewProjectModal from "./NewProjectModal";
import { GuideCards } from "./GuideModal";

export default function HomeProjects({
  initialProjects,
  taskCounts,
}: {
  initialProjects: Project[];
  taskCounts: Record<string, { done: number; total: number }>;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  function handleCreated(project: Project) {
    setProjects((prev) => [...prev, project]);
    setModalOpen(false);
  }

  function handleColorChange(id: string, color: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, color } : p)));
  }

  async function handleSeedDemo() {
    if (seeding) return;
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/seed-demo", { method: "POST" });
      const data = (await res.json()) as { projectId?: string; error?: string };
      if (!res.ok || !data.projectId) {
        setSeedError(data.error ?? "Couldn't create the example project.");
        return;
      }
      router.push(`/proyecto/${data.projectId}`);
    } catch {
      setSeedError("Couldn't connect. Check your connection.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <>
      {projects.length === 0 ? (
        <div className="mx-auto mt-12 max-w-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Welcome to Pathfinder</h2>
            <p className="mt-2 text-sm text-muted">
              Your AI project manager for planning, prioritizing, and shipping.
            </p>
          </div>

          <div className="mt-8">
            <GuideCards />
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full max-w-xs rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
            >
              Create your first project
            </button>
            <button
              type="button"
              onClick={handleSeedDemo}
              disabled={seeding}
              className="w-full max-w-xs rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-200 ease-out hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {seeding ? "Loading example…" : "Explore an example project"}
            </button>
            {seedError && <p className="text-xs text-red-600">{seedError}</p>}
          </div>
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
