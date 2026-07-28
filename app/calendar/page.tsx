import { redirect } from "next/navigation";
import { Suspense } from "react";
import LogoutButton from "../components/LogoutButton";
import TopNav from "../components/TopNav";
import CalendarView, { type CalendarTask } from "../components/CalendarView";
import { createClient } from "@/lib/supabase/server";
import { listProjects, listTasks } from "@/lib/store";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";

// Lee el estado fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  // Ruta protegida: sin sesión → /login.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Proyectos del usuario (RLS) y sus tareas. listTasks va por service-role,
  // por eso solo pedimos las de proyectos que ya sabemos que son suyos.
  const projects = await listProjects();
  const perProject = await Promise.all(
    projects.map((p) => listTasks(p.id).catch(() => [])),
  );

  // Agrupa por fecha (YYYY-MM-DD) solo las tareas con deadline.
  const tasksByDate: Record<string, CalendarTask[]> = {};
  projects.forEach((p, idx) => {
    for (const t of perProject[idx]) {
      if (!t.deadline) continue;
      const date = t.deadline.slice(0, 10);
      if (!tasksByDate[date]) tasksByDate[date] = [];
      tasksByDate[date].push({
        id: t.id,
        title: t.texto,
        priority: t.prioridad,
        projectId: p.id,
        projectName: p.nombre,
        projectColor: p.color ?? DEFAULT_PROJECT_COLOR,
        date,
        completed: t.estado === "done",
      });
    }
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold text-ink">
            dblzero<span className="text-accent">//</span><span className="text-dim">labs</span>
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Calendar</h1>
        </div>
        <div className="flex items-center gap-4">
          <TopNav />
          <LogoutButton />
        </div>
      </header>

      <div className="mt-10 rounded-2xl border border-line bg-panel p-6 shadow-note">
        <Suspense>
          <CalendarView tasksByDate={tasksByDate} />
        </Suspense>
      </div>
    </main>
  );
}
