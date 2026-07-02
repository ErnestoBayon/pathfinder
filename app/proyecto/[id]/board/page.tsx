import BoardView from "../../../components/BoardView";
import { loadProjectTasks } from "@/lib/store";

// Lee el estado fresco de Supabase en cada request. La existencia del proyecto
// (y el notFound) la resuelve el layout compartido.
export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: { id: string } }) {
  // Misma fuente de datos que Overview (helper compartido); el tablero solo usa
  // las tareas regulares y sus counts de subtareas.
  const { tasks, subtaskCounts } = await loadProjectTasks(params.id).catch(() => ({
    tasks: [],
    suggested: [],
    subtaskCounts: {},
  }));

  return (
    <BoardView projectId={params.id} initialTasks={tasks} initialSubtaskCounts={subtaskCounts} />
  );
}
