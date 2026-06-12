# Pathfinder

Project manager personal **gamificado** para proyectos técnicos. Cada proyecto avanza por
niveles tipo videojuego: completas quests, ganas XP, desbloqueas el siguiente nivel y un
chat-PM con personalidad te acompaña reconociendo hitos y rachas.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** para la UI
- **Datos en JSON local** por ahora (`data/templates.json`, `data/project.json`)
- **API de Claude** (`@anthropic-ai/sdk`, modelo `claude-sonnet-4-6`) para el chat-PM en `/api/chat`

## Reglas

- **SIEMPRE lee `DESIGN.md` antes de crear o modificar cualquier componente de UI.**
- **TODA acción de la app se registra en `activity_log`** dentro de `project.json`
  (tipos: `quest_completed`, `quest_added`, `message`, `level_unlocked`).
- La **etapa de la mascota se calcula** del estado del proyecto, nunca se persiste.

## Estructura

- `app/page.tsx` — página principal (mapa de niveles + panel de quest + chat).
- `app/api/chat/route.ts` — chat-PM con Claude; aplica acciones y registra en el log.
- `app/api/complete-quest/route.ts` — marca quests, suma XP, desbloquea niveles.
- `lib/` — tipos y helpers de lectura/escritura del estado.
- `data/` — plantillas y estado del proyecto.
