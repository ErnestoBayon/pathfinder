"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const GUIDE_ITEMS = [
  {
    n: "1",
    title: "Chat with your PM",
    desc: "It creates and suggests tasks for you",
  },
  {
    n: "2",
    title: "Approve or reject AI suggestions",
    desc: "Review tasks before they hit your list",
  },
  {
    n: "3",
    title: "Track deadlines and priorities",
    desc: "List and calendar views keep you on schedule",
  },
] as const;

export function GuideCards() {
  return (
    <div className="flex flex-col gap-3">
      {GUIDE_ITEMS.map((item) => (
        <div
          key={item.n}
          className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas text-sm font-semibold text-accent">
            {item.n}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GuideModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      onClose();
      router.push(`/proyecto/${data.projectId}`);
    } catch {
      setSeedError("Couldn't connect. Check your connection.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-note-hover">
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="guide-modal-title"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            Quick start guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-muted transition-colors duration-200 ease-out hover:bg-canvas hover:text-ink"
          >
            ×
          </button>
        </div>

        <GuideCards />

        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={seeding}
            className="w-full rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-200 ease-out hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {seeding ? "Loading example…" : "Explore an example project"}
          </button>
          {seedError && <p className="text-xs text-red-600">{seedError}</p>}
        </div>
      </div>
    </div>
  );
}
