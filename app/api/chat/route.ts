import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getProject, listTasks, loadMessages, saveMessage } from "@/lib/store";
import type { Message, Task } from "@/lib/types";

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
- Español casual mexicano, tutea siempre.`;

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
  if (projectId) {
    const [project, tasks, prior] = await Promise.all([
      getProject(projectId).catch(() => null),
      listTasks(projectId).catch(() => [] as Task[]),
      loadMessages(projectId).catch(() => [] as Message[]),
    ]);
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
    return NextResponse.json({ reply });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json({ error: `No pude hablar con Claude: ${detail}` }, { status: 502 });
  }
}
