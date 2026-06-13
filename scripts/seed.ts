/**
 * Seed: migra el contenido actual de data/project.json a Supabase.
 * Preserva XP e historial reales (activity_log). Idempotente: re-correrlo
 * borra el proyecto (cascade) y lo vuelve a sembrar.
 *
 * Uso:  npm run seed
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const ROOT = process.cwd();

// Cargar .env.local a mano (tsx/node no lo hacen automáticamente).
function loadEnv(file: string): void {
  let raw: string;
  try {
    raw = readFileSync(file, "utf-8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

loadEnv(path.join(ROOT, ".env.local"));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const project: Json = JSON.parse(readFileSync(path.join(ROOT, "data", "project.json"), "utf-8"));

async function main(): Promise<void> {
  console.log(`Sembrando proyecto "${project.nombre}" (${project.id})…`);

  // Idempotente: borrar el proyecto borra en cascada levels/quests/activity_log.
  {
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) throw error;
  }

  {
    const { error } = await supabase.from("projects").insert({
      id: project.id,
      nombre: project.nombre,
      template: project.template,
      xp_total: project.xp_total,
    });
    if (error) throw error;
  }

  const levels = project.niveles.map((l: Json, i: number) => ({
    id: l.id,
    project_id: project.id,
    nombre: l.nombre,
    descripcion: l.descripcion,
    orden: i,
    estado: l.estado,
  }));
  {
    const { error } = await supabase.from("levels").insert(levels);
    if (error) throw error;
  }

  const quests = project.niveles.flatMap((l: Json) =>
    l.quests.map((q: Json, i: number) => ({
      id: q.id,
      level_id: l.id,
      texto: q.texto,
      estado: q.estado,
      deadline: q.deadline ?? null,
      xp: q.xp,
      orden: i,
    })),
  );
  if (quests.length) {
    const { error } = await supabase.from("quests").insert(quests);
    if (error) throw error;
  }

  const log = project.activity_log.map((e: Json) => ({
    project_id: project.id,
    timestamp: e.timestamp,
    tipo: e.tipo,
    descripcion: e.descripcion,
  }));
  if (log.length) {
    const { error } = await supabase.from("activity_log").insert(log);
    if (error) throw error;
  }

  console.log(
    `✅ Sembrado: ${levels.length} niveles, ${quests.length} quests, ${log.length} entradas de historial, xp_total=${project.xp_total}.`,
  );
}

main().catch((e: Json) => {
  console.error("❌ Seed falló:", e?.message ?? e);
  process.exit(1);
});
