# DESIGN.md — Guía visual de Pathfinder

> **Esta guía manda.** Lee este archivo antes de crear o modificar cualquier componente de UI.
> Si algo que vas a construir contradice estas reglas, gana la guía.

## Identidad: "premium espacial"

El lenguaje visual de una página de producto de Apple (referencia: apple.com/macbook-pro),
aplicado a una herramienta.

- **Fondo base:** `#0a0a0a` (casi negro, nunca negro puro).
- **Superficies:** tarjetas en gris muy oscuro (`~#1a1a1c`) con borde de 1px en blanco al 8% de
  opacidad, `border-radius` generoso (16px).
- **Tipografía:** contraste dramático de escala. Título del proyecto grande y bold (32–40px,
  tracking ajustado). Labels y metadata pequeños (12–13px) en gris medio `#86868b`. Texto normal
  en `#f5f5f7` (blanco hueso, nunca blanco puro).
- **Color como luz, no como pintura:** los acentos no rellenan, iluminan. Nivel activo: anillo
  azul `#2997ff` con glow sutil (box-shadow difuso del mismo color). XP: ámbar luminoso.
  Completado: verde suave `#30d158`. Bloqueado: gris al 30% de opacidad.
- **Gradientes:** prohibidos en general. Permitidos ÚNICAMENTE en dos lugares: el glow del nivel
  activo y las animaciones de celebración (estilo glow de los chips M de Apple, azul-violeta).
- **Espaciado:** muy generoso, el contenido respira, secciones bien separadas.
- **Botones:** estilo pill (border-radius completo). Primario en azul `#2997ff` con texto blanco,
  como los CTA de Apple.
- **Animaciones:** solo `transform`/`opacity`, máximo 300ms, `ease-out`, siempre como respuesta a
  acciones del usuario, nunca decorativas. Las celebraciones pueden usar el glow gradiente.
- **Tono de textos:** motivador y directo, español casual, sin corporativismo.

## Personajes (agentes)

Cada agente del sistema es un personaje propio inspirado en el lenguaje de las mascotas blob
modernas: cabeza redonda dominante, cuerpo mínimo, ojos de punto negros, boca mínima o ausente,
acabado suave tipo vinilo. **Diseño 100% original — NUNCA copiar mascotas existentes** (Finder guy
de Apple, etc.).

- **Identidad por color de dos tonos:** cada agente tiene un color base con la cara dividida
  verticalmente en tono claro/oscuro.
- **El PM es azul** (`#2997ff` con tono claro derivado). Futuros agentes del council: cada juez su
  color (coral, violeta, ámbar).
- Sobre el fondo oscuro, los personajes son los puntos de color de la interfaz.
- **Expresividad mínima:** parpadeo ocasional, inclinación de cabeza, un brinquito al celebrar.
  Nunca sobreanimados.
- **Estados:**
  - **activo** → ojos abiertos, bobbing sutil
  - **pensando** → ojos entrecerrados, tres puntos suspensivos flotando
  - **dormido** → ojos cerrados, `zzz`
- **La criatura del proyecto** (la que evoluciona por niveles: huevo → bebé → joven → adulto →
  legendario) usa este mismo lenguaje y evoluciona ganando acabados y accesorios (visor, antena,
  propulsores), **no cambiando de forma**. **No construir la criatura todavía.**
- **v0 en SVG plano** con sombreado suave; arte 3D real en fase posterior.
