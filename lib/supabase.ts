import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente Supabase con SERVICE ROLE. SOLO server-side.
// `import "server-only"` hace fallar el build si algún componente de cliente lo importa,
// así la service key nunca llega al navegador.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. Configúralas en .env.local (local) y en Vercel (producción).",
  );
}

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
