import { NextResponse } from "next/server";
import { deleteTask, updateTask, type TaskPatch } from "@/lib/store";
import { PRIORIDAD_ORDEN } from "@/lib/types";
import { getAuthUser, validateProjectOwnership, projectIdForTask } from "@/lib/auth";

export const runtime = "nodejs";

// PATCH /api/tasks/[id] — actualiza los campos que vengan en el body
// (estado, texto, prioridad, deadline u orden). Valida cada campo presente.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = await projectIdForTask(params.id);
  const isOwner = projectId !== null && (await validateProjectOwnership(projectId, user.id));
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const patch: TaskPatch = {};

  if (body?.estado !== undefined) {
    if (body.estado !== "pending" && body.estado !== "done") {
      return NextResponse.json({ error: 'estado must be "pending" or "done"' }, { status: 400 });
    }
    patch.estado = body.estado;
  }

  if (body?.texto !== undefined) {
    const texto = body.texto.toString().trim();
    if (!texto) {
      return NextResponse.json({ error: "Text can't be empty" }, { status: 400 });
    }
    patch.texto = texto;
  }

  if (body?.prioridad !== undefined) {
    if (!PRIORIDAD_ORDEN.includes(body.prioridad)) {
      return NextResponse.json(
        { error: "priority must be High, Medium or Low" },
        { status: 400 },
      );
    }
    patch.prioridad = body.prioridad;
  }

  if (body?.deadline !== undefined) {
    // null o "" limpia la fecha; cualquier otra cosa se guarda como string (YYYY-MM-DD).
    patch.deadline =
      body.deadline === null || body.deadline === "" ? null : body.deadline.toString();
  }

  if (body?.orden !== undefined) {
    const orden = Number(body.orden);
    if (!Number.isFinite(orden)) {
      return NextResponse.json({ error: "orden must be a number" }, { status: 400 });
    }
    patch.orden = orden;
  }

  if (body?.es_clave !== undefined) {
    if (typeof body.es_clave !== "boolean") {
      return NextResponse.json({ error: "es_clave must be a boolean" }, { status: 400 });
    }
    patch.es_clave = body.es_clave;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const task = await updateTask(params.id, patch);
    return NextResponse.json({ task });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't update the task: ${detail}` },
      { status: 500 },
    );
  }
}

// DELETE /api/tasks/[id] — elimina la tarea, sin confirmación.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = await projectIdForTask(params.id);
  const isOwner = projectId !== null && (await validateProjectOwnership(projectId, user.id));
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await deleteTask(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't delete the task: ${detail}` },
      { status: 500 },
    );
  }
}
