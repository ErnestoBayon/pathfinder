// Tipos del dominio v2: proyectos y tareas. Sin gamificación (ni niveles, ni quests, ni XP).
// Reflejan las columnas reales de Supabase (tablas `projects`, `tasks`, `activity_log`).

export type TaskState = "pending" | "done";

// Tabla `projects`: id (text), nombre (text), descripcion (text), created_at (timestamptz)
export interface Project {
  id: string;
  nombre: string;
  descripcion: string;
  created_at?: string;
}

// Tabla `tasks`: id (text), project_id (text), texto (text), estado (text 'pending'/'done'),
// deadline (timestamptz nullable), created_at (timestamptz)
export interface Task {
  id: string;
  project_id: string;
  texto: string;
  estado: TaskState;
  deadline?: string | null;
  created_at?: string;
}

// Tabla `activity_log`: id (bigint), project_id (text), timestamp (timestamptz), descripcion (text)
export interface ActivityEntry {
  id: number;
  project_id: string;
  timestamp: string;
  descripcion: string;
}

export type ChatRole = "user" | "assistant";

// Tabla `messages`: id (uuid), project_id (text), role ('user'/'assistant'),
// content (text), created_at (timestamptz). Historial persistente del chat-PM.
export interface Message {
  id: string;
  project_id: string;
  role: ChatRole;
  content: string;
  created_at?: string;
}

/** Resumen de un proyecto para las cards del Home (incluye conteo de tareas pendientes). */
export interface ProjectSummary {
  id: string;
  nombre: string;
  descripcion: string;
  tareasPendientes: number;
}
