import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase con la SESIÓN del usuario (anon key + cookies). Respeta RLS.
// Para server components y route handlers. NO usa la service role key.
// Úsalo cuando la operación deba ir a nombre del usuario autenticado.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set them in .env.local (local) and in Vercel (production).",
  );
}

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component (no puede escribir cookies).
          // El middleware ya refresca la sesión, así que es seguro ignorar.
        }
      },
    },
  });
}
