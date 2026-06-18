"use client";

/** Card "+" para crear un proyecto. Abre el modal vía onClick. */
export default function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-transparent p-5 text-muted transition-colors duration-200 ease-out hover:border-accent hover:text-accent"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current text-2xl leading-none">
        +
      </span>
      <span className="text-sm font-medium">New project</span>
    </button>
  );
}
