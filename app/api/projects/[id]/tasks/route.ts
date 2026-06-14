import { NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/projects/[id]/tasks — lista las tareas del proyecto (para refetch del cliente).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const tasks = await listTasks(params.id);
    return NextResponse.json({ tasks });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudieron cargar las tareas: ${detail}` },
      { status: 500 },
    );
  }
}

// POST /api/projects/[id]/tasks — crea una tarea en el proyecto.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const texto = (body?.texto ?? "").toString().trim();

  if (!texto) {
    return NextResponse.json({ error: "El texto de la tarea es requerido" }, { status: 400 });
  }

  try {
    const task = await createTask(params.id, texto);
    return NextResponse.json({ task });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudo crear la tarea: ${detail}` },
      { status: 500 },
    );
  }
}
