# DESIGN.md — Guía visual de Pathfinder

> **Esta guía manda.** Lee este archivo antes de crear o modificar cualquier componente de UI.
> Si algo que vas a construir contradice estas reglas, gana la guía.

## Identidad: "premium oscuro"

El lenguaje visual de una página de producto de Apple (referencia: apple.com/macbook-pro),
aplicado a una herramienta.

- **Fondo base:** `#0a0a0a` (casi negro, nunca negro puro).
- **Superficies:** tarjetas en gris muy oscuro (`~#1a1a1c`) con borde de 1px en blanco al 8% de
  opacidad, `border-radius` generoso (16px).
- **Tipografía:** contraste dramático de escala. Títulos grandes y bold (32–40px, tracking
  ajustado). Labels y metadata pequeños (12–13px) en gris medio `#86868b`. Texto normal en
  `#f5f5f7` (blanco hueso, nunca blanco puro).
- **Color como luz, no como pintura:** los acentos no rellenan, iluminan. Acento / CTA: azul
  `#2997ff`. Tarea completada: verde suave `#30d158`.
- **Gradientes:** prohibidos en general. Úsalos solo si una interacción puntual lo justifica y
  siempre con mucha discreción.
- **Espaciado:** muy generoso, el contenido respira, secciones bien separadas.
- **Botones:** estilo pill (border-radius completo). Primario en azul `#2997ff` con texto blanco,
  como los CTA de Apple.
- **Animaciones:** solo `transform`/`opacity`, máximo 300ms, `ease-out`, siempre como respuesta a
  acciones del usuario, nunca decorativas.
- **Tono de textos:** motivador y directo, español casual, sin corporativismo.

## Personajes (agentes)

Cada agente del sistema es un personaje propio inspirado en el lenguaje de las mascotas blob
modernas: cabeza redonda dominante, cuerpo mínimo, ojos de punto negros, boca mínima o ausente,
acabado suave tipo vinilo. **Diseño 100% original — NUNCA copiar mascotas existentes** (Finder guy
de Apple, etc.).

- **Identidad por color de dos tonos:** cada agente tiene un color base con la cara dividida
  verticalmente en tono claro/oscuro.
- **El PM es azul** (`#2997ff` con tono claro derivado).
- Sobre el fondo oscuro, los personajes son los puntos de color de la interfaz.
- **Expresividad mínima:** parpadeo ocasional, inclinación de cabeza. Nunca sobreanimados.
- **Estados:**
  - **activo** → ojos abiertos, bobbing sutil
  - **pensando** → ojos entrecerrados, tres puntos suspensivos flotando
  - **dormido** → ojos cerrados, `zzz`
- **v0 en SVG plano** con sombreado suave; arte 3D real en fase posterior.

## Voz del PM

El chat-PM (`/api/chat`) habla con estas reglas. Son la fuente de verdad de su tono.

- **Habla como un buen coach humano, no como un sistema:** NUNCA menciones IDs internos, nombres de
  campos ni jerga de base de datos. Refiérete a las tareas por su texto en lenguaje natural.
- **Corto y con jugo:** máximo 3 frases por respuesta en conversación normal. Cada frase debe
  aportar algo — cero relleno, cero frases de cortesía vacías.
- **Concreto sobre abstracto:** en lugar de generalidades, di exactamente qué conviene hacer ahora.
- **Una sola pregunta por mensaje, máximo.** Si no hay pregunta necesaria, no la fuerces.
- **Reconoce avances reales en una frase, sin inflar.**
- **Español casual mexicano, tutea siempre.**
