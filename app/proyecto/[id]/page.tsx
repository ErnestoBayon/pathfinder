import { notFound } from "next/navigation";
import ProjectWorkspace from "../../components/ProjectWorkspace";
import MiniCalendar from "../../components/MiniCalendar";
import { getProject, loadProjectTasks, loadMessages } from "@/lib/store";

// Lee el estado fresco de Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function ProyectoPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id).catch(() => null);
  if (!project) notFound();

  // Una sola lectura de tareas: separa las regulares (listado) de las sugeridas
  // por la IA (panel de approve/reject) y trae los counts de subtareas.
  const { tasks, suggested, subtaskCounts } = await loadProjectTasks(params.id).catch(() => ({
    tasks: [],
    suggested: [],
    subtaskCounts: {},
  }));
  const messages = await loadMessages(params.id).catch(() => []);
  const deadlineDates = tasks.filter((t) => t.deadline).map((t) => t.deadline!.slice(0, 10));

  return (
    <ProjectWorkspace
      projectId={project.id}
      initialTasks={tasks}
      initialSuggested={suggested}
      initialMessages={messages}
      initialSubtaskCounts={subtaskCounts}
      calendar={<MiniCalendar deadlineDates={deadlineDates} projectId={project.id} />}
    />
  );
}
