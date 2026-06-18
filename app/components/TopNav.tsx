"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export default function TopNav() {
  const pathname = usePathname();

  const links = [
    { href: "/home", label: "Projects", icon: null as React.ReactNode },
    { href: "/calendar", label: "Calendar", icon: <CalendarIcon /> },
  ];

  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        // "Proyectos" también queda activo dentro de un proyecto.
        const active =
          pathname === l.href || (l.href === "/home" && pathname.startsWith("/proyecto"));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 ease-out",
              active ? "bg-accent/10 text-accent" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {l.icon}
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
