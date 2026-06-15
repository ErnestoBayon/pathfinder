import { NextResponse } from "next/server";
import { deleteTask, updateTask, type TaskPatch } from "@/lib/store";
import { PRIORIDAD_ORDEN } from "@/lib/types";

export const runtime = "nodejs";

// PATCH /api/tasks/[id] — actualiza los campos que vengan en el body
// (estado, texto, prioridad, deadline u orden). Valida cada campo presente.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const patch: TaskPatch = {};

  if (body?.estado !== undefined) {
    if (body.estado !== "pending" && body.estado !== "done") {
      return NextResponse.json({ error: 'estado debe ser "pending" o "done"' }, { status: 400 });
    }
    patch.estado = body.estado;
  }

  if (body?.texto !== undefined) {
    const texto = body.texto.toString().trim();
    if (!texto) {
      return NextResponse.json({ error: "El texto no puede ir vacío" }, { status: 400 });
    }
    patch.texto = texto;
  }

  if (body?.prioridad !== undefined) {
    if (!PRIORIDAD_ORDEN.includes(body.prioridad)) {
      return NextResponse.json(
        { error: "prioridad debe ser alta, media o baja" },
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
      return NextResponse.json({ error: "orden debe ser un número" }, { status: 400 });
    }
    patch.orden = orden;
  }

  if (body?.es_clave !== undefined) {
    if (typeof body.es_clave !== "boolean") {
      return NextResponse.json({ error: "es_clave debe ser booleano" }, { status: 400 });
    }
    patch.es_clave = body.es_clave;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const task = await updateTask(params.id, patch);
    return NextResponse.json({ task });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudo actualizar la tarea: ${detail}` },
      { status: 500 },
    );
  }
}

// DELETE /api/tasks/[id] — elimina la tarea, sin confirmación.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteTask(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `No se pudo eliminar la tarea: ${detail}` },
      { status: 500 },
    );
  }
}
