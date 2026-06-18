import { NextResponse } from "next/server";
import { updateProject } from "@/lib/store";
import { getAuthUser, validateProjectOwnership } from "@/lib/auth";
import { isValidProjectColor } from "@/lib/colors";

export const runtime = "nodejs";

// PATCH /api/projects/[id] — actualiza campos del proyecto (por ahora, solo el color).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isOwner = await validateProjectOwnership(params.id, user.id);
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const color = (body?.color ?? "").toString().trim();

  if (!isValidProjectColor(color)) {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }

  try {
    const project = await updateProject(params.id, { color });
    return NextResponse.json({ project });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't update the project: ${detail}` },
      { status: 500 },
    );
  }
}
