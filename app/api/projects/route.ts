import { NextResponse } from "next/server";
import { createProject } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const nombre = (body?.nombre ?? "").toString().trim();
  const descripcion = (body?.descripcion ?? "").toString().trim();

  if (!nombre) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const project = await createProject(nombre, descripcion);
    return NextResponse.json({ project });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json(
      { error: `Couldn't create the project: ${detail}` },
      { status: 500 },
    );
  }
}
