import Link from "next/link";
import AgentAvatar from "./components/AgentAvatar";

// Landing v2 (/): limpia, dark theme, sin nav. Un solo CTA "Entrar" → /home.
export default function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AgentAvatar color="#2997ff" state="active" size={64} />

      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Pathfinder</p>

      <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
        Un task manager ligero
        <br className="hidden sm:block" /> con IA para Data Scientists.
      </h1>

      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
        Organiza tus proyectos y tareas sin fricción.
        <br className="hidden sm:block" /> Tu PM con IA te ayuda a priorizar y a mantener el ritmo.
      </p>

      <Link
        href="/home"
        className="mt-10 rounded-full bg-active px-8 py-3.5 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:scale-[1.03]"
      >
        Entrar
      </Link>
    </main>
  );
}
