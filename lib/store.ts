import { supabase } from "./supabase";
import templatesSeed from "@/data/templates.json";
import type {
  ActivityType,
  Level,
  MutationResult,
  Project,
  Quest,
  Templates,
} from "./types";

// Un solo proyecto por ahora.
const PROJECT_ID = "proyecto-0";

/** Arma el Project completo (niveles → quests + activity_log) desde Supabase. */
export async function readProject(): Promise<Project> {
  const { data: projectRow, error: pErr } = await supabase
    .from("projects")
    .select("id, nombre, template, xp_total")
    .eq("id", PROJECT_ID)
    .single();
  if (pErr || !projectRow) {
    throw new Error(
      `No se pudo leer el proyecto desde Supabase (${pErr?.message ?? "no existe"}). ¿Corriste la migración SQL y \`npm run seed\`?`,
    );
  }

  const { data: levelRows, error: lErr } = await supabase
    .from("levels")
    .select("id, nombre, descripcion, estado, orden")
    .eq("project_id", PROJECT_ID)
    .order("orden", { ascending: true });
  if (lErr) throw new Error(lErr.message);

  const levelIds = (levelRows ?? []).map((l) => l.id as string);

  let questRows: Array<Record<string, unknown>> = [];
  if (levelIds.length) {
    const { data, error: qErr } = await supabase
      .from("quests")
      .select("id, level_id, texto, estado, deadline, xp, orden")
      .in("level_id", levelIds)
      .order("orden", { ascending: true });
    if (qErr) throw new Error(qErr.message);
    questRows = data ?? [];
  }

  const { data: logRows, error: aErr } = await supabase
    .from("activity_log")
    .select("timestamp, tipo, descripcion")
    .eq("project_id", PROJECT_ID)
    .order("timestamp", { ascending: true });
  if (aErr) throw new Error(aErr.message);

  const niveles: Level[] = (levelRows ?? []).map((l) => ({
    id: l.id as string,
    nombre: l.nombre as string,
    descripcion: l.descripcion as string,
    estado: l.estado as Level["estado"],
    quests: questRows
      .filter((q) => q.level_id === l.id)
      .map(
        (q): Quest => ({
          id: q.id as string,
          texto: q.texto as string,
          estado: q.estado as Quest["estado"],
          xp: q.xp as number,
          ...(q.deadline ? { deadline: q.deadline as string } : {}),
        }),
      ),
  }));

  return {
    id: projectRow.id as string,
    nombre: projectRow.nombre as string,
    template: projectRow.template as string,
    xp_total: projectRow.xp_total as number,
    niveles,
    activity_log: (logRows ?? []).map((e) => ({
      timestamp: e.timestamp as string,
      tipo: e.tipo as ActivityType,
      descripcion: e.descripcion as string,
    })),
  };
}

/** Inserta una entrada en el historial. TODA acción de la app pasa por aquí. */
export async function logActivity(tipo: ActivityType, descripcion: string): Promise<void> {
  const { error } = await supabase
    .from("activity_log")
    .insert({ project_id: PROJECT_ID, tipo, descripcion });
  if (error) throw new Error(error.message);
}

/**
 * Completa una quest: marca done, suma XP, registra, y si el nivel queda terminado
 * lo cierra y desbloquea el siguiente. Devuelve el proyecto fresco + flags de animación.
 */
export async function completeQuest(questId: string): Promise<MutationResult> {
  const project = await readProject();
  const result: MutationResult = { project };

  let levelIndex = -1;
  let found: Quest | undefined;
  for (let i = 0; i < project.niveles.length; i++) {
    const q = project.niveles[i].quests.find((x) => x.id === questId);
    if (q) {
      levelIndex = i;
      found = q;
      break;
    }
  }
  // Idempotente: si no existe o ya estaba hecha, no duplicamos XP ni log.
  if (!found || found.estado === "done") return result;

  const quest = found;
  const level = project.niveles[levelIndex];

  let { error } = await supabase.from("quests").update({ estado: "done" }).eq("id", quest.id);
  if (error) throw new Error(error.message);

  ({ error } = await supabase
    .from("projects")
    .update({ xp_total: project.xp_total + quest.xp })
    .eq("id", project.id));
  if (error) throw new Error(error.message);

  await logActivity("quest_completed", `Quest completada: ${quest.texto} (+${quest.xp} XP)`);
  result.completedQuestId = quest.id;

  const allDone =
    level.quests.length > 0 &&
    level.quests.every((q) => q.id === quest.id || q.estado === "done");
  if (allDone && level.estado !== "done") {
    ({ error } = await supabase.from("levels").update({ estado: "done" }).eq("id", level.id));
    if (error) throw new Error(error.message);
    result.levelCompletedId = level.id;

    const next = project.niveles.slice(levelIndex + 1).find((l) => l.estado === "locked");
    if (next) {
      ({ error } = await supabase.from("levels").update({ estado: "active" }).eq("id", next.id));
      if (error) throw new Error(error.message);
      await logActivity("level_unlocked", `Nivel desbloqueado: ${next.nombre}`);
      result.unlockedLevelId = next.id;
    }
  }

  result.project = await readProject();
  return result;
}

/** Agrega una quest pendiente al nivel activo y registra la acción. */
export async function addQuest(texto: string, xp: number): Promise<MutationResult> {
  const project = await readProject();
  const target =
    project.niveles.find((l) => l.estado === "active") ??
    project.niveles.find((l) => l.estado === "locked");

  if (target) {
    const id = `q-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
    const { error } = await supabase.from("quests").insert({
      id,
      level_id: target.id,
      texto,
      estado: "pending",
      xp,
      orden: target.quests.length,
    });
    if (error) throw new Error(error.message);
    await logActivity("quest_added", `Quest agregada: ${texto} (+${xp} XP)`);
  }

  return { project: await readProject() };
}

/** Plantillas: datos de referencia estáticos (no viven en la base por ahora). */
export async function readTemplates(): Promise<Templates> {
  return templatesSeed as unknown as Templates;
}
