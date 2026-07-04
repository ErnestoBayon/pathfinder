# DESIGN.md — Guía visual de Pathfinder

> **Esta guía manda.** Léela antes de crear o modificar cualquier componente de UI.
> Si algo que vas a construir contradice estas reglas, gana la guía.

---

## Tokens de color — fuente única de verdad: `lib/colors.ts`

**No definas colores ad-hoc.** Todo color de UI viene de una de estas tres fuentes:

### Tailwind tokens (tailwind.config.ts)

| Token | Hex | Uso |
|---|---|---|
| `canvas` | `#F8F9FA` | Fondo de página |
| `surface` | `#FFFFFF` | Cards, modales, popovers |
| `line` | `#E5E7EB` | Bordes sutiles |
| `ink` | `#111827` | Texto principal |
| `muted` | `#6B7280` | Metadata / texto secundario |
| `accent` | `#4F46E5` | Índigo — CTA, focus ring |
| `accent-hover` | `#4338CA` | Hover sobre accent |
| `done` | `#16A34A` | Tarea completada, progreso 100% |

### Colores de proyecto (`PROJECT_COLORS` + `DEFAULT_PROJECT_COLOR`)

Seis acentos seleccionables; el primero es el default:
`#5B5BD6` (índigo) · `#0E9F6E` · `#D97706` · `#EC4899` · `#E11D48` · `#0891B2`

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

**Modo claro.** Inspirado en Linear y Notion: limpio, funcional, sin decoración gratuita.
Inter como fuente (fallback system-ui). Sombras suaves tipo sticky note (`shadow-note` /
`shadow-note-hover`).

- **Color como identidad, no como decoración.** El color de proyecto va en el borde
  izquierdo de la card o chip — nunca rellena el fondo completo.
- **Tinted pills para prioridad.** Fondo tenue (0.12 opacity) + texto oscuro del mismo
  matiz. Nunca sólidos ni con borde de color.
- **Ghost chips para filtros.** Sin relleno en estado inactivo (`border-line`, texto muted);
  tinted al activarse (mismo patrón que las pills de prioridad).
- **Segmented pill toggles** para Month/Week en el calendario: dos opciones, la activa
  con `bg-surface shadow-sm`, la inactiva sin fondo.
- **Popover pattern:** click-outside + Escape lo cierra. Sin animación de entrada compleja
  — aparece directo. Usado en: selector de color de proyecto, dropdown de proyecto en el
  calendario global.
- **Animaciones:** solo `transform` / `opacity`, máximo 300ms, `ease-out`, siempre en
  respuesta a acción del usuario. Nunca decorativas ni de entrada automática.
- **Bordes:** 1px, `border-line` (`#E5E7EB`). `border-radius` moderado (6–12px en
  elementos de UI, 16px en modales y cards grandes).

---

## Vistas y layout

### Home (`/home`)

Grid de project cards. Cada card es un sticky note: `bg-surface shadow-note`, borde
izquierdo grueso con `project.color`, punto de color en el nombre. Progreso de tareas
(`done / total`) en texto muted. Card "+" para crear proyecto.

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

`border-l-4` con `project.color`. Sombra `note` / `note-hover`. Sin hover de fondo —
la sombra es el único efecto.

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
