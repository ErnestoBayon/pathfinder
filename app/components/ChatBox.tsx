"use client";

import { useRef, useState } from "react";
import type { MutationResult } from "@/lib/types";

interface ChatMessage {
  role: "user" | "pm";
  text: string;
}

interface ChatResponse extends MutationResult {
  reply?: string;
  error?: string;
}

export default function ChatBox({
  onResult,
}: {
  onResult: (result: MutationResult) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as ChatResponse;

      if (!res.ok || data.error) {
        setMessages((m) => [
          ...m,
          { role: "pm", text: data.error ?? "Algo salió mal. Intenta de nuevo." },
        ]);
      } else {
        if (data.reply) setMessages((m) => [...m, { role: "pm", text: data.reply as string }]);
        if (data.project) onResult(data);
      }
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
    <div className="flex flex-col p-5">
      <h2 className="mb-3 text-sm font-medium text-muted">Tu PM</h2>

      <div ref={scrollRef} className="no-scrollbar mb-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Cuéntame qué avanzaste o pídeme una tarea nueva. Yo llevo la cuenta.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <span
                className={[
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                  m.role === "user"
                    ? "bg-active text-white"
                    : "bg-canvas text-ink",
                ].join(" ")}
              >
                {m.text}
              </span>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <span className="rounded-2xl bg-canvas px-3.5 py-2 text-sm text-muted">
              escribiendo…
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escríbele a tu PM…"
          disabled={sending}
          className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-muted focus:border-active"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || input.trim() === ""}
          className="rounded-lg bg-active px-4 py-2 text-sm font-medium text-white transition-transform duration-200 ease-out hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
