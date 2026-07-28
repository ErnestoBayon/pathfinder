"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Navegación entre sub-vistas del proyecto (Overview / Board). Estilo underline
// tipo Linear/Notion: la pestaña activa lleva el token de acento; las inactivas,
// ghost. Patrón reutilizable para futuras sub-vistas (timeline, etc.).
//
// Conserva los query params actuales (filtros) al cambiar de ruta, para que
// pasar de la lista al tablero mantenga prioridad/keystones aplicados.
export default function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  const base = `/proyecto/${projectId}`;
  const isBoard = pathname.endsWith("/board");
  const isCalendar = pathname.endsWith("/calendar");

  const tabs = [
    { label: "Overview", href: `${base}${suffix}`, active: !isBoard && !isCalendar },
    { label: "Board", href: `${base}/board${suffix}`, active: isBoard },
    { label: "Calendar", href: `${base}/calendar${suffix}`, active: isCalendar },
  ];

  return (
    <nav className="mt-6 flex items-center gap-1 border-b border-line" aria-label="Project views">
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={[
            "relative -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-200 ease-out",
            t.active
              ? "border-accent text-accent"
              : "border-transparent text-dim hover:text-ink",
          ].join(" ")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
