import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { addQuest, completeQuest, logActivity, readProject } from "@/lib/store";
import type { MutationResult } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

type ChatAction =
  | { complete_quest: string }
  | { add_quest: { texto: string; xp: number } }
  | { none: true };

const SYSTEM_PROMPT = `Eres el project manager personal de quien usa Pathfinder, una app que convierte
un proyecto técnico en niveles tipo videojuego. Tu trabajo es acompañar, motivar y mantener el ritmo.

Tienes el estado completo del proyecto (project.json) en el mensaje del usuario: conoces los
niveles, su estado, las quests y el activity_log. Úsalo para hablar con contexto real.

Reglas de voz (tu respuesta conversacional las cumple SIEMPRE):
- Habla como un buen coach humano, no como un sistema. NUNCA menciones IDs internos
  (q-core-2, pb-4, etc.), nombres de campos ni jerga de base de datos. Refiérete a las quests por
  su texto en lenguaje natural, o por una versión corta de él.
- Corto y con jugo: máximo 3 frases por respuesta en conversación normal. Cada frase aporta algo —
  cero relleno, cero frases de cortesía vacías.
- Concreto sobre abstracto: en vez de "eso desbloquea todo lo que sigue", di exactamente qué
  desbloquea ("eso desbloquea Persistencia"). En vez de metáforas largas, una imagen corta o ninguna.
- Una sola pregunta por mensaje, máximo. Si no hace falta preguntar, no la fuerces.
- Celebra hitos reales en una frase, sin inflar. Reconoce rachas cuando las veas en el log.
- Español casual mexicano, tutea siempre.

Después de tu respuesta conversacional, SIEMPRE incluyes al final UN bloque de código JSON con
exactamente una acción, en uno de estos formatos:
\`\`\`json
{"complete_quest": "<id-de-quest-existente>"}
\`\`\`
o
\`\`\`json
{"add_quest": {"texto": "descripción corta de la tarea", "xp": 50}}
\`\`\`
o
\`\`\`json
{"none": true}
\`\`\`

Reglas para la acción:
- Usa complete_quest SOLO si el usuario deja claro que ya terminó una quest que existe; usa su id exacto.
- Usa add_quest si el usuario pide o describe una nueva tarea que vale la pena trackear. xp entre 25 y 150
  según el esfuerzo.
- Si no hay ninguna acción clara, usa {"none": true}.
- Nunca inventes ids de quests que no estén en el estado.`;

/** Extrae el bloque JSON de acción del texto y devuelve la respuesta limpia + la acción. */
function extractAction(text: string): { reply: string; action: ChatAction | null } {
  const fence = /```json\s*([\s\S]*?)\s*```/i;
  const match = text.match(fence);

  let jsonStr: string | null = null;
  let reply = text;

  if (match) {
    jsonStr = match[1];
    reply = text.replace(match[0], "").trim();
  } else {
    // Fallback: último objeto JSON en el texto.
    const last = text.lastIndexOf("{");
    if (last !== -1) {
      const candidate = text.slice(last);
      try {
        JSON.parse(candidate);
        jsonStr = candidate;
        reply = text.slice(0, last).trim();
      } catch {
        /* sin acción parseable */
      }
    }
  }

  if (!jsonStr) return { reply: text.trim(), action: null };

  try {
    const parsed = JSON.parse(jsonStr) as ChatAction;
    return { reply: reply || text.trim(), action: parsed };
  } catch {
    return { reply: text.trim(), action: null };
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
  if (!message) {
    return NextResponse.json({ error: "message requerido" }, { status: 400 });
  }

  const project = await readProject();
  // TODA acción se registra: primero el mensaje del usuario.
  await logActivity("message", `Usuario: ${message}`);

  const anthropic = new Anthropic({ apiKey });

  let text: string;
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${message}\n\n---\nEstado actual del proyecto (project.json):\n${JSON.stringify(
            project,
            null,
            2,
          )}`,
        },
      ],
    });
    text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No pude hablar con Claude: ${detail}` },
      { status: 502 },
    );
  }

  const { reply, action } = extractAction(text);

  // El backend aplica la acción (escribe en Supabase) y guarda las flags de animación.
  const flags: Pick<MutationResult, "completedQuestId" | "levelCompletedId" | "unlockedLevelId"> = {};
  if (action && "complete_quest" in action && typeof action.complete_quest === "string") {
    const r = await completeQuest(action.complete_quest);
    flags.completedQuestId = r.completedQuestId;
    flags.levelCompletedId = r.levelCompletedId;
    flags.unlockedLevelId = r.unlockedLevelId;
  } else if (
    action &&
    "add_quest" in action &&
    action.add_quest &&
    typeof action.add_quest.texto === "string"
  ) {
    const xp = Number.isFinite(action.add_quest.xp) ? action.add_quest.xp : 50;
    await addQuest(action.add_quest.texto, xp);
  }

  // Registrar la respuesta del PM y devolver el estado fresco.
  await logActivity("message", `PM: ${reply}`);
  const finalProject = await readProject();

  return NextResponse.json({ reply, project: finalProject, ...flags });
}
