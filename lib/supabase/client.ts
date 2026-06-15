import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para componentes de cliente ("use client"): anon key + sesión
// en cookies. Lo usan los formularios de auth (login/signup) y el botón de logout.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export function createClient() {
  return createBrowserClient(url!, anonKey!);
}
