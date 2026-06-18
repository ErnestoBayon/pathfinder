// Tipos del dominio v2: proyectos y tareas. Sin gamificación (ni niveles, ni quests, ni XP).
// Reflejan las columnas reales de Supabase (tablas `projects`, `tasks`, `activity_log`).

export type TaskState = "todo" | "doing" | "done";

export type Prioridad = "High" | "Medium" | "Low";

/** Orden de prioridad para ordenar la lista (más urgente primero). */
export const PRIORIDAD_ORDEN: Prioridad[] = ["High", "Medium", "Low"];

// Tabla `projects`: id (text), nombre (text), descripcion (text), created_at (timestamptz)
export interface Project {
  id: string;
  nombre: string;
  descripcion: string;
  /** Color de acento del proyecto (hex). Se usa en la card y su detalle. */
  color?: string;
  created_at?: string;
}

// Tabla `tasks`: id (text), project_id (text), texto (text), estado (text 'pending'/'done'),
// prioridad (text 'High'/'Medium'/'Low', default 'Medium'), orden (integer, default 0),
// deadline (timestamptz nullable), created_at (timestamptz)
export interface Task {
  id: string;
  project_id: string;
  texto: string;
  estado: TaskState;
  prioridad: Prioridad;
  orden: number;
  /** Tarea clave/bloqueante: se marca con ⭐ y siempre queda visible. */
  es_clave: boolean;
  /** Tarea sugerida por la IA, aún no confirmada por el usuario. */
  suggested?: boolean;
  deadline?: string | null;
  created_at?: string;
}

// Tabla `subtasks`: id (uuid), task_id (text, FK → tasks.id), title (text),
// completed (boolean, default false), position (integer), created_at (timestamptz)
export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
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
