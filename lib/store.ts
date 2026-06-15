import { supabase } from "./supabase";
import { createClient } from "./supabase/server";
import { PRIORIDAD_ORDEN } from "./types";
import type { ChatRole, Message, Prioridad, Project, Task, TaskState } from "./types";

const TASK_COLS = "id, project_id, texto, estado, prioridad, orden, deadline, created_at";
const MESSAGE_COLS = "id, project_id, role, content, created_at";

const RANK = Object.fromEntries(
  PRIORIDAD_ORDEN.map((p, i) => [p, i]),
) as Record<Prioridad, number>;

// Orden de presentación: alta → media → baja; dentro de cada grupo por `orden`,
// y como desempate por antigüedad (created_at ascendente).
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      RANK[a.prioridad] - RANK[b.prioridad] ||
      a.orden - b.orden ||
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
}

/** Lista los proyectos del usuario autenticado (más reciente al final). */
export async function listProjects(): Promise<Project[]> {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return [];
  // RLS ya filtra por dueño; el .eq es defensa en profundidad por si falta la policy.
  const { data, error } = await db
    .from("projects")
    .select("id, nombre, descripcion, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

/** Crea un proyecto del usuario autenticado y lo devuelve. `descripcion` puede ir vacía. */
export async function createProject(nombre: string, descripcion: string): Promise<Project> {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");
  const id = `proj-${crypto.randomUUID()}`;
  const { data, error } = await db
    .from("projects")
    .insert({ id, nombre, descripcion, user_id: user.id })
    .select("id, nombre, descripcion, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

/** Lee un proyecto por id. RLS lo limita al dueño; devuelve null si no existe o no es tuyo. */
export async function getProject(id: string): Promise<Project | null> {
  const db = createClient();
  const { data, error } = await db
    .from("projects")
    .select("id, nombre, descripcion, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Project | null) ?? null;
}

/** Lista las tareas de un proyecto, ya ordenadas por prioridad y `orden`. */
export async function listTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLS)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  return sortTasks((data ?? []) as Task[]);
}

/** Crea una tarea (estado `pending`) en un proyecto y la devuelve. */
export async function createTask(
  projectId: string,
  texto: string,
  opts: { prioridad?: Prioridad; deadline?: string | null } = {},
): Promise<Task> {
  const id = `task-${crypto.randomUUID()}`;
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      id,
      project_id: projectId,
      texto,
      estado: "pending",
      prioridad: opts.prioridad ?? "media",
      deadline: opts.deadline ?? null,
    })
    .select(TASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

/** Campos editables de una tarea. Todos opcionales: solo se actualiza lo que venga. */
export interface TaskPatch {
  texto?: string;
  estado?: TaskState;
  prioridad?: Prioridad;
  deadline?: string | null;
  orden?: number;
}

/** Aplica un patch parcial a una tarea y devuelve la tarea actualizada. */
export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select(TASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

/** Elimina una tarea por id. */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Carga el historial de chat de un proyecto (más antiguo primero). */
export async function loadMessages(projectId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

/** Guarda un mensaje del chat (el id lo genera la base con gen_random_uuid). */
export async function saveMessage(
  projectId: string,
  role: ChatRole,
  content: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ project_id: projectId, role, content })
    .select(MESSAGE_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Message;
}
