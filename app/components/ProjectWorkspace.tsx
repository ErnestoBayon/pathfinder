"use client";

import { useState } from "react";
import type { Message, Task } from "@/lib/types";
import TaskList from "./TaskList";
import ChatBox from "./ChatBox";

// Coordina la lista de tareas y el chat (componentes hermanos). Cuando el chat
// crea tareas, incrementa `taskVersion` para que TaskList vuelva a leer de Supabase.
export default function ProjectWorkspace({
  projectId,
  initialTasks,
  initialMessages,
}: {
  projectId: string;
  initialTasks: Task[];
  initialMessages: Message[];
}) {
  const [taskVersion, setTaskVersion] = useState(0);

  return (
    <>
      <section className="mt-10 rounded-2xl border border-line bg-surface shadow-note">
        <TaskList projectId={projectId} initialTasks={initialTasks} taskVersion={taskVersion} />
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface shadow-note">
        <ChatBox
          projectId={projectId}
          initialMessages={initialMessages}
          onTasksCreated={() => setTaskVersion((v) => v + 1)}
        />
      </section>
    </>
  );
}
