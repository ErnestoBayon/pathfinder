import { NextResponse } from "next/server";
import { deleteSubtask, updateSubtask, type SubtaskPatch } from "@/lib/store";
import { getAuthUser, validateProjectOwnership } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// Resuelve el project_id dueño de una subtarea: subtask → task_id → project_id
// (service-role, sin RLS). null si la subtarea o su tarea no existen.
async function projectIdForSubtask(subtaskId: string): Promise<string | null> {
  const { data: sub } = await supabase
    .from("subtasks")
    .select("task_id")
    .eq("id", subtaskId)
    .maybeSingle();
  const taskId = (sub as { task_id: string } | null)?.task_id;
  if (!taskId) return null;
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle();
  return (task as { project_id: string } | null)?.project_id ?? null;
}

// PATCH /api/subtasks/[id] — actualiza los campos que vengan en el body (completed, title).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = await projectIdForSubtask(params.id);
  const isOwner = projectId !== null && (await validateProjectOwnership(projectId, user.id));
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const patch: SubtaskPatch = {};

  if (body?.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
    }
    patch.completed = body.completed;
  }

  if (body?.title !== undefined) {
    const title = body.title.toString().trim();
    if (!title) {
      return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
    }
    patch.title = title;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const subtask = await updateSubtask(params.id, patch);
    return NextResponse.json({ subtask });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't update the subtask: ${detail}` },
      { status: 500 },
    );
  }
}

// DELETE /api/subtasks/[id] — elimina la subtarea, sin confirmación.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = await projectIdForSubtask(params.id);
  const isOwner = projectId !== null && (await validateProjectOwnership(projectId, user.id));
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await deleteSubtask(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't delete the subtask: ${detail}` },
      { status: 500 },
    );
  }
}
