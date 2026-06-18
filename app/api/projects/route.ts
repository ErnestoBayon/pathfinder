import { NextResponse } from "next/server";
import { createProject } from "@/lib/store";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const nombre = (body?.nombre ?? "").toString().trim();
  const descripcion = (body?.descripcion ?? "").toString().trim();
  const color = (body?.color ?? "").toString().trim() || DEFAULT_PROJECT_COLOR;

  if (!nombre) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const project = await createProject(nombre, descripcion, color);
    return NextResponse.json({ project });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't create the project: ${detail}` },
      { status: 500 },
    );
  }
}
