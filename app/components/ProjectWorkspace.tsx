"use client";

import { useState, type ReactNode } from "react";
import type { Message, Task } from "@/lib/types";
import TaskList from "./TaskList";
import ChatBox from "./ChatBox";
import SuggestionsPanel from "./SuggestionsPanel";

// Coordina la lista de tareas y el chat (hermanos que comparten `taskVersion`):
// cuando el chat crea/edita tareas, incrementa la versión y TaskList re-lee de Supabase.
// `calendar` es un slot server-rendered (el MiniCalendar) que vive en el sidebar derecho.
export default function ProjectWorkspace({
  projectId,
  initialTasks,
  initialSuggested,
  initialMessages,
  initialSubtaskCounts,
  calendar,
}: {
  projectId: string;
  initialTasks: Task[];
  initialSuggested: Task[];
  initialMessages: Message[];
  initialSubtaskCounts?: Record<string, { total: number; done: number }>;
  calendar?: ReactNode;
}) {
  const [taskVersion, setTaskVersion] = useState(0);
  // Bump compartido: chat y approve/reject lo usan para que TaskList re-lea de Supabase.
  const bumpTasks = () => setTaskVersion((v) => v + 1);

  return (
    <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_3fr]">
      {/* Columna izquierda — panel de sugerencias (si hay) + tareas */}
      <div>
        <SuggestionsPanel initialSuggested={initialSuggested} onChange={bumpTasks} />
        <section className="rounded-2xl border border-line bg-surface shadow-note">
          <TaskList
            projectId={projectId}
            initialTasks={initialTasks}
            initialSubtaskCounts={initialSubtaskCounts}
            taskVersion={taskVersion}
          />
        </section>
      </div>

      {/* Sidebar derecho — zona de widgets */}
      {/* Aquí se pueden agregar: progress bar, métricas, actividad */}
      <div className="flex flex-col gap-4">
        {calendar}
        <section className="flex h-[420px] flex-col rounded-2xl border border-line bg-surface shadow-note">
          <ChatBox
            projectId={projectId}
            initialMessages={initialMessages}
            onTasksCreated={bumpTasks}
            proactiveGreet={initialMessages.length === 0}
          />
        </section>
      </div>
    </div>
  );
}
