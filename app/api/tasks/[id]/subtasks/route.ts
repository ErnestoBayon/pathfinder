import { NextResponse } from "next/server";
import { createSubtask, listSubtasks } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/tasks/[id]/subtasks — lista las subtareas de una tarea, ordenadas por position.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const subtasks = await listSubtasks(params.id);
    return NextResponse.json({ subtasks });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudieron cargar las subtareas: ${detail}` },
      { status: 500 },
    );
  }
}

// POST /api/tasks/[id]/subtasks — crea una subtarea al final de la lista.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const title = (body?.title ?? "").toString().trim();

  if (!title) {
    return NextResponse.json({ error: "El título de la subtarea es requerido" }, { status: 400 });
  }

  try {
    const subtask = await createSubtask(params.id, title);
    return NextResponse.json({ subtask }, { status: 201 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudo crear la subtarea: ${detail}` },
      { status: 500 },
    );
  }
}
