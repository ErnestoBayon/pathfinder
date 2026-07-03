import { NextResponse } from "next/server";
import { createSubtask, listSubtasks } from "@/lib/store";
import { getAuthUser, validateProjectOwnership, projectIdForTask } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/tasks/[id]/subtasks — lista las subtareas de una tarea, ordenadas por position.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = await projectIdForTask(params.id);
  const isOwner = projectId !== null && (await validateProjectOwnership(projectId, user.id));
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const subtasks = await listSubtasks(params.id);
    return NextResponse.json({ subtasks });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't load the subtasks: ${detail}` },
      { status: 500 },
    );
  }
}

// POST /api/tasks/[id]/subtasks — crea una subtarea al final de la lista.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = await projectIdForTask(params.id);
  const isOwner = projectId !== null && (await validateProjectOwnership(projectId, user.id));
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = (body?.title ?? "").toString().trim();

  if (!title) {
    return NextResponse.json({ error: "Subtask title is required" }, { status: 400 });
  }

  const VALID_PRIORIDADES = ["High", "Medium", "Low"] as const;
  type P = (typeof VALID_PRIORIDADES)[number];
  const prioridad: P =
    body?.prioridad !== undefined && VALID_PRIORIDADES.includes(body.prioridad)
      ? (body.prioridad as P)
      : "Medium";

  try {
    const subtask = await createSubtask(params.id, title, prioridad);
    return NextResponse.json({ subtask }, { status: 201 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't create the subtask: ${detail}` },
      { status: 500 },
    );
  }
}
