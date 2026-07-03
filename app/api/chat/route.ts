import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  createSubtask,
  createTask,
  createSuggestedTask,
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
const SYSTEM_PROMPT = `You have real tools to manage tasks. Always use them:
- When the user mentions work to be done → create_task right away
- Before giving recommendations about the project → get_tasks first
- When you change priority or date → update_task, don't just mention it
- You can chain multiple tools in a single response if needed
- In your final reply, briefly confirm which actions you took
- When the user creates a task that looks complex or multi-phase, proactively suggest breaking it into subtasks. Use list_subtasks before talking about a task's steps. Use create_subtask when the user wants to break the work into concrete steps.
- Use suggest_task when YOU are proactively recommending work — planning, proposing, or initiating tasks on your own. Use create_task only when the user explicitly asks you to add a specific task. Never use suggest_task for user-requested tasks.

Always reply in plain text. No asterisks, no ##, no ---, no tables with |. Write as if it were a WhatsApp message between colleagues.

You are the personal project manager (PM) of whoever uses Pathfinder, a lightweight
AI task manager for Data Scientists. Your job is to support them, sort out priorities and keep the momentum.

Voice rules (your reply ALWAYS follows them):
- Talk like a good human coach, not like a system. Never mention internal identifiers,
  field names or database jargon. Refer to tasks by their text in natural language.
- Short and punchy: at most 3 sentences per reply in normal conversation. Every sentence adds something —
  zero filler, zero empty courtesy phrases.
- Concrete over abstract: instead of generalities, say exactly what's worth doing now.
- One question per message, at most. If there's no need to ask, don't force it.
- Acknowledge real progress in one sentence, without inflating it.
- Reply in English by default; if the user writes in another language, match their language.`;

// Definición de las tools. Los esquemas hablan en inglés/neutral; executeTool()
// traduce a las columnas reales de Supabase (texto, prioridad, estado…).
const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "create_task",
    description:
      "Creates a new task in the current project. Use it only when the user explicitly asks you to add a specific task.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Clear, actionable task title" },
        priority: {
          type: "string",
          enum: ["High", "Medium", "Low"],
          description: "Task priority",
        },
        deadline: { type: "string", description: "Deadline in YYYY-MM-DD format" },
      },
      required: ["title"],
    },
  },
  {
    name: "suggest_task",
    description:
      "Proactively recommend a task to the user. Use this when YOU are initiating a suggestion — planning, recommending, or proposing work the user hasn't explicitly asked for. The task will appear in a suggestions panel for the user to approve or reject. Do NOT use this when the user explicitly asks you to create a task.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        deadline: { type: "string", description: "ISO date string, optional" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description:
      "Updates fields of an existing task. Use it to change priority, deadline, title or status. Don't describe the change in the chat without running this tool.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID of the task to update" },
        title: { type: "string" },
        priority: { type: "string", enum: ["High", "Medium", "Low"] },
        deadline: { type: "string", description: "YYYY-MM-DD format" },
        status: { type: "string", enum: ["pending", "in_progress", "done"] },
      },
      required: ["task_id"],
    },
  },
  {
    name: "get_tasks",
    description:
      "Gets the project's current tasks with id, title, priority, deadline and status. Use it before giving recommendations so you have real context.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_subtasks",
    description:
      "Lists the subtasks (steps) of an existing task, with their title and whether they're completed. Use it before talking about a task's steps or progress.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID of the task whose subtasks you want to list" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "create_subtask",
    description:
      "Creates a subtask (concrete step) inside an existing task. Use it when the user wants to break a task's work into steps.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID of the task the subtask belongs to" },
        title: { type: "string", description: "Clear, actionable subtask title" },
        priority: {
          type: "string",
          enum: ["High", "Medium", "Low"],
          description: "Priority of the subtask. Defaults to 'Medium' if omitted.",
        },
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
        .map((t) => `- [${t.estado === "done" ? "done" : "pending"}] ${t.texto}`)
        .join("\n")
    : "(no tasks yet)";
  return `\n\nContext for the project you're in right now (use it to answer about the real work):
Project: ${nombre}${descripcion ? ` — ${descripcion}` : ""}
Tasks:
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
    if (!projectId) return { success: false, error: "No active project." };

    if (name === "get_tasks") {
      const tasks = await listTasks(projectId);
      return { success: true, tasks: tasks.map(toToolTask) };
    }

    if (name === "create_task") {
      const title = typeof args.title === "string" ? args.title.trim() : "";
      if (!title) return { success: false, error: "title is required" };
      const prioridad = PRIORIDAD_ORDEN.includes(args.priority as Prioridad)
        ? (args.priority as Prioridad)
        : "Medium";
      const deadline =
        typeof args.deadline === "string" && DATE_RE.test(args.deadline) ? args.deadline : null;
      const task = await createTask(projectId, title, { prioridad, deadline });
      return { success: true, task: toToolTask(task) };
    }

    if (name === "suggest_task") {
      const title = typeof args.title === "string" ? args.title.trim() : "";
      if (!title) return { success: false, error: "title is required" };
      // El schema de suggest_task usa prioridad en minúscula (low/medium/high);
      // la normalizamos al enum interno (High/Medium/Low) antes de validar.
      const raw = typeof args.priority === "string" ? args.priority : "";
      const cap = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "";
      const prioridad = PRIORIDAD_ORDEN.includes(cap as Prioridad) ? (cap as Prioridad) : "Medium";
      const deadline =
        typeof args.deadline === "string" && DATE_RE.test(args.deadline) ? args.deadline : null;
      const task = await createSuggestedTask(projectId, title, { prioridad, deadline });
      return {
        success: true,
        task: toToolTask(task),
        message: `I've added '${title}' to your suggestions panel for review.`,
      };
    }

    if (name === "update_task") {
      const taskId = typeof args.task_id === "string" ? args.task_id : "";
      if (!taskId) return { success: false, error: "task_id is required" };
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
      if (Object.keys(patch).length === 0) return { success: false, error: "Nothing to update." };
      const task = await updateTask(taskId, patch);
      return { success: true, task: toToolTask(task) };
    }

    if (name === "list_subtasks") {
      const taskId = typeof args.task_id === "string" ? args.task_id : "";
      if (!taskId) return { success: false, error: "task_id is required" };
      const subtasks = await listSubtasks(taskId);
      return {
        success: true,
        subtasks: subtasks.map((s) => ({
          id: s.id,
          task_id: s.task_id,
          title: s.title,
          completed: s.completed,
          priority: s.prioridad,
        })),
      };
    }

    if (name === "create_subtask") {
      const taskId = typeof args.task_id === "string" ? args.task_id : "";
      if (!taskId) return { success: false, error: "task_id is required" };
      const title = typeof args.title === "string" ? args.title.trim() : "";
      if (!title) return { success: false, error: "title is required" };
      const prioridad = PRIORIDAD_ORDEN.includes(args.priority as Prioridad)
        ? (args.priority as Prioridad)
        : "Medium";
      const subtask = await createSubtask(taskId, title, prioridad);
      return {
        success: true,
        subtask: {
          id: subtask.id,
          task_id: subtask.task_id,
          title: subtask.title,
          completed: subtask.completed,
          priority: subtask.prioridad,
        },
      };
    }

    return { success: false, error: `Unknown tool: ${name}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown error" };
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
    return { reply: text || "Done.", toolsUsed };
  }

  // Se agotaron las rondas: muchas tools ya pudieron ejecutarse (las acciones
  // persistieron). En vez de un error genérico, lo decimos sin alarmar.
  return {
    reply: "I did what I could this turn. Ask me to continue if something's still missing.",
    toolsUsed,
  };
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY. Copy .env.local.example to .env.local and add your key." },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const message: string = (body?.message ?? "").toString().trim();
  const projectId: string = (body?.projectId ?? "").toString();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Si el chat apunta a un proyecto, debe ser del usuario. (Sin projectId, el PM
  // responde sin contexto de proyecto y no toca datos de nadie.)
  if (projectId) {
    const isOwner = await validateProjectOwnership(projectId, user.id);
    if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Carga proyecto, tareas e historial persistido para darle contexto al PM.
  // El historial es la fuente de verdad de Supabase, no estado del cliente.
  let system = SYSTEM_PROMPT + `\n\nToday is ${new Date().toISOString().slice(0, 10)}.`;
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
    const detail = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: `Couldn't reach Claude: ${detail}` }, { status: 502 });
  }
}
