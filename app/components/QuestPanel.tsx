"use client";

import { useEffect, useRef, useState } from "react";
import type { MutationResult, Project, Quest } from "@/lib/types";

/** Señal de "esta quest se completó" (id + nonce para re-disparar aunque sea la misma). */
export interface CompletedSignal {
  id: string;
  n: number;
}

export default function QuestPanel({
  project,
  onResult,
  completedSignal,
}: {
  project: Project;
  onResult: (result: MutationResult) => void;
  completedSignal?: CompletedSignal | null;
}) {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [floating, setFloating] = useState<Record<string, number>>({});
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  // Evita doble animación cuando el click ya animó y luego llega la señal del mismo id.
  const animatingRef = useRef<Set<string>>(new Set());

  const activeLevel = project.niveles.find((l) => l.estado === "active");

  /** Rebote del check + XP flotante. Idempotente por id mientras dura la animación. */
  function playCompletionAnim(questId: string, xp: number) {
    if (animatingRef.current.has(questId)) return;
    animatingRef.current.add(questId);

    setFloating((f) => ({ ...f, [questId]: xp }));
    setJustCompleted((s) => new Set(s).add(questId));

    window.setTimeout(() => {
      setFloating((f) => {
        const next = { ...f };
        delete next[questId];
        return next;
      });
      setJustCompleted((s) => {
        const next = new Set(s);
        next.delete(questId);
        return next;
      });
      animatingRef.current.delete(questId);
    }, 320);
  }

  // Completados que llegan desde el chat (u otra ruta) también animan.
  useEffect(() => {
    if (!completedSignal) return;
    const quest = project.niveles
      .flatMap((l) => l.quests)
      .find((q) => q.id === completedSignal.id);
    if (quest) playCompletionAnim(quest.id, quest.xp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSignal?.n]);

  async function completeQuest(quest: Quest) {
    if (quest.estado === "done" || busy.has(quest.id)) return;

    setBusy((s) => new Set(s).add(quest.id));
    // Respuesta inmediata a la acción (optimista); el dedupe evita repetir con la señal.
    playCompletionAnim(quest.id, quest.xp);

    try {
      const res = await fetch("/api/complete-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: quest.id }),
      });
      const data = (await res.json()) as MutationResult;
      onResult(data);
    } finally {
      setBusy((s) => {
        const next = new Set(s);
        next.delete(quest.id);
        return next;
      });
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {activeLevel ? activeLevel.nombre : "¡Todo completado!"}
        </h2>
        {activeLevel && (
          <span className="text-right text-xs text-muted">{activeLevel.descripcion}</span>
        )}
      </div>

      {!activeLevel ? (
        <p className="text-sm text-muted">Cerraste todos los niveles. Bestia. 🎉</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
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
                    "group flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-colors duration-200 ease-out",
                    done ? "cursor-default" : "hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-transform duration-200 ease-out",
                      done
                        ? "border-done bg-done text-canvas"
                        : "border-white/20 text-transparent group-hover:border-active",
                      popping ? "animate-check-pop" : "",
                    ].join(" ")}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>

                  <span
                    className={[
                      "flex-1 text-[15px]",
                      done ? "text-muted line-through" : "text-ink",
                    ].join(" ")}
                  >
                    {quest.texto}
                  </span>

                  <span
                    className={[
                      "shrink-0 text-xs font-semibold tabular-nums",
                      done ? "text-muted" : "text-spark",
                    ].join(" ")}
                  >
                    +{quest.xp} XP
                  </span>
                </button>

                {floatXp !== undefined && (
                  <span
                    className="animate-xp-float pointer-events-none absolute right-3 top-2 text-xs font-bold text-spark [text-shadow:0_0_12px_rgba(255,214,10,0.7)]"
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
