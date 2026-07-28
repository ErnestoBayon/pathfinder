"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";

interface ChatMessage {
  role: "user" | "pm";
  text: string;
}

export default function ChatBox({
  projectId,
  initialMessages = [],
  onTasksCreated,
  proactiveGreet = false,
}: {
  projectId?: string;
  initialMessages?: Message[];
  onTasksCreated?: () => void;
  /** Fire a proactive PM greeting once on mount (only when chat history is empty). */
  proactiveGreet?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages.map((m) => ({
      role: m.role === "assistant" ? "pm" : "user",
      text: m.content,
    })),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  useEffect(() => {
    if (!proactiveGreet || !projectId || greetedRef.current) return;
    greetedRef.current = true;

    const FALLBACK = "I had trouble loading suggestions — try sending me a message and I'll take a look.";

    setSending(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ greet: true, projectId }),
    })
      .then((r) => r.json())
      .then((data: { reply?: string; error?: string; toolsUsed?: boolean; noOp?: boolean }) => {
        if (data.noOp) return;
        if (data.reply) {
          if (data.toolsUsed) onTasksCreated?.();
          setMessages((m) => [...m, { role: "pm" as const, text: data.reply! }]);
        } else {
          greetedRef.current = false;
          setMessages((m) => [...m, { role: "pm" as const, text: FALLBACK }]);
        }
      })
      .catch(() => {
        greetedRef.current = false;
        setMessages((m) => [...m, { role: "pm" as const, text: FALLBACK }]);
      })
      .finally(() => {
        setSending(false);
        scrollToBottom();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollToBottom() {
    window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", text }]);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({ message: text, projectId }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        toolsUsed?: boolean;
      };
      if (data.toolsUsed) onTasksCreated?.();
      setMessages((m) => [
        ...m,
        { role: "pm", text: data.reply ?? data.error ?? "Something went wrong. Please try again." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "pm", text: "Couldn't connect. Check your connection." }]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header — "Your PM" in accent green per spec */}
      <div className="mb-4 flex items-center gap-3">
        <AgentAvatar color="#1FA855" state={sending ? "thinking" : "active"} size={40} />
        <h2 className="text-sm font-semibold text-accent">Your PM</h2>
      </div>

      {/* Onboarding hint — green tint, light-mode */}
      {messages.length === 0 && !hintDismissed && (
        <div className="relative mb-4 rounded-xl border border-[rgba(23,138,67,0.2)] bg-[rgba(23,138,67,0.06)] p-4">
          <button
            type="button"
            onClick={() => setHintDismissed(true)}
            aria-label="Dismiss tips"
            className="absolute right-2.5 top-2.5 text-dim transition-colors duration-200 ease-out hover:text-ink"
          >
            ✕
          </button>
          <h3 className="pr-6 text-sm font-semibold text-ink">
            AI PM · How to use your copilot
          </h3>
          <p className="mt-1 text-xs text-dim">Try asking:</p>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {[
              "What tasks do I have pending?",
              "Create a task for data cleaning due next Friday",
              "Break this task into subtasks",
              "Mark the model evaluation task as done",
            ].map((example) => (
              <li key={example}>
                <span className="inline-block rounded-full bg-panel px-3 py-1 text-xs text-ink ring-1 ring-line">
                  {example}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div ref={scrollRef} className="no-scrollbar mb-4 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-dim">
            Tell me what you&apos;re working on or ask me to sort out your tasks. I&apos;m here.
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <span
                className={[
                  "max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-[#EFEFEC] text-ink"
                    : "border border-line bg-panel text-ink",
                ].join(" ")}
              >
                {m.text}
              </span>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <span className="rounded-2xl border border-line bg-panel px-4 py-2.5 text-sm text-dim">
              typing…
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message your PM…"
          disabled={sending}
          className="flex-1 rounded-full border border-line bg-panel px-5 py-3 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-dim focus:border-accent"
        />
        {/* Send — primary CTA style: green, square corners */}
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || input.trim() === ""}
          className="bg-cta px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-cta-hover disabled:opacity-40 disabled:hover:bg-cta"
        >
          Send
        </button>
      </div>
    </div>
  );
}
