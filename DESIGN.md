# DESIGN.md — Guía visual de Pathfinder

> **Esta guía manda.** Léela antes de crear o modificar cualquier componente de UI.
> Si algo que vas a construir contradice estas reglas, gana la guía.

---

## Tokens de color — fuente única de verdad: `lib/colors.ts`

**No definas colores ad-hoc.** Todo color de UI viene de una de estas tres fuentes:

### Tailwind tokens (tailwind.config.ts)

| Token | Hex | Uso |
|---|---|---|
| `base` | `#0A0A0A` | Fondo de página |
| `panel` | `#111111` | Cards, modales, popovers |
| `raise` | `#161616` | Hover / elevación sutil |
| `ink` | `#E4E4E4` | Texto principal |
| `dim` | `rgba(228,228,228,0.65)` | Metadata / texto secundario |
| `faint` | `rgba(228,228,228,0.40)` | Anotaciones, labels decorativos |
| `ghost` | `rgba(255,255,255,0.15)` | Divisores, casi invisible |
| `line` | `rgba(255,255,255,0.07)` | Bordes hairline |
| `line-strong` | `rgba(255,255,255,0.14)` | Bordes activos / hover |
| `accent` | `#D4FF00` | Lima — links, focus ring, nav activa |
| `accent-hover` | `#BFE600` | Hover sobre accent |
| `accent-fill` | `rgba(212,255,0,0.10)` | Tint de fondo suave |
| `cta` | `#D4FF00` | Mismo lima — botones de acción primaria (texto oscuro encima, nunca blanco) |
| `cta-hover` | `#BFE600` | Hover sobre cta |
| `done` | `#15803D` | Tarea completada, progreso 100% (sin cambios — ya daba buen contraste con texto blanco) |

**Importante:** `accent`/`cta` son lima de alto brillo — cualquier botón con `bg-cta`/`bg-accent`
usa texto oscuro (`text-[#0A0A0A]`), nunca `text-white`. Si agregas un botón nuevo con estos
fondos, respeta esa regla o el texto queda ilegible.

### Colores de proyecto (`PROJECT_COLORS` + `DEFAULT_PROJECT_COLOR`)

Seis acentos seleccionables (500-shades, más brillantes que un 600 para leerse bien
sobre `panel` #111111); el primero es el default:
`#8B5CF6` (violeta) · `#14B8A6` (teal) · `#F59E0B` (ámbar) · `#EC4899` (rosa) ·
`#EF4444` (rojo) · `#0EA5E9` (sky)

Se aplican como borde izquierdo de color en las cards del home, las filas de tarea,
los chips del calendario, y el header de TaskDetailModal. Nunca como relleno de fondo.

### Prioridad (`PRIORIDAD_COLORS`)

```
High   → dot #DC2626 · tint rgba(220,38,38,0.12)  · textOn #991B1B
Medium → dot #D97706 · tint rgba(217,119,6,0.12)  · textOn #92400E
Low    → dot #64748B · tint rgba(100,116,139,0.14) · textOn #334155
```

Los pills de prioridad usan `tint` como fondo y `textOn` como color de texto.
El verde queda reservado para `done`; por eso Low usa slate en lugar de verde.

### Keystone (tarea clave)

Violeta `#7C3AED` · tint `rgba(124,58,237,0.12)` · textOn `#6D28D9`.
Solo para el ⭐ y la pill "Keystones" en el filtro.

---

## Lenguaje visual

**Modo oscuro.** Estética terminal/data-readout: fondo casi negro, acento lima,
tipografía monoespaciada para labels/números/títulos (JetBrains Mono vía `font-mono`),
Inter (`font-sans`) para texto de párrafo largo (descripciones, mensajes del chat).
Sombras hairline en vez de drop-shadows (`shadow-note` / `shadow-note-hover`, ahora
un borde de 1px + glow lima sutil al hover, no una sombra oscura — una sombra negra
no se ve sobre fondo negro).

> **Migración en progreso:** por ahora `ProjectCard`, `HomeProjects`, `TopNav`,
> `NewProjectCard`, `AuthForm`, `page.tsx` (landing) y los tokens globales ya están en
> modo oscuro. El resto de vistas (Board, Calendar, TaskDetailModal, SubtaskList,
> ChatBox, Overview/TaskList, Archive) siguen con combinaciones puntuales pensadas
> para el tema claro anterior (pills de prioridad, popovers, chips) — no asumas que ya
> están migradas solo porque los tokens globales cambiaron. Ver Fase 2 del plan de
> rediseño.

- **Color como identidad, no como decoración.** El color de proyecto va en el borde
  izquierdo de la card o chip — nunca rellena el fondo completo.
- **Lima (`accent`/`cta`) es de alto brillo — nunca combinar con `text-white`.** Usa
  `text-[#0A0A0A]` (o el token equivalente) para texto/iconos sobre fondo `accent`/`cta`.
- **Tinted pills para prioridad.** Fondo tenue (0.12 opacity) + texto del mismo matiz.
  Nunca sólidos ni con borde de color. (Pendiente recalibrar para fondo oscuro, ver nota arriba.)
- **Ghost chips para filtros.** Sin relleno en estado inactivo (`border-line`, texto `dim`);
  tinted al activarse (mismo patrón que las pills de prioridad).
- **Segmented pill toggles** para Month/Week en el calendario: dos opciones, la activa
  con `bg-raise`, la inactiva sin fondo.
- **Popover pattern:** click-outside + Escape lo cierra. Sin animación de entrada compleja
  — aparece directo. Usado en: selector de color de proyecto, dropdown de proyecto en el
  calendario global.
- **Animaciones:** solo `transform` / `opacity`, máximo 300ms, `ease-out`, siempre en
  respuesta a acción del usuario. Nunca decorativas ni de entrada automática.
- **Bordes:** 1px, `border-line` (`rgba(255,255,255,0.07)`). `border-radius` moderado
  (6–12px en elementos de UI, 16px en modales y cards grandes).

---

## Vistas y layout

### Home (`/home`)

Fila de 3 KPI tiles (proyectos activos, tareas pendientes, tareas completadas —
`font-mono`, label en mayúsculas estilo `// COMMENT`) encima del grid de project cards.
Cada card: `bg-panel`, borde `border-line` + borde izquierdo 2px con `project.color`,
título en `font-mono`, `%` completado arriba a la derecha, barra de progreso delgada
(1px→3px) con `project.color`, footer con `done/total tasks` y un `open →` en `accent`
que solo aparece al hover (`opacity-0 group-hover:opacity-100`). Card "+" para crear
proyecto (`NewProjectCard`, ya en tokens dark).

### Proyecto overview (`/proyecto/[id]`)

Pestaña por defecto. Lista de tareas ordenada por prioridad → orden → fecha. Encima:
`TaskFilterBar` (pills de prioridad, keystone, estado; barra de búsqueda; orden). Debajo
de la lista: `SuggestionsPanel` (tareas sugeridas por la IA, approve/reject). Las tareas
pueden reordenarse con drag-and-drop **solo cuando no hay filtro ni sort activos**.

### Board (`/proyecto/[id]/board`)

Kanban con 3 columnas: `todo` / `doing` / `done`. Cada card expande las subtareas en
línea. `FloatingChatBubble` en la esquina inferior derecha: abre el chat-PM sin dejar la
vista.

### Calendario global (`/calendar`)

Vista mensual o semanal (toggle Month/Week, estado en `?view=`). Chips de tarea con borde
izquierdo de color de proyecto. Dropdown de filtro por proyecto (`?project=`). Al hacer
clic en un chip: TaskDetailModal.

### Calendario por proyecto (`/proyecto/[id]/calendar`)

Mismo componente `CalendarView`, prefiltrado al proyecto. Accesible desde el tab
Calendar de la navegación anidada del proyecto.

### Navegación de proyecto

Tabs tri-estado bajo el header: **Overview · Board · Calendar**. La tab activa lleva
color `accent`. Los tabs enrutan a sub-rutas (`/board`, `/calendar`); el layout
(`/proyecto/[id]/layout.tsx`) persiste el header y los tabs.

`FloatingChatBubble` aparece en Board y Calendar (no en Overview, donde el PM está
en panel lateral).

---

## Componentes clave

### SubtaskList

Embebida bajo el título de la tarea. Barra de progreso (`done / total`). Checklist con
guía vertical izquierda. Cada fila: checkbox cuadrado → **priority pill** (tinted,
click-to-cycle High→Medium→Low) → título → botón ×. Form de añadir subtarea:
priority select (default Medium) + input de título.

### TaskDetailModal

Abre sobre la lista o el board. Header con color de proyecto. Edita: título, prioridad
(select), estado, deadline, keystone toggle. Embebe SubtaskList completo.

### ProjectCard (home)

`border-l-2` con `project.color` sobre `bg-panel`. Título `font-mono`. Sombra `note` /
`note-hover` (hairline + glow lima) y un lift sutil (`-translate-y-0.5`) al hover.
`open →` con fade-in al hover, no siempre visible.

---

## Convenciones de estado

- **Filtros y vista del calendario:** en URL params (`?project=`, `?view=month|week`).
  Cambiar filtro = `router.push` con los params actualizados, nunca estado local global.
- **Drag-to-reorder:** solo activo en la lista de Overview cuando no hay filtro ni sort.
  El hint de drag se oculta al activar cualquier filtro (`TaskFilterBar`).
- **Optimismo:** mutaciones de subtarea (toggle, cambio de prioridad, delete) son
  optimistas — se revierten si el request falla.

---

## Personajes (agentes)

El PM es un blob SVG (`AgentAvatar.tsx`): cabeza redonda dominante, cuerpo mínimo, ojos
de punto negros, acabado tipo vinilo. **100% original — no copiar mascotas existentes.**

- **El PM es azul** (`#2997ff` con derivado claro).
- Estados: `active` → ojos abiertos + bobbing sutil (`animate-bob`); `thinking` → ojos
  entrecerrados + tres puntos flotantes (`animate-dot-float`); `sleeping` → ojos cerrados
  + zzz (`animate-zzz-rise`).
- Sobre fondo `canvas` claro son el único punto de color no funcional de la UI.

---

## Voz del PM

El chat-PM (`/api/chat`) habla con estas reglas. Son la fuente de verdad de su tono.

- **Habla como un buen coach humano, no como un sistema:** NUNCA menciones IDs internos,
  nombres de campos ni jerga de base de datos. Refiérete a las tareas por su texto.
- **Corto y con jugo:** máximo 3 frases por respuesta en conversación normal. Cada frase
  debe aportar algo — cero relleno, cero frases de cortesía vacías.
- **Concreto sobre abstracto:** di exactamente qué conviene hacer ahora.
- **Una sola pregunta por mensaje, máximo.** Si no hay pregunta necesaria, no la fuerces.
- **Reconoce avances reales en una frase, sin inflar.**
- **Español casual mexicano, tutea siempre.**
