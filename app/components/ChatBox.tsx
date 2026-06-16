"use client";

import { useRef, useState } from "react";
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
}: {
  projectId?: string;
  initialMessages?: Message[];
  onTasksCreated?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages.map((m) => ({
      role: m.role === "assistant" ? "pm" : "user",
      text: m.content,
    })),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      // El historial vive en Supabase: /api/chat lo carga y persiste por su cuenta.
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
      // El PM ejecutó tools (creó/actualizó tareas): refrescamos la lista.
      if (data.toolsUsed) onTasksCreated?.();
      setMessages((m) => [
        ...m,
        { role: "pm", text: data.reply ?? data.error ?? "Algo salió mal. Intenta de nuevo." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "pm", text: "No pude conectar. Revisa tu conexión." }]);
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
      <div className="mb-4 flex items-center gap-3">
        <AgentAvatar color="#4F46E5" state={sending ? "thinking" : "active"} size={40} />
        <h2 className="text-sm font-semibold text-ink">Tu PM</h2>
      </div>

      <div ref={scrollRef} className="no-scrollbar mb-4 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Cuéntame en qué andas o pídeme orden con tus tareas. Aquí ando.
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <span
                className={[
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "bg-accent text-white" : "bg-canvas text-ink",
                ].join(" ")}
              >
                {m.text}
              </span>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <span className="rounded-2xl bg-canvas px-4 py-2.5 text-sm text-muted">
              escribiendo…
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escríbele a tu PM…"
          disabled={sending}
          className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-muted focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || input.trim() === ""}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
