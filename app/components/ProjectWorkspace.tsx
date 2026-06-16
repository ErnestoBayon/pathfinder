"use client";

import { useState, type ReactNode } from "react";
import type { Message, Task } from "@/lib/types";
import TaskList from "./TaskList";
import ChatBox from "./ChatBox";

// Coordina la lista de tareas y el chat (hermanos que comparten `taskVersion`):
// cuando el chat crea/edita tareas, incrementa la versión y TaskList re-lee de Supabase.
// `calendar` es un slot server-rendered (el MiniCalendar) que vive en el sidebar derecho.
export default function ProjectWorkspace({
  projectId,
  initialTasks,
  initialMessages,
  calendar,
}: {
  projectId: string;
  initialTasks: Task[];
  initialMessages: Message[];
  calendar?: ReactNode;
}) {
  const [taskVersion, setTaskVersion] = useState(0);

  return (
    <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_3fr]">
      {/* Columna izquierda — tareas */}
      <section className="rounded-2xl border border-line bg-surface shadow-note">
        <TaskList projectId={projectId} initialTasks={initialTasks} taskVersion={taskVersion} />
      </section>

      {/* Sidebar derecho — zona de widgets */}
      {/* Aquí se pueden agregar: progress bar, métricas, actividad */}
      <div className="flex flex-col gap-4">
        {calendar}
        <section className="flex h-[420px] flex-col rounded-2xl border border-line bg-surface shadow-note">
          <ChatBox
            projectId={projectId}
            initialMessages={initialMessages}
            onTasksCreated={() => setTaskVersion((v) => v + 1)}
          />
        </section>
      </div>
    </div>
  );
}
