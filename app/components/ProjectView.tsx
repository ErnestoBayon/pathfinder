"use client";

import { useRef, useState } from "react";
import type { MutationResult, Project } from "@/lib/types";
import Header from "./Header";
import LevelMap from "./LevelMap";
import QuestPanel, { type CompletedSignal } from "./QuestPanel";
import ChatBox from "./ChatBox";

export default function ProjectView({ initialProject }: { initialProject: Project }) {
  const [project, setProject] = useState<Project>(initialProject);
  // Nivel que acaba de desbloquearse → dispara la celebración breve en el mapa.
  const [celebrateLevelId, setCelebrateLevelId] = useState<string | null>(null);
  // Señal de quest completada → dispara el rebote + XP flotante, venga del click o del chat.
  const [completedSignal, setCompletedSignal] = useState<CompletedSignal | null>(null);
  const nonce = useRef(0);

  /** Aplica el resultado de una mutación (quest o chat) al estado y lanza animaciones. */
  function applyResult(result: MutationResult) {
    setProject(result.project);
    if (result.completedQuestId) {
      nonce.current += 1;
      setCompletedSignal({ id: result.completedQuestId, n: nonce.current });
    }
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
        <QuestPanel project={project} onResult={applyResult} completedSignal={completedSignal} />
        <div className="border-t border-line" />
        <ChatBox onResult={applyResult} />
      </section>
    </div>
  );
}
