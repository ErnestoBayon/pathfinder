import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthUser } from "@/lib/auth";
import { createTask, createSubtask, createSuggestedTask } from "@/lib/store";
import type { Prioridad } from "@/lib/types";

export const runtime = "nodejs";

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const TASKS: { texto: string; prioridad: Prioridad; offsetDays: number }[] = [
  { texto: "Read: Python for Data Analysis — Chapters 1–3", prioridad: "Low", offsetDays: 5 },
  { texto: "Homework 1: Exploratory Data Analysis with pandas", prioridad: "Medium", offsetDays: 12 },
  { texto: "Read: Statistical Learning — Chapters 4–6", prioridad: "Low", offsetDays: 20 },
  { texto: "Homework 2: Linear Regression & Model Evaluation", prioridad: "Medium", offsetDays: 27 },
  { texto: "Midterm Exam: Topics 1–6", prioridad: "High", offsetDays: 35 },
  { texto: "Homework 3: Classification & Decision Trees", prioridad: "Medium", offsetDays: 48 },
  { texto: "Read: Deep Learning — Chapters 1–4", prioridad: "Low", offsetDays: 55 },
  { texto: "Final Project: End-to-End ML Pipeline", prioridad: "High", offsetDays: 70 },
];

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Idempotency: if a demo project already exists, redirect into it.
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_demo", true)
    .maybeSingle();
  if (existing) return NextResponse.json({ projectId: existing.id });

  // Create the demo project.
  const projectId = `proj-${crypto.randomUUID()}`;
  const { error: projErr } = await supabase.from("projects").insert({
    id: projectId,
    nombre: "Example Project",
    descripcion: "Course syllabus tasks, homework assignments, and final project.",
    color: "#0E9F6E",
    user_id: user.id,
    is_demo: true,
  });
  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 });
  }

  const today = new Date();
  let finalTaskId: string | null = null;

  for (const t of TASKS) {
    const task = await createTask(projectId, t.texto, {
      prioridad: t.prioridad,
      deadline: addDays(today, t.offsetDays),
    });
    // Last task in the array is "Final Project" — it gets subtasks.
    finalTaskId = task.id;
  }

  if (finalTaskId) {
    await createSubtask(finalTaskId, "Define problem statement and dataset", "Medium");
    await createSubtask(finalTaskId, "Build and evaluate baseline model", "High");
    await createSubtask(finalTaskId, "Write final report and prepare presentation", "Medium");
  }

  // Two AI-suggested tasks so the Suggestions panel is populated on first open.
  await createSuggestedTask(projectId, "Set up project repository and virtual environment", {
    prioridad: "Low",
    deadline: addDays(today, 3),
  });
  await createSuggestedTask(projectId, "Review professor's office hours and course calendar", {
    prioridad: "Medium",
    deadline: addDays(today, 7),
  });

  return NextResponse.json({ projectId });
}
