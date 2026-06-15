import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getProject, listTasks, loadMessages, saveMessage, updateTask } from "@/lib/store";
import { PRIORIDAD_ORDEN } from "@/lib/types";
import type { Message, Prioridad, Task } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

// Voz del PM (fuente de verdad: sección "Voz del PM" en DESIGN.md).
const SYSTEM_PROMPT = `Responde siempre en texto plano. Sin asteriscos, sin ##, sin ---, sin tablas con |. Escribe como si fuera un mensaje de WhatsApp entre colegas.

Eres el project manager (PM) personal de quien usa Pathfinder, un task manager
ligero con IA para Data Scientists. Tu trabajo es acompañar, ordenar prioridades y mantener el ritmo.

Reglas de voz (tu respuesta las cumple SIEMPRE):
- Habla como un buen coach humano, no como un sistema. Nunca menciones identificadores internos,
  nombres de campos ni jerga de base de datos. Refiérete a las tareas por su texto en lenguaje natural.
- Corto y con jugo: máximo 3 frases por respuesta en conversación normal. Cada frase aporta algo —
  cero relleno, cero frases de cortesía vacías.
- Concreto sobre abstracto: en vez de generalidades, di exactamente qué conviene hacer ahora.
- Una sola pregunta por mensaje, máximo. Si no hace falta preguntar, no la fuerces.
- Reconoce avances reales en una frase, sin inflar.
- Español casual mexicano, tutea siempre.
- Si te piden organizar, priorizar o ponerle fechas a las tareas, hazlo: confirma en una frase
  natural qué reorganizaste (nunca menciones campos ni jerga). Los cambios de prioridad y fecha
  se aplican solos en la lista; tú solo cuéntalo en lenguaje humano.`;

// Señales de que el usuario quiere reorganizar/priorizar/poner fechas.
const ORGANIZE_INTENT = /(organiz|prioriz|prioridad|urgent|orden(a|en|ar)|deadline|fecha|para cu[aá]ndo|vence|antes de|para (hoy|ma[ñn]ana|el ))/i;

// Bloque de contexto del proyecto que se inyecta al system prompt.
// Las tareas van por su texto natural; ningún id ni nombre de campo sale de aquí.
function buildContext(nombre: string, descripcion: string, tasks: Task[]): string {
  const tareas = tasks.length
    ? tasks
        .map((t) => `- [${t.estado === "done" ? "hecha" : "pendiente"}] ${t.texto}`)
        .join("\n")
    : "(todavía no hay tareas)";
  return `\n\nContexto del proyecto en el que estás ahora (úsalo para responder sobre el trabajo real):
Proyecto: ${nombre}${descripcion ? ` — ${descripcion}` : ""}
Tareas:
${tareas}`;
}

// Segunda pasada: pide al modelo extraer las tareas accionables del mensaje del PM
// como un JSON array de strings. Cualquier fallo (parse, formato) devuelve [].
async function extractTasks(anthropic: Anthropic, reply: string): Promise<string[]> {
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Analiza este mensaje y extrae las tareas o pasos accionables como un JSON array de strings.
Si no hay tareas concretas, responde solo con: []
Responde ÚNICAMENTE con el JSON, sin texto extra, sin comillas adicionales.

Mensaje: ${reply}`,
        },
      ],
    });
    const raw = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    // Por si el modelo envuelve la respuesta en un bloque ```json.
    const cleaned = raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim());
  } catch {
    return [];
  }
}

// Pasada de organización: dado el mensaje del usuario y las tareas actuales, pide al
// modelo un JSON con la prioridad/deadline que debe tener cada tarea a cambiar, y aplica
// los cambios directamente en Supabase. Devuelve cuántas tareas actualizó.
async function organizeTasks(
  anthropic: Anthropic,
  userMessage: string,
  tasks: Task[],
): Promise<number> {
  if (!tasks.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const lista = tasks
    .map((t) => `- "${t.texto}" (prioridad ${t.prioridad}, ${t.deadline ? t.deadline.slice(0, 10) : "sin fecha"})`)
    .join("\n");

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: `El usuario quiere organizar sus tareas. Su mensaje: "${userMessage}".
Hoy es ${today}.

Tareas actuales:
${lista}

Devuelve ÚNICAMENTE un JSON array con las tareas que deban cambiar de prioridad o fecha.
Cada elemento: {"texto": "<el texto EXACTO de la tarea, tal cual aparece arriba>", "prioridad": "alta|media|baja", "deadline": "YYYY-MM-DD"}
Reglas: incluye "prioridad" y/o "deadline" solo si cambian; usa "deadline": null para quitar una fecha; omite las tareas que no cambian; si nada cambia responde []. No inventes tareas nuevas. Sin texto extra.`,
        },
      ],
    });
    const raw = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return 0;

    // Mapa de texto normalizado → tarea, para resolver el id sin exponerlo al modelo.
    const byText = new Map(tasks.map((t) => [t.texto.trim().toLowerCase(), t]));

    let applied = 0;
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const rec = item as Record<string, unknown>;
      const texto = typeof rec.texto === "string" ? rec.texto.trim().toLowerCase() : "";
      const task = byText.get(texto);
      if (!task) continue;

      const patch: { prioridad?: Prioridad; deadline?: string | null } = {};
      if (typeof rec.prioridad === "string" && PRIORIDAD_ORDEN.includes(rec.prioridad as Prioridad)) {
        patch.prioridad = rec.prioridad as Prioridad;
      }
      if ("deadline" in rec) {
        const dl = rec.deadline;
        if (dl === null) patch.deadline = null;
        else if (typeof dl === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dl)) patch.deadline = dl;
      }
      if (Object.keys(patch).length === 0) continue;

      try {
        await updateTask(task.id, patch);
        applied++;
      } catch {
        // Si una falla, seguimos con las demás.
      }
    }
    return applied;
  } catch {
    return 0;
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta ANTHROPIC_API_KEY. Copia .env.local.example a .env.local y pon tu key." },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const message: string = (body?.message ?? "").toString().trim();
  const projectId: string = (body?.projectId ?? "").toString();
  if (!message) {
    return NextResponse.json({ error: "message requerido" }, { status: 400 });
  }

  // Carga proyecto, tareas e historial persistido para darle contexto al PM.
  // El historial es la fuente de verdad de Supabase, no estado del cliente.
  let system = SYSTEM_PROMPT;
  let priorTurns: Anthropic.MessageParam[] = [];
  let projectTasks: Task[] = [];
  if (projectId) {
    const [project, tasks, prior] = await Promise.all([
      getProject(projectId).catch(() => null),
      listTasks(projectId).catch(() => [] as Task[]),
      loadMessages(projectId).catch(() => [] as Message[]),
    ]);
    projectTasks = tasks;
    if (project) {
      system += buildContext(project.nombre, project.descripcion, tasks);
    }
    priorTurns = prior.map((m) => ({ role: m.role, content: m.content }));
  }

  // Persistimos el turno del usuario antes de llamar a Claude para que sobreviva
  // a recargas aunque el PM falle. (Silencioso si la tabla aún no existe.)
  if (projectId) {
    await saveMessage(projectId, "user", message).catch(() => {});
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [...priorTurns, { role: "user", content: message }],
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (projectId && reply) {
      await saveMessage(projectId, "assistant", reply).catch(() => {});
    }
    // Cuando el usuario pide organizar/priorizar, aplicamos prioridades y fechas a las
    // tareas existentes. `organized` > 0 le dice al cliente que refresque la lista.
    const organized =
      ORGANIZE_INTENT.test(message) && projectTasks.length
        ? await organizeTasks(anthropic, message, projectTasks)
        : 0;
    const suggestedTasks = reply ? await extractTasks(anthropic, reply) : [];
    return NextResponse.json({ reply, suggestedTasks, organized });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json({ error: `No pude hablar con Claude: ${detail}` }, { status: 502 });
  }
}
