import { promises as fs } from "fs";
import path from "path";
import projectSeed from "@/data/project.json";
import templatesSeed from "@/data/templates.json";
import type {
  ActivityType,
  MutationResult,
  Project,
  Templates,
} from "./types";

// Datos en JSON local (por ahora). Server-only: este módulo usa fs.
// Nota: en plataformas con filesystem de solo lectura (p. ej. Vercel) las escrituras
// degradan con gracia y el estado vive en memoria durante la sesión. La persistencia
// real es el nivel "Persistencia" (pb-4) del roadmap.
const DATA_DIR = path.join(process.cwd(), "data");
const PROJECT_PATH = path.join(DATA_DIR, "project.json");
const TEMPLATES_PATH = path.join(DATA_DIR, "templates.json");

export async function readProject(): Promise<Project> {
  try {
    const raw = await fs.readFile(PROJECT_PATH, "utf-8");
    return JSON.parse(raw) as Project;
  } catch {
    // FS no disponible: usar el snapshot empaquetado en build (clonado por request).
    return structuredClone(projectSeed) as unknown as Project;
  }
}

export async function writeProject(project: Project): Promise<void> {
  try {
    await fs.writeFile(PROJECT_PATH, JSON.stringify(project, null, 2) + "\n", "utf-8");
  } catch (err) {
    // FS de solo lectura (Vercel): no persistimos, pero no rompemos la request.
    console.warn(
      "writeProject: no se pudo persistir (¿FS de solo lectura?):",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function readTemplates(): Promise<Templates> {
  try {
    const raw = await fs.readFile(TEMPLATES_PATH, "utf-8");
    return JSON.parse(raw) as Templates;
  } catch {
    return structuredClone(templatesSeed) as unknown as Templates;
  }
}

/** TODA acción de la app pasa por aquí: registra una entrada en el activity_log. */
export function logActivity(
  project: Project,
  tipo: ActivityType,
  descripcion: string,
): void {
  project.activity_log.push({
    timestamp: new Date().toISOString(),
    tipo,
    descripcion,
  });
}

/**
 * Completa una quest por id: suma su XP, registra la acción y, si el nivel queda
 * terminado, lo marca done y desbloquea el siguiente nivel (con su propio registro).
 */
export function completeQuest(project: Project, questId: string): MutationResult {
  const result: MutationResult = { project };

  for (let i = 0; i < project.niveles.length; i++) {
    const level = project.niveles[i];
    const quest = level.quests.find((q) => q.id === questId);
    if (!quest) continue;

    // Idempotente: si ya estaba hecha, no duplicamos XP ni log.
    if (quest.estado === "done") return result;

    quest.estado = "done";
    project.xp_total += quest.xp;
    result.completedQuestId = quest.id;
    logActivity(
      project,
      "quest_completed",
      `Quest completada: ${quest.texto} (+${quest.xp} XP)`,
    );

    const allDone = level.quests.length > 0 && level.quests.every((q) => q.estado === "done");
    if (allDone && level.estado !== "done") {
      level.estado = "done";
      result.levelCompletedId = level.id;

      // Desbloquea el siguiente nivel bloqueado.
      const next = project.niveles.slice(i + 1).find((l) => l.estado === "locked");
      if (next) {
        next.estado = "active";
        result.unlockedLevelId = next.id;
        logActivity(project, "level_unlocked", `Nivel desbloqueado: ${next.nombre}`);
      }
    }
    break;
  }

  return result;
}

/** Agrega una quest pendiente al nivel activo y registra la acción. */
export function addQuest(
  project: Project,
  texto: string,
  xp: number,
): MutationResult {
  const target =
    project.niveles.find((l) => l.estado === "active") ??
    project.niveles.find((l) => l.estado === "locked");

  if (target) {
    const id = `q-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
    target.quests.push({ id, texto, estado: "pending", xp });
    logActivity(project, "quest_added", `Quest agregada: ${texto} (+${xp} XP)`);
  }

  return { project };
}
