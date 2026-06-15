"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Inicia sesión",
    submit: "Entrar",
    submitting: "Entrando…",
    altText: "¿No tienes cuenta?",
    altLink: "Regístrate",
    altHref: "/signup",
  },
  signup: {
    title: "Crea tu cuenta",
    submit: "Registrarme",
    submitting: "Creando…",
    altText: "¿Ya tienes cuenta?",
    altLink: "Inicia sesión",
    altHref: "/login",
  },
} as const;

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const correo = email.trim();
    if (!correo || !password || submitting) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: correo, password });
        if (error) {
          setError("Correo o contraseña incorrectos.");
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email: correo, password });
        if (error) {
          setError(
            error.message.toLowerCase().includes("already")
              ? "Ese correo ya está registrado."
              : "No se pudo crear la cuenta. Intenta de nuevo.",
          );
          return;
        }
        // Si el proyecto exige confirmación por correo, aún no hay sesión.
        if (!data.session) {
          setNotice("Te enviamos un correo para confirmar tu cuenta. Revísalo para entrar.");
          return;
        }
      }
      router.push("/home");
      router.refresh();
    } catch {
      setError("No pude conectar. Revisa tu conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-note">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Pathfinder</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{copy.title}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-muted focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-200 ease-out placeholder:text-muted focus:border-accent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-done">{notice}</p>}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="mt-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
          >
            {submitting ? copy.submitting : copy.submit}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {copy.altText}{" "}
          <Link href={copy.altHref} className="font-medium text-accent transition-colors duration-200 ease-out hover:text-accent-hover">
            {copy.altLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
