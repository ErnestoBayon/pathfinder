"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { Message } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";
import ChatBox from "./ChatBox";

/**
 * Floating PM chat bubble rendered from the project layout. Visible only on
 * /board (hidden via CSS on Overview). Always mounted so ChatBox message state
 * survives Board↔Overview tab navigation within the same layout session.
 *
 * Deviations from spec:
 * - SuggestionsPanel omitted: requires loading suggested tasks (extra fetch) and
 *   is redundant when the board already shows all task columns.
 * - Unread badge omitted: ChatBox exposes no onPMReply callback; adding one would
 *   require modifying ChatBox against the "as-is" constraint.
 */
export default function FloatingChatBubble({
  projectId,
  initialMessages,
}: {
  projectId: string;
  initialMessages: Message[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isBoard = pathname.endsWith("/board");

  // Outer wrapper uses CSS hide (not conditional return) so ChatBox stays mounted
  // across route changes and messages persist through minimize/expand cycles.
  return (
    <div className={isBoard ? undefined : "hidden"} aria-hidden={!isBoard || undefined}>
      {/* Collapsed bubble — fixed bottom-right, visible when panel is closed */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open PM chat"
        className={[
          "fixed bottom-10 right-6 z-[60]",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-indigo-600 shadow-lg transition-colors duration-200 ease-out",
          "hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
          open ? "hidden" : "",
        ].join(" ")}
      >
        <AgentAvatar color="#ffffff" state="active" size={28} />
      </button>

      {/* Expanded panel — fixed to bottom-right, grows upward. `fixed` is the only
          position declaration; `relative` must NOT appear here or it overrides `fixed`. */}
      <div
        className={[
          "fixed bottom-10 right-6 z-[60]",
          "h-[520px] max-h-[calc(100vh-5rem)] w-96 overflow-hidden rounded-2xl",
          "border border-line bg-surface",
          "shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/10",
          !open ? "hidden" : "",
        ].join(" ")}
      >
        {/* Minimize control — overlaid on ChatBox's own header area */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Minimize chat"
          className="absolute right-4 top-5 z-10 rounded-full p-1.5 text-muted transition-colors duration-200 ease-out hover:bg-canvas hover:text-ink"
        >
          <ChevronDown size={15} aria-hidden />
        </button>
        <div className="h-full">
          <ChatBox projectId={projectId} initialMessages={initialMessages} />
        </div>
      </div>
    </div>
  );
}
