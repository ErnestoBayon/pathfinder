// Placeholder por ahora — sin funcionalidad. Lo conectamos después.
export default function NewProjectCard() {
  return (
    <div
      className="flex min-h-[180px] cursor-not-allowed flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-transparent p-5 text-muted opacity-60"
      aria-disabled
      title="Próximamente"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-2xl leading-none">
        +
      </span>
      <span className="text-sm font-medium">Nuevo proyecto</span>
    </div>
  );
}
