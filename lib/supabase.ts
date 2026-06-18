import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente Supabase con SERVICE ROLE. SOLO server-side.
// `import "server-only"` hace fallar el build si algún componente de cliente lo importa,
// así la service key nunca llega al navegador.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local (local) and in Vercel (production).",
  );
}

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  // Next.js instrumenta fetch y cachea las lecturas del cliente Supabase en su Data Cache
  // (persiste en .next/cache). Forzamos `no-store` para que las queries SSR siempre lean
  // datos frescos de Postgres (p. ej. un proyecto recién creado aparece de inmediato).
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});
