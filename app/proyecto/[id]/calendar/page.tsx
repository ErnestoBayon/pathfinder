import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProject, listTasks } from "@/lib/store";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";
import CalendarView, { type CalendarTask } from "@/app/components/CalendarView";

export const dynamic = "force-dynamic";

export default async function ProjectCalendarPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProject(params.id).catch(() => null);
  if (!project) notFound();

  const tasks = await listTasks(params.id).catch(() => []);

  const tasksByDate: Record<string, CalendarTask[]> = {};
  for (const t of tasks) {
    if (!t.deadline) continue;
    const date = t.deadline.slice(0, 10);
    if (!tasksByDate[date]) tasksByDate[date] = [];
    tasksByDate[date].push({
      id: t.id,
      title: t.texto,
      priority: t.prioridad,
      projectId: project.id,
      projectName: project.nombre,
      projectColor: project.color ?? DEFAULT_PROJECT_COLOR,
      date,
      completed: t.estado === "done",
    });
  }

  return (
    <div className="mt-8 rounded-2xl border border-line bg-panel p-6 shadow-note">
      <Suspense>
        <CalendarView tasksByDate={tasksByDate} fixedProjectId={project.id} />
      </Suspense>
    </div>
  );
}
