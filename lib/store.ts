import { supabase } from "./supabase";
import { createClient } from "./supabase/server";
import type { ChatRole, Message, Project, Task, TaskState } from "./types";

const TASK_COLS = "id, project_id, texto, estado, deadline, created_at";
const MESSAGE_COLS = "id, project_id, role, content, created_at";

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

/** Lista las tareas de un proyecto (más antigua primero). */
export async function listTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

/** Crea una tarea (estado `pending`) en un proyecto y la devuelve. */
export async function createTask(
  projectId: string,
  texto: string,
  deadline: string | null = null,
): Promise<Task> {
  const id = `task-${crypto.randomUUID()}`;
  const { data, error } = await supabase
    .from("tasks")
    .insert({ id, project_id: projectId, texto, estado: "pending", deadline })
    .select(TASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

/** Fija el estado de una tarea (`pending`/`done`) y devuelve la tarea actualizada. */
export async function toggleTask(id: string, estado: TaskState): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ estado })
    .eq("id", id)
    .select(TASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
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
