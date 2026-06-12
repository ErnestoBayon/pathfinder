# DESIGN.md — Guía de UI de Pathfinder

> **Esta guía manda.** Lee este archivo antes de crear o modificar cualquier componente de UI.
> Si algo que vas a construir contradice estas reglas, gana la guía.

## Identidad

**"Pro tool con alma de juego".**

La base es una herramienta limpia y seria tipo Linear: fondo claro, tarjetas blancas con
borde sutil de 1px, tipografía Inter, espaciado generoso. **Sin gradientes, sin sombras pesadas.**
El "alma de juego" no vive en la decoración: vive en el feedback, las micro-animaciones de
recompensa y las celebraciones puntuales. La estructura siempre se mantiene sobria.

## Color

- **Neutros para la estructura.** Fondo (`canvas`), tarjetas (`card`), bordes (`line`),
  texto (`ink` / `muted`). Esto es el 90% de la pantalla.
- **Un color de acento por estado**, nada más:
  - 🟢 **Verde (`done`)** = completado
  - 🔵 **Azul (`active`)** = activo / en progreso
  - ⚪ **Gris (`locked`)** = bloqueado
- **Colores vivos solo en feedback y celebraciones** (XP flotante, destello al subir de nivel).
  Nunca como relleno decorativo permanente.

## Animaciones

- **Solo `transform` y `opacity`.** Nada de animar `width`, `height`, `color`, `box-shadow`.
- **Máximo 300ms, siempre `ease-out`.**
- **Siempre como respuesta a una acción del usuario**, nunca decorativas ni en loop.
  Marcar una quest, subir de nivel, desbloquear algo: ahí sí. Un fondo que late: no.

## Mascota (fases futuras — NO construir hoy)

Robot / astronauta minimalista estilo Apple: geometría limpia, no caricatura.

- **Evoluciona por "trim levels"** — más acabados y detalles por etapa (visor iluminado,
  detalles metálicos, propulsores), **no** transformaciones orgánicas.
- **Expresividad solo en visor / ojos / antena.**
- **Etapas** (calculadas del estado del proyecto, **nunca se guardan**):
  - 🥚 huevo → 0 niveles completados
  - 👶 bebé → 1–2 niveles
  - 🧑 joven → 3–5 niveles
  - 🧑‍🚀 adulto → 6–8 niveles
  - ⭐ legendario → 9–10 niveles + deploy
- **Humor según `activity_log`:** activa, normal, o dormida (3+ días sin actividad, con `zzz`).
  **Nunca triste ni muriendo.**

## Tono de textos

Motivador y directo. Español casual. Sin corporativismo, sin relleno.
Habla como un buen compañero de equipo que te empuja, no como un manual.
