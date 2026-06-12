"use client";

import { useState } from "react";
import type { MutationResult, Project } from "@/lib/types";
import Header from "./Header";
import LevelMap from "./LevelMap";
import QuestPanel from "./QuestPanel";
import ChatBox from "./ChatBox";

export default function ProjectView({ initialProject }: { initialProject: Project }) {
  const [project, setProject] = useState<Project>(initialProject);
  // Nivel que acaba de desbloquearse → dispara la celebración breve en el mapa.
  const [celebrateLevelId, setCelebrateLevelId] = useState<string | null>(null);

  /** Aplica el resultado de una mutación (quest o chat) al estado y lanza animaciones. */
  function applyResult(result: MutationResult) {
    setProject(result.project);
    if (result.unlockedLevelId) {
      setCelebrateLevelId(result.unlockedLevelId);
      window.setTimeout(() => setCelebrateLevelId(null), 600);
    }
  }

  return (
    <div className="flex flex-col gap-14">
      <Header project={project} />

      <LevelMap niveles={project.niveles} celebrateLevelId={celebrateLevelId} />

      <section className="rounded-2xl border border-line bg-surface">
        <QuestPanel project={project} onResult={applyResult} />
        <div className="border-t border-line" />
        <ChatBox onResult={applyResult} />
      </section>
    </div>
  );
}
