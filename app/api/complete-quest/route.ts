import { NextResponse } from "next/server";
import { completeQuest, readProject, writeProject } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const questId: string | undefined = body?.questId;

  if (!questId) {
    return NextResponse.json({ error: "questId requerido" }, { status: 400 });
  }

  const project = await readProject();
  const result = completeQuest(project, questId);
  await writeProject(result.project);

  return NextResponse.json(result);
}
