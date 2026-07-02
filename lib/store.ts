import { supabase } from "./supabase";
import { createClient } from "./supabase/server";
import { DEFAULT_PROJECT_COLOR } from "./colors";
import { PRIORIDAD_ORDEN } from "./types";
import type { ChatRole, Message, Prioridad, Project, Subtask, Task, TaskState } from "./types";

const TASK_COLS = "id, project_id, texto, estado, prioridad, orden, es_clave, suggested, deadline, created_at";
const MESSAGE_COLS = "id, project_id, role, content, created_at";
const SUBTASK_COLS = "id, task_id, title, completed, position, created_at";

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
    .select("id, nombre, descripcion, color, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

/** Crea un proyecto del usuario autenticado y lo devuelve. `descripcion` puede ir vacía. */
export async function createProject(
  nombre: string,
  descripcion: string,
  color: string = DEFAULT_PROJECT_COLOR,
): Promise<Project> {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("No active session.");
  const id = `proj-${crypto.randomUUID()}`;
  const { data, error } = await db
    .from("projects")
    .insert({ id, nombre, descripcion, color, user_id: user.id })
    .select("id, nombre, descripcion, color, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

/** Lee un proyecto por id. RLS lo limita al dueño; devuelve null si no existe o no es tuyo. */
export async function getProject(id: string): Promise<Project | null> {
  const db = createClient();
  const { data, error } = await db
    .from("projects")
    .select("id, nombre, descripcion, color, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Project | null) ?? null;
}

/** Campos editables de un proyecto. Todos opcionales: solo se actualiza lo que venga. */
export interface ProjectPatch {
  nombre?: string;
  descripcion?: string;
  color?: string;
}

/** Aplica un patch parcial a un proyecto y devuelve el proyecto actualizado.
 *  RLS limita la fila al dueño; el `.eq("id", id)` apunta a la fila concreta. */
export async function updateProject(id: string, patch: ProjectPatch): Promise<Project> {
  const db = createClient();
  const { data, error } = await db
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("id, nombre, descripcion, color, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

/**
 * Cuenta total y completadas (estado 'done') de tareas para varios proyectos en
 * un solo SELECT (sin N+1). Devuelve un mapa project_id → { done, total };
 * proyectos sin tareas no aparecen (el caller asume 0/0).
 */
export async function getProjectTaskCounts(
  projectIds: string[],
): Promise<Record<string, { done: number; total: number }>> {
  if (projectIds.length === 0) return {};
  const { data, error } = await supabase
    .from("tasks")
    .select("project_id, estado")
    .in("project_id", projectIds);
  if (error) throw new Error(error.message);

  const counts: Record<string, { done: number; total: number }> = {};
  for (const row of (data ?? []) as { project_id: string; estado: TaskState }[]) {
    const c = (counts[row.project_id] ??= { done: 0, total: 0 });
    c.total += 1;
    if (row.estado === "done") c.done += 1;
  }
  return counts;
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

/**
 * Carga las tareas de un proyecto en una sola query y las separa en regulares
 * (para el listado / tablero) y sugeridas por la IA (panel de approve/reject),
 * más los counts de subtareas de las regulares. Fuente única compartida por la
 * vista Overview y la ruta Board para no duplicar la orquestación de queries.
 */
export async function loadProjectTasks(projectId: string): Promise<{
  tasks: Task[];
  suggested: Task[];
  subtaskCounts: Record<string, { total: number; done: number }>;
}> {
  const all = await listTasks(projectId);
  const tasks = all.filter((t) => !t.suggested);
  const suggested = all.filter((t) => t.suggested);
  const subtaskCounts = await getSubtaskCounts(tasks.map((t) => t.id));
  return { tasks, suggested, subtaskCounts };
}

/** Crea una tarea (estado `pending`) en un proyecto y la devuelve. */
export async function createTask(
  projectId: string,
  texto: string,
  opts: { prioridad?: Prioridad; deadline?: string | null; suggested?: boolean } = {},
): Promise<Task> {
  const id = `task-${crypto.randomUUID()}`;
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      id,
      project_id: projectId,
      texto,
      estado: "todo",
      prioridad: opts.prioridad ?? "Medium",
      deadline: opts.deadline ?? null,
      suggested: opts.suggested ?? false,
    })
    .select(TASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

/**
 * Crea una tarea sugerida por la IA (suggested=true, fijado por la función, no
 * por el modelo) para que el usuario la apruebe o rechace en el panel.
 */
export async function createSuggestedTask(
  projectId: string,
  texto: string,
  opts: { prioridad?: Prioridad; deadline?: string | null } = {},
): Promise<Task> {
  return createTask(projectId, texto, { ...opts, suggested: true });
}

/** Campos editables de una tarea. Todos opcionales: solo se actualiza lo que venga. */
export interface TaskPatch {
  texto?: string;
  estado?: TaskState;
  prioridad?: Prioridad;
  deadline?: string | null;
  orden?: number;
  es_clave?: boolean;
  suggested?: boolean;
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

/** Lista las subtareas de una tarea, ordenadas por `position` ascendente. */
export async function listSubtasks(taskId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from("subtasks")
    .select(SUBTASK_COLS)
    .eq("task_id", taskId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Subtask[];
}

/**
 * Crea una subtarea al final de la lista. La `position` es el conteo de subtareas
 * existentes para esa tarea (0-based). El id (uuid) y created_at los pone la base.
 */
export async function createSubtask(taskId: string, title: string): Promise<Subtask> {
  const { count, error: countError } = await supabase
    .from("subtasks")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId);
  if (countError) throw new Error(countError.message);

  const { data, error } = await supabase
    .from("subtasks")
    .insert({ task_id: taskId, title, completed: false, position: count ?? 0 })
    .select(SUBTASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Subtask;
}

/**
 * Cuenta total y completadas de subtareas para varias tareas en un solo SELECT.
 * Devuelve un mapa task_id → { total, done }; tareas sin subtareas no aparecen.
 */
export async function getSubtaskCounts(
  taskIds: string[],
): Promise<Record<string, { total: number; done: number }>> {
  if (taskIds.length === 0) return {};
  const { data, error } = await supabase
    .from("subtasks")
    .select("task_id, completed")
    .in("task_id", taskIds);
  if (error) throw new Error(error.message);

  const counts: Record<string, { total: number; done: number }> = {};
  for (const row of (data ?? []) as { task_id: string; completed: boolean }[]) {
    const c = (counts[row.task_id] ??= { total: 0, done: 0 });
    c.total += 1;
    if (row.completed) c.done += 1;
  }
  return counts;
}

/** Campos editables de una subtarea. Solo se actualiza lo que venga. */
export interface SubtaskPatch {
  title?: string;
  completed?: boolean;
}

/** Aplica un patch parcial a una subtarea y devuelve la subtarea actualizada. */
export async function updateSubtask(id: string, patch: SubtaskPatch): Promise<Subtask> {
  const { data, error } = await supabase
    .from("subtasks")
    .update(patch)
    .eq("id", id)
    .select(SUBTASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Subtask;
}

/** Elimina una subtarea por id. */
export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
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
