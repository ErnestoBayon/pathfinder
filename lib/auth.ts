import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Helpers de autenticación/autorización para route handlers.
// - getAuthUser: resuelve la sesión del usuario a partir de las cookies de la Request (anon key).
// - validateProjectOwnership: confirma con la service role key que un proyecto es del usuario.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set them in .env.local (local) and in Vercel (production).",
  );
}

// Parsea el header Cookie de la Request a la forma { name, value }[] que espera
// el adaptador de @supabase/ssr (él reensambla los chunks `sb-...` por su cuenta).
function parseCookieHeader(request: Request): { name: string; value: string }[] {
  const header = request.headers.get("cookie");
  if (!header) return [];
  return header
    .split(";")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return null;
      return { name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() };
    })
    .filter((c): c is { name: string; value: string } => c !== null && c.name !== "");
}

/**
 * Devuelve el usuario autenticado según las cookies de la Request, o null si no
 * hay sesión válida. Usa la anon key + cookies (respeta RLS); nunca la service key.
 */
export async function getAuthUser(request: Request): Promise<User | null> {
  const cookies = parseCookieHeader(request);
  const client = createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return cookies;
      },
      // Solo leemos al usuario; no hay response donde escribir cookies refrescadas.
      setAll() {},
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error) return null;
  return user ?? null;
}

/**
 * Confirma que el proyecto `projectId` pertenece a `userId`, usando la service role key
 * (sin RLS). Devuelve true si existe esa fila, false si no (o ante cualquier error).
 */
export async function validateProjectOwnership(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return data !== null;
}

// Resuelve el project_id dueño de una tarea (service-role, sin RLS). null si no existe.
export async function projectIdForTask(taskId: string): Promise<string | null> {
  const { data } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle();
  return (data as { project_id: string } | null)?.project_id ?? null;
}
