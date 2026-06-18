import { NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/store";
import { getAuthUser, validateProjectOwnership } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/projects/[id]/tasks — lista las tareas del proyecto (para refetch del cliente).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isOwner = await validateProjectOwnership(params.id, user.id);
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const tasks = await listTasks(params.id);
    return NextResponse.json({ tasks });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't load the tasks: ${detail}` },
      { status: 500 },
    );
  }
}

// POST /api/projects/[id]/tasks — crea una tarea en el proyecto.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isOwner = await validateProjectOwnership(params.id, user.id);
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const texto = (body?.texto ?? "").toString().trim();

  if (!texto) {
    return NextResponse.json({ error: "Task text is required" }, { status: 400 });
  }

  try {
    const task = await createTask(params.id, texto);
    return NextResponse.json({ task });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't create the task: ${detail}` },
      { status: 500 },
    );
  }
}
