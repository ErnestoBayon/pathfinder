# Pathfinder

Project manager personal **gamificado** para proyectos técnicos. Cada proyecto avanza por
niveles tipo videojuego: completas quests, ganas XP, desbloqueas el siguiente nivel y un
chat-PM con personalidad te acompaña reconociendo hitos y rachas.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** para la UI
- **Supabase (Postgres)** como persistencia del estado del proyecto (tablas `projects`,
  `levels`, `quests`, `activity_log`). El acceso es **solo server-side** con la service role key.
- **JSON local** solo para `data/templates.json` (referencia) y `data/project.json` (fuente del seed).
- **API de Claude** (`@anthropic-ai/sdk`, modelo `claude-sonnet-4-6`) para el chat-PM en `/api/chat`

## Reglas

- **SIEMPRE lee `DESIGN.md` antes de crear o modificar cualquier componente de UI.**
- **TODA acción de la app se registra en `activity_log`** (tabla en Supabase)
  (tipos: `quest_completed`, `quest_added`, `message`, `level_unlocked`).
- La **etapa de la mascota se calcula** del estado del proyecto, nunca se persiste.

## Estructura

- `app/page.tsx` — página principal (mapa de niveles + panel de quest + chat).
- `app/api/chat/route.ts` — chat-PM con Claude; aplica acciones y registra en el log.
- `app/api/complete-quest/route.ts` — marca quests, suma XP, desbloquea niveles.
- `lib/store.ts` — lectura/escritura del estado contra Supabase (queries dirigidas).
- `lib/supabase.ts` — cliente Supabase server-only (service role; nunca llega al cliente).
- `lib/types.ts` — tipos compartidos.
- `supabase/migrations/0001_init.sql` — esquema de la base.
- `scripts/seed.ts` — migra `data/project.json` a Supabase (`npm run seed`, idempotente).
- `data/` — `templates.json` (referencia) y `project.json` (fuente del seed).

## Estado actual

- **Core loop funcionando:** niveles con quests y XP; completar una quest suma XP, y al cerrar
  todas las de un nivel este pasa a `done` y desbloquea el siguiente con celebración.
- **Chat-PM con acciones:** `/api/chat` llama a Claude (`claude-sonnet-4-6`), responde con tono de
  PM y aplica acciones (`complete_quest` / `add_quest` / `none`) sobre el estado.
- **`activity_log`** registrando toda acción (quests, mensajes, desbloqueos).
- **Rediseño "premium oscuro"** aplicado a toda la UI según la nueva `DESIGN.md`.
- **Componente `AgentAvatar`** (personaje blob SVG) integrado como el PM en el chat, con estados
  active / thinking / sleeping.
- **Voz del PM** afinada (sección "Voz del PM" en `DESIGN.md`).
- **Persistencia en Supabase (nivel pb-4):** el estado vive en Postgres. Flujo completo verificado
  en local — completar quest por click y por chat persiste y sobrevive a reload. El repo está en
  GitHub y desplegable en Vercel.

## Próxima sesión

1. En Vercel: agregar las tres env vars (`ANTHROPIC_API_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`) y hacer **Redeploy** para que producción quede 100% funcional.
2. Marcar de verdad las quests del nivel **Persistencia** (ya está hecho el trabajo).
3. Avanzar a los niveles **Interfaz / Deploy / Feedback**.
4. Más adelante: empezar la **criatura del proyecto** (mascota que evoluciona por niveles).
