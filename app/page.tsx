import Link from "next/link";

// Landing (/): hero limpio, light mode. Tipografía y espacio en blanco son el diseño.
export default function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Pathfinder</p>

      <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-6xl">
        El task manager con IA para Data Scientists
      </h1>

      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
        Organiza tus proyectos y tareas sin fricción. Tu PM con IA te ayuda a priorizar
        y a mantener el ritmo.
      </p>

      <Link
        href="/home"
        className="mt-10 rounded-lg bg-accent px-7 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
      >
        Entrar
      </Link>
    </main>
  );
}
