"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Inicia sesión",
    altText: "¿No tienes cuenta?",
    altLink: "Regístrate",
    altHref: "/signup",
  },
  signup: {
    title: "Crea tu cuenta",
    altText: "¿Ya tienes cuenta?",
    altLink: "Inicia sesión",
    altHref: "/login",
  },
} as const;

export default function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueWithGoogle() {
    if (loading) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    // En éxito el navegador se redirige a Google; solo manejamos el fallo.
    if (error) {
      setError("No se pudo conectar con Google. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-note">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Pathfinder</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{copy.title}</h1>

        <button
          type="button"
          onClick={() => void continueWithGoogle()}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
        >
          {loading ? "Conectando…" : "Continuar con Google"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <p className="mt-5 text-center text-sm text-muted">
          {copy.altText}{" "}
          <Link
            href={copy.altHref}
            className="font-medium text-accent transition-colors duration-200 ease-out hover:text-accent-hover"
          >
            {copy.altLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
