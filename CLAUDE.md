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

## Estado actual

- **Core loop funcionando:** niveles con quests y XP; completar una quest suma XP, y al cerrar
  todas las de un nivel este pasa a `done` y desbloquea el siguiente con celebración.
- **Chat-PM con acciones:** `/api/chat` llama a Claude (`claude-sonnet-4-6`), responde con tono de
  PM y aplica acciones (`complete_quest` / `add_quest` / `none`) sobre el estado.
- **`activity_log`** registrando toda acción (quests, mensajes, desbloqueos).
- **Rediseño "premium oscuro"** aplicado a toda la UI según la nueva `DESIGN.md`.
- **Componente `AgentAvatar`** (personaje blob SVG) integrado como el PM en el chat, con estados
  active / thinking / sleeping.

## Próxima sesión

1. Crear repo en GitHub y hacer push.
2. Deploy en Vercel con la variable de entorno `ANTHROPIC_API_KEY`.
3. Responderle al PM la definición del core loop en una frase para probar `complete_quest` desde
   el chat.
4. Afinaciones de diseño menores.
