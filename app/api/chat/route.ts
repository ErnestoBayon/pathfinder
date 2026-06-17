import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  createSubtask,
  createTask,
  getProject,
  listSubtasks,
  listTasks,
  loadMessages,
  saveMessage,
  updateTask,
  type TaskPatch,
} from "@/lib/store";
import { PRIORIDAD_ORDEN } from "@/lib/types";
import type { Message, Prioridad, Task, TaskState } from "@/lib/types";
import { getAuthUser, validateProjectOwnership } from "@/lib/auth";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
const MAX_ROUNDS = 15;

// Voz del PM (fuente de verdad: sección "Voz del PM" en DESIGN.md).
// Arriba, las instrucciones de uso de tools; abajo, la voz de siempre.
const SYSTEM_PROMPT = `Tienes herramientas reales para gestionar tareas. Úsalas siempre:
- Cuando el usuario mencione trabajo a realizar → create_task de inmediato
- Antes de dar recomendaciones sobre el proyecto → get_tasks primero
- Cuando cambies prioridad o fecha → update_task, no solo lo menciones
- Puedes encadenar múltiples tools en una respuesta si es necesario
- En tu respuesta final confirma brevemente qué acciones ejecutaste
- Cuando el usuario cree una tarea que parezca compleja o multifase, sugiere proactivamente dividirla en subtareas. Usa list_subtasks antes de hablar sobre los pasos de una tarea. Usa create_subtask cuando el usuario quiera desglosar el trabajo en pasos concretos.

Responde siempre en texto plano. Sin asteriscos, sin ##, sin ---, sin tablas con |. Escribe como si fuera un mensaje de WhatsApp entre colegas.

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

// Definición de las tools. Los esquemas hablan en inglés/neutral; executeTool()
// traduce a las columnas reales de Supabase (texto, prioridad, estado…).
const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "create_task",
    description:
      "Crea una nueva tarea en el proyecto actual. Úsala cuando el usuario mencione trabajo concreto a realizar o cuando identifiques pasos accionables claros.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título claro y accionable de la tarea" },
        priority: {
          type: "string",
          enum: ["alta", "media", "baja"],
          description: "Prioridad de la tarea",
        },
        deadline: { type: "string", description: "Fecha límite en formato YYYY-MM-DD" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description:
      "Actualiza campos de una tarea existente. Úsala para cambiar prioridad, deadline, título o estado. No describas el cambio en el chat sin ejecutar esta tool.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID de la tarea a actualizar" },
        title: { type: "string" },
        priority: { type: "string", enum: ["alta", "media", "baja"] },
        deadline: { type: "string", description: "Formato YYYY-MM-DD" },
        status: { type: "string", enum: ["pending", "in_progress", "done"] },
      },
      required: ["task_id"],
    },
  },
  {
    name: "get_tasks",
    description:
      "Obtiene las tareas actuales del proyecto con id, título, prioridad, deadline y estado. Úsala antes de dar recomendaciones para tener contexto real.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_subtasks",
    description:
      "Lista las subtareas (pasos) de una tarea existente, con su título y si están completadas. Úsala antes de hablar sobre los pasos o el avance de una tarea.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID de la tarea cuyas subtareas quieres listar" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "create_subtask",
    description:
      "Crea una subtarea (paso concreto) dentro de una tarea existente. Úsala cuando el usuario quiera desglosar el trabajo de una tarea en pasos.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID de la tarea a la que pertenece la subtarea" },
        title: { type: "string", description: "Título claro y accionable de la subtarea" },
      },
      required: ["task_id", "title"],
    },
  },
];

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Forma de la tarea que ven las tools (id incluido para que el modelo pueda
// referenciarla en update_task). Traduce columnas españolas a un esquema neutral.
function toToolTask(t: Task) {
  return {
    id: t.id,
    title: t.texto,
    priority: t.prioridad,
    deadline: t.deadline ? t.deadline.slice(0, 10) : null,
    status: t.estado,
    es_clave: t.es_clave,
  };
}

// Ejecuta una tool contra Supabase usando las funciones existentes de lib/store.ts.
// Devuelve siempre un objeto serializable { success, ... } (nunca lanza).
async function executeTool(
  name: string,
  input: unknown,
  projectId: string,
): Promise<unknown> {
  const args = (input ?? {}) as Record<string, unknown>;
  try {
    if (!projectId) return { success: false, error: "No hay proyecto activo." };

    if (name === "get_tasks") {
      const tasks = await listTasks(projectId);
      return { success: true, tasks: tasks.map(toToolTask) };
    }

    if (name === "create_task") {
      const title = typeof args.title === "string" ? args.title.trim() : "";
      if (!title) return { success: false, error: "title es requerido" };
      const prioridad = PRIORIDAD_ORDEN.includes(args.priority as Prioridad)
        ? (args.priority as Prioridad)
        : "media";
      const deadline =
        typeof args.deadline === "string" && DATE_RE.test(args.deadline) ? args.deadline : null;
      const task = await createTask(projectId, title, { prioridad, deadline });
      return { success: true, task: toToolTask(task) };
    }

    if (name === "update_task") {
      const taskId = typeof args.task_id === "string" ? args.task_id : "";
      if (!taskId) return { success: false, error: "task_id es requerido" };
      const patch: TaskPatch = {};
      if (typeof args.title === "string" && args.title.trim()) patch.texto = args.title.trim();
      if (PRIORIDAD_ORDEN.includes(args.priority as Prioridad)) {
        patch.prioridad = args.priority as Prioridad;
      }
      if (typeof args.deadline === "string") {
        patch.deadline = DATE_RE.test(args.deadline) ? args.deadline : null;
      }
      // El esquema permite "in_progress", pero la DB solo tiene pending/done.
      if (typeof args.status === "string") {
        patch.estado = (args.status === "done" ? "done" : "pending") as TaskState;
      }
      if (Object.keys(patch).length === 0) return { success: false, error: "Nada que actualizar." };
      const task = await updateTask(taskId, patch);
      return { success: true, task: toToolTask(task) };
    }

    if (name === "list_subtasks") {
      const taskId = typeof args.task_id === "string" ? args.task_id : "";
      if (!taskId) return { success: false, error: "task_id es requerido" };
      const subtasks = await listSubtasks(taskId);
      return {
        success: true,
        subtasks: subtasks.map((s) => ({
          id: s.id,
          task_id: s.task_id,
          title: s.title,
          completed: s.completed,
        })),
      };
    }

    if (name === "create_subtask") {
      const taskId = typeof args.task_id === "string" ? args.task_id : "";
      if (!taskId) return { success: false, error: "task_id es requerido" };
      const title = typeof args.title === "string" ? args.title.trim() : "";
      if (!title) return { success: false, error: "title es requerido" };
      const subtask = await createSubtask(taskId, title);
      return {
        success: true,
        subtask: {
          id: subtask.id,
          task_id: subtask.task_id,
          title: subtask.title,
          completed: subtask.completed,
        },
      };
    }

    return { success: false, error: `Tool desconocida: ${name}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "error desconocido" };
  }
}

// Loop agéntico: una sola conversación con tool use. Mientras el modelo pida tools,
// las ejecutamos y le devolvemos los resultados; cuando cierra el turno, devolvemos su texto.
async function runAgenticLoop(
  anthropic: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[],
  projectId: string,
): Promise<{ reply: string; toolsUsed: boolean }> {
  let currentMessages: Anthropic.MessageParam[] = [...messages];
  let toolsUsed = false;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: toolDefinitions,
      messages: currentMessages,
    });

    if (response.stop_reason === "tool_use") {
      toolsUsed = true;
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify(await executeTool(block.name, block.input, projectId)),
        })),
      );
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
      continue;
    }

    // end_turn (o cualquier cierre que no sea tool_use): devolvemos el texto.
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { reply: text || "Listo.", toolsUsed };
  }

  // Se agotaron las rondas: muchas tools ya pudieron ejecutarse (las acciones
  // persistieron). En vez de un error genérico, lo decimos sin alarmar.
  return {
    reply: "Hice lo que pude en este turno. Puedes pedirme continuar si falta algo.",
    toolsUsed,
  };
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // Si el chat apunta a un proyecto, debe ser del usuario. (Sin projectId, el PM
  // responde sin contexto de proyecto y no toca datos de nadie.)
  if (projectId) {
    const isOwner = await validateProjectOwnership(projectId, user.id);
    if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Carga proyecto, tareas e historial persistido para darle contexto al PM.
  // El historial es la fuente de verdad de Supabase, no estado del cliente.
  let system = SYSTEM_PROMPT + `\n\nHoy es ${new Date().toISOString().slice(0, 10)}.`;
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
    const { reply, toolsUsed } = await runAgenticLoop(
      anthropic,
      system,
      [...priorTurns, { role: "user", content: message }],
      projectId,
    );
    if (projectId && reply) {
      await saveMessage(projectId, "assistant", reply).catch(() => {});
    }
    return NextResponse.json({ reply, toolsUsed });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json({ error: `No pude hablar con Claude: ${detail}` }, { status: 502 });
  }
}
