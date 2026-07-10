import { NextResponse } from "next/server";
import { deleteTask, updateTask, type TaskPatch } from "@/lib/store";
import { PRIORIDAD_ORDEN, type Prioridad, type TaskState } from "@/lib/types";
import { getAuthUser, validateProjectOwnership, projectIdForTask } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// Un evento de instrumentación para la tabla `experiment_events`.
interface ExperimentEvent {
  user_id: string;
  task_id: string;
  project_id: string;
  event_type: string;
  previous_value: string | null;
  new_value: string | null;
}

// Inserta eventos en `experiment_events`. Best-effort: si el insert falla,
// loggea el error en consola y sigue (nunca debe romper la respuesta del PATCH).
async function logTaskEvents(events: ExperimentEvent[]): Promise<void> {
  if (events.length === 0) return;
  try {
    const { error } = await supabase.from("experiment_events").insert(events);
    if (error) {
      console.error("experiment_events insert failed:", error.message);
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    console.error("experiment_events insert failed:", detail);
  }
}

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
    if (body.estado !== "todo" && body.estado !== "doing" && body.estado !== "done") {
      return NextResponse.json(
        { error: 'estado must be "todo", "doing" or "done"' },
        { status: 400 },
      );
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

  // Aprobar una sugerencia de la IA = pasar suggested a false (deja de ser sugerida).
  if (body?.suggested !== undefined) {
    if (typeof body.suggested !== "boolean") {
      return NextResponse.json({ error: "suggested must be a boolean" }, { status: 400 });
    }
    patch.suggested = body.suggested;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Leemos el estado previo de la tarea para poder loggear qué cambió (service-role).
  const { data: prevTask } = await supabase
    .from("tasks")
    .select("estado, prioridad, project_id")
    .eq("id", params.id)
    .maybeSingle();
  const prev = prevTask as
    | { estado: TaskState; prioridad: Prioridad; project_id: string }
    | null;

  try {
    const task = await updateTask(params.id, patch);

    // Instrumentación del experimento: registra los cambios relevantes.
    // Opción B: PK lookup separado en lugar de join PostgREST (Opción A), porque
    // este proyecto usa TEXT ids y no podemos garantizar que la FK esté registrada
    // en el schema cache de PostgREST. La query es O(log n) sobre el PK indexado.
    if (prev) {
      const { data: projRow } = await supabase
        .from("projects")
        .select("is_demo")
        .eq("id", prev.project_id)
        .maybeSingle();

      if (!projRow?.is_demo) {
        const base = { user_id: user.id, task_id: params.id, project_id: prev.project_id };
        const events: ExperimentEvent[] = [];

        if (task.estado !== prev.estado) {
          events.push({
            ...base,
            event_type: "status_changed",
            previous_value: prev.estado,
            new_value: task.estado,
          });
          if (task.estado === "done") {
            events.push({
              ...base,
              event_type: "task_completed",
              previous_value: prev.estado,
              new_value: task.estado,
            });
          }
        }

        if (task.prioridad !== prev.prioridad) {
          events.push({
            ...base,
            event_type: "priority_changed",
            previous_value: prev.prioridad,
            new_value: task.prioridad,
          });
        }

        await logTaskEvents(events);
      }
    }

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
