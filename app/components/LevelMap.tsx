"use client";

import type { Level } from "@/lib/types";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

export default function LevelMap({
  niveles,
  celebrateLevelId,
}: {
  niveles: Level[];
  celebrateLevelId: string | null;
}) {
  return (
    <section>
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        Mapa de niveles
      </h2>
      <div className="no-scrollbar -mx-2 flex items-start gap-2 overflow-x-auto px-2 pb-2">
        {niveles.map((level, i) => {
          const isDone = level.estado === "done";
          const isActive = level.estado === "active";
          const isLocked = level.estado === "locked";
          const celebrating = celebrateLevelId === level.id;

          return (
            <div key={level.id} className="flex items-start">
              <div className="flex w-32 shrink-0 flex-col items-center text-center">
                <div className="relative">
                  {/* Glow de celebración (gradiente azul-violeta permitido). */}
                  {celebrating && (
                    <span
                      className="celebrate-glow animate-celebrate pointer-events-none absolute inset-0 -m-4 rounded-full"
                      aria-hidden
                    />
                  )}
                  <div
                    className={[
                      "relative flex h-16 w-16 items-center justify-center rounded-full border transition-transform duration-200 ease-out",
                      isDone ? "border-done/40 bg-done/10 text-done" : "",
                      isActive ? "border-2 border-active bg-active/10 text-active shadow-glow" : "",
                      isLocked ? "border-line bg-surface text-muted opacity-30" : "",
                    ].join(" ")}
                  >
                    {isDone ? (
                      <CheckIcon />
                    ) : isLocked ? (
                      <LockIcon />
                    ) : (
                      <span className="text-lg font-semibold tabular-nums">{i + 1}</span>
                    )}
                  </div>
                </div>
                <span
                  className={[
                    "mt-3 text-[13px] leading-tight",
                    isActive ? "font-semibold text-ink" : "text-muted",
                    isLocked ? "opacity-40" : "",
                  ].join(" ")}
                >
                  {level.nombre}
                </span>
              </div>

              {i < niveles.length - 1 && (
                <div
                  className={[
                    "mt-8 h-px w-6 shrink-0",
                    isDone ? "bg-done/40" : "bg-wire",
                  ].join(" ")}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
