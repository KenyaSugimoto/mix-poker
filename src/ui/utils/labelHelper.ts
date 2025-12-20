import type { GameType } from "../../domain/types";

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  studHi: "7 Card Stud",
  razz: "Razz",
  stud8: "Stud Hi/Lo 8-or-Better",
};

export const getGameTypeLabel = (type: GameType): string => {
  return GAME_TYPE_LABELS[type] ?? type;
};
