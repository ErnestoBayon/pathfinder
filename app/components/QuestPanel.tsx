"use client";

import { useState } from "react";
import type { MutationResult, Project, Quest } from "@/lib/types";

export default function QuestPanel({
  project,
  onResult,
}: {
  project: Project;
  onResult: (result: MutationResult) => void;
}) {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [floating, setFloating] = useState<Record<string, number>>({});
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  const activeLevel = project.niveles.find((l) => l.estado === "active");

  async function completeQuest(quest: Quest) {
    if (quest.estado === "done" || busy.has(quest.id)) return;

    setBusy((s) => new Set(s).add(quest.id));
    // XP flotante: respuesta inmediata a la acción.
    setFloating((f) => ({ ...f, [quest.id]: quest.xp }));

    try {
      const res = await fetch("/api/complete-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: quest.id }),
      });
      const data = (await res.json()) as MutationResult;
      setJustCompleted((s) => new Set(s).add(quest.id));
      onResult(data);
    } finally {
      window.setTimeout(() => {
        setFloating((f) => {
          const next = { ...f };
          delete next[quest.id];
          return next;
        });
        setBusy((s) => {
          const next = new Set(s);
          next.delete(quest.id);
          return next;
        });
      }, 320);
      window.setTimeout(() => {
        setJustCompleted((s) => {
          const next = new Set(s);
          next.delete(quest.id);
          return next;
        });
      }, 300);
    }
  }

  return (
    <div className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">
          {activeLevel ? activeLevel.nombre : "¡Todo completado!"}
        </h2>
        {activeLevel && (
          <span className="text-xs text-muted">{activeLevel.descripcion}</span>
        )}
      </div>

      {!activeLevel ? (
        <p className="text-sm text-muted">
          Cerraste todos los niveles. Bestia. 🎉
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {activeLevel.quests.map((quest) => {
            const done = quest.estado === "done";
            const popping = justCompleted.has(quest.id);
            const floatXp = floating[quest.id];

            return (
              <li key={quest.id} className="relative">
                <button
                  type="button"
                  onClick={() => completeQuest(quest)}
                  disabled={done || busy.has(quest.id)}
                  className={[
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 ease-out",
                    done ? "cursor-default" : "hover:bg-canvas",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-transform duration-200 ease-out",
                      done
                        ? "border-done bg-done text-white"
                        : "border-line text-transparent group-hover:border-active",
                      popping ? "animate-check-pop" : "",
                    ].join(" ")}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>

                  <span
                    className={[
                      "flex-1 text-sm",
                      done ? "text-muted line-through" : "text-ink",
                    ].join(" ")}
                  >
                    {quest.texto}
                  </span>

                  <span
                    className={[
                      "shrink-0 text-xs font-medium tabular-nums",
                      done ? "text-muted" : "text-spark",
                    ].join(" ")}
                  >
                    +{quest.xp} XP
                  </span>
                </button>

                {floatXp !== undefined && (
                  <span
                    className="animate-xp-float pointer-events-none absolute right-3 top-1 text-xs font-semibold text-spark"
                    aria-hidden
                  >
                    +{floatXp} XP
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
