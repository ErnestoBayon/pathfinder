export type LevelState = "done" | "active" | "locked";
export type QuestState = "done" | "pending";

export type ActivityType =
  | "quest_completed"
  | "quest_added"
  | "message"
  | "level_unlocked";

export interface Quest {
  id: string;
  texto: string;
  estado: QuestState;
  xp: number;
  deadline?: string;
}

export interface Level {
  id: string;
  nombre: string;
  descripcion: string;
  estado: LevelState;
  quests: Quest[];
}

export interface ActivityEntry {
  timestamp: string;
  tipo: ActivityType;
  descripcion: string;
}

export interface Project {
  id: string;
  nombre: string;
  template: string;
  xp_total: number;
  niveles: Level[];
  activity_log: ActivityEntry[];
}

export interface TemplateLevel {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Template {
  id: string;
  nombre: string;
  niveles: TemplateLevel[];
}

export type Templates = Record<string, Template>;

/** Resumen de un proyecto para las cards del Home. */
export interface ProjectSummary {
  id: string;
  nombre: string;
  xp_total: number;
  /** Nombre del nivel activo, o null si no hay. */
  nivelActual: string | null;
  questsDone: number;
  questsTotal: number;
  /** Texto de la primera quest pendiente del nivel activo, o null. */
  proximaQuest: string | null;
}

/** Resultado de aplicar una acción al proyecto (sirve para disparar animaciones en el cliente). */
export interface MutationResult {
  project: Project;
  /** id de la quest recién completada, si aplica. */
  completedQuestId?: string;
  /** id del nivel que se acaba de marcar como done, si aplica. */
  levelCompletedId?: string;
  /** id del nivel que se acaba de desbloquear (celebración), si aplica. */
  unlockedLevelId?: string;
}
