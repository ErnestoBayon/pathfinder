import { NextResponse } from "next/server";
import { deleteSubtask, updateSubtask, type SubtaskPatch } from "@/lib/store";

export const runtime = "nodejs";

// PATCH /api/subtasks/[id] — actualiza los campos que vengan en el body (completed, title).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const patch: SubtaskPatch = {};

  if (body?.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "completed debe ser booleano" }, { status: 400 });
    }
    patch.completed = body.completed;
  }

  if (body?.title !== undefined) {
    const title = body.title.toString().trim();
    if (!title) {
      return NextResponse.json({ error: "El título no puede ir vacío" }, { status: 400 });
    }
    patch.title = title;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const subtask = await updateSubtask(params.id, patch);
    return NextResponse.json({ subtask });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudo actualizar la subtarea: ${detail}` },
      { status: 500 },
    );
  }
}

// DELETE /api/subtasks/[id] — elimina la subtarea, sin confirmación.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteSubtask(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudo eliminar la subtarea: ${detail}` },
      { status: 500 },
    );
  }
}
