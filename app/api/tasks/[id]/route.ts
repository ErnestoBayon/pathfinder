import { NextResponse } from "next/server";
import { toggleTask } from "@/lib/store";

export const runtime = "nodejs";

// PATCH /api/tasks/[id] — fija el estado de una tarea ("pending" | "done").
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const estado = (body?.estado ?? "").toString();

  if (estado !== "pending" && estado !== "done") {
    return NextResponse.json({ error: 'estado debe ser "pending" o "done"' }, { status: 400 });
  }

  try {
    const task = await toggleTask(params.id, estado);
    return NextResponse.json({ task });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudo actualizar la tarea: ${detail}` },
      { status: 500 },
    );
  }
}
