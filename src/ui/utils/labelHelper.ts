import type { GameType } from "../../domain/types";

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  studHi: "Stud Hi",
  razz: "Razz",
  stud8: "Stud Hi/Lo",
};

export const getGameTypeLabel = (type: GameType): string => {
  return GAME_TYPE_LABELS[type] ?? type;
};
