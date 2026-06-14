// Tipos del dominio v2: proyectos y tareas. Sin gamificación (ni niveles, ni quests, ni XP).
// Las columnas reales viven en Supabase (tablas `projects`, `tasks`, `activity_log`);
// estos tipos se afinan al conectar las queries del Home (Paso 4).

export type TaskState = "pending" | "done";

export interface Task {
  id: string;
  project_id: string;
  titulo: string;
  estado: TaskState;
  created_at?: string;
}

export interface Project {
  id: string;
  nombre: string;
  descripcion: string;
  created_at?: string;
}

/** Resumen de un proyecto para las cards del Home (incluye conteo de tareas pendientes). */
export interface ProjectSummary {
  id: string;
  nombre: string;
  descripcion: string;
  tareasPendientes: number;
}
