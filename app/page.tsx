import Link from "next/link";

// Dot-matrix double-zero mark — 5×7 grid per glyph, diagonal slash in accent green.
// Structure copied from marketing/index.html symbol #dm00; fill colors adapted for light bg.
function DotMatrix00({ width = 24, height = 15 }: { width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 11 7" width={width} height={height} aria-hidden="true" focusable="false">
      <g fill="#1F1F1D">
        <circle cx="1.5" cy="0.5" r="0.33"/><circle cx="2.5" cy="0.5" r="0.33"/><circle cx="3.5" cy="0.5" r="0.33"/>
        <circle cx="1.5" cy="6.5" r="0.33"/><circle cx="2.5" cy="6.5" r="0.33"/><circle cx="3.5" cy="6.5" r="0.33"/>
        <circle cx="0.5" cy="1.5" r="0.33"/><circle cx="0.5" cy="2.5" r="0.33"/><circle cx="0.5" cy="3.5" r="0.33"/><circle cx="0.5" cy="4.5" r="0.33"/><circle cx="0.5" cy="5.5" r="0.33"/>
        <circle cx="4.5" cy="1.5" r="0.33"/><circle cx="4.5" cy="2.5" r="0.33"/><circle cx="4.5" cy="3.5" r="0.33"/><circle cx="4.5" cy="4.5" r="0.33"/><circle cx="4.5" cy="5.5" r="0.33"/>
        <circle cx="7.5" cy="0.5" r="0.33"/><circle cx="8.5" cy="0.5" r="0.33"/><circle cx="9.5" cy="0.5" r="0.33"/>
        <circle cx="7.5" cy="6.5" r="0.33"/><circle cx="8.5" cy="6.5" r="0.33"/><circle cx="9.5" cy="6.5" r="0.33"/>
        <circle cx="6.5" cy="1.5" r="0.33"/><circle cx="6.5" cy="2.5" r="0.33"/><circle cx="6.5" cy="3.5" r="0.33"/><circle cx="6.5" cy="4.5" r="0.33"/><circle cx="6.5" cy="5.5" r="0.33"/>
        <circle cx="10.5" cy="1.5" r="0.33"/><circle cx="10.5" cy="2.5" r="0.33"/><circle cx="10.5" cy="3.5" r="0.33"/><circle cx="10.5" cy="4.5" r="0.33"/><circle cx="10.5" cy="5.5" r="0.33"/>
      </g>
      {/* slash dots in accent green */}
      <g fill="#178A43">
        <circle cx="3.5" cy="2.5" r="0.33"/><circle cx="2.5" cy="3.5" r="0.33"/><circle cx="1.5" cy="4.5" r="0.33"/>
        <circle cx="9.5" cy="2.5" r="0.33"/><circle cx="8.5" cy="3.5" r="0.33"/><circle cx="7.5" cy="4.5" r="0.33"/>
      </g>
    </svg>
  );
}

export default function Landing() {
  return (
    <main className="flex min-h-screen flex-col bg-base text-ink">
      {/* Wordmark nav */}
      <header className="flex items-center px-8 py-6">
        <span className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight select-none">
          <DotMatrix00 />
          <span>
            dblzero
            <span className="text-accent">//</span>
            <span className="text-dim">labs</span>
          </span>
        </span>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col justify-center px-8 pb-32 max-w-[960px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint" aria-hidden="true">
          ~/work&nbsp;$ dblzero --next
        </p>

        <h1 className="mt-6 max-w-xl font-mono text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
          A to-do app with a<br />project manager built&nbsp;in.
        </h1>

        <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-dim">
          The manager is an AI: it reads your tasks, sets the order, and tells you what to do next.
        </p>

        {/* Square CTA — border-radius 0, matches marketing .btn.btn-solid */}
        <Link
          href="/home"
          className="mt-10 inline-flex w-fit items-center gap-2.5 bg-cta px-[22px] py-3 font-mono text-xs font-medium uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-cta-hover"
        >
          Enter <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
