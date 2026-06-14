import { NextResponse } from "next/server";
import { createTask } from "@/lib/store";

export const runtime = "nodejs";

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
