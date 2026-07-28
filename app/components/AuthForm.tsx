"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Sign in",
    altText: "Don't have an account?",
    altLink: "Sign up",
    altHref: "/signup",
  },
  signup: {
    title: "Create your account",
    altText: "Already have an account?",
    altLink: "Sign in",
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
      setError("Couldn't connect with Google. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-7 shadow-note">
        <p className="font-mono text-xs font-semibold text-ink">
          dblzero<span className="text-accent">//</span><span className="text-dim">labs</span>
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{copy.title}</h1>

        <button
          type="button"
          onClick={() => void continueWithGoogle()}
          disabled={loading}
          className="mt-6 w-full bg-cta px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-cta-hover disabled:opacity-40 disabled:hover:bg-cta"
        >
          {loading ? "Connecting…" : "Continue with Google"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <p className="mt-5 text-center text-sm text-dim">
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
