// Placeholder por ahora — sin funcionalidad. El modal de "nuevo proyecto" se conecta después.
export default function NewProjectCard() {
  return (
    <div
      className="flex min-h-[160px] cursor-not-allowed flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-transparent p-5 text-muted transition-colors duration-200 ease-out hover:border-accent hover:text-accent"
      aria-disabled
      title="Próximamente"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current text-2xl leading-none">
        +
      </span>
      <span className="text-sm font-medium">Nuevo proyecto</span>
    </div>
  );
}
