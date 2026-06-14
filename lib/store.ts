import { supabase } from "./supabase";
import type { Project } from "./types";

/** Lista los proyectos para el Home (más reciente al final). */
export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, nombre, descripcion, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

/** Lee un proyecto por id. Devuelve null si no existe. */
export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, nombre, descripcion, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Project | null) ?? null;
}
