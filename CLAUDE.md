# Pathfinder

Task manager **ligero con IA** para Data Scientists. Organiza proyectos y tareas, con un
chat-PM con personalidad que acompaña y ayuda a mantener el ritmo. **Sin gamificación**
(nada de niveles, quests ni XP).

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** para la UI (tema "premium oscuro", ver `DESIGN.md`)
- **Supabase (Postgres)** como persistencia. Tablas: `projects`, `tasks`, `activity_log`.
  El acceso es **solo server-side** con la service role key.
- **API de Claude** (`@anthropic-ai/sdk`, modelo `claude-sonnet-4-6`) para el chat-PM en `/api/chat`.

## Reglas

- **SIEMPRE lee `DESIGN.md` antes de crear o modificar cualquier componente de UI.**

## Estructura

- `app/page.tsx` — landing (`/`): explica el producto y un solo CTA "Entrar" → `/home`.
- `app/api/chat/route.ts` — chat-PM con Claude (cliente Anthropic + voz del PM).
- `app/components/AgentAvatar.tsx` — personaje blob SVG (el PM), estados active/thinking/sleeping.
- `app/components/ChatBox.tsx` — UI del chat-PM (usa AgentAvatar).
- `lib/supabase.ts` — cliente Supabase server-only (service role; nunca llega al cliente).
- `lib/types.ts` — tipos compartidos (`Project`, `Task`, `ProjectSummary`).

## Estado actual (reset v2)

- Gamificación eliminada del codebase (niveles, quests, XP, mapa de niveles, panel de quests).
- Conservados: conexión Supabase, cliente Anthropic, dark theme, `AgentAvatar`, voz del PM.
- Tablas Supabase `projects` / `tasks` / `activity_log` ya creadas.

## Próximos pasos

1. Landing (`/`) — task manager con IA para Data Scientists, CTA "Entrar" → `/home`.
2. Home (`/home`) — grid de cards estilo sticky note, una por proyecto (con tareas pendientes),
   más una card "+" para crear proyecto.
