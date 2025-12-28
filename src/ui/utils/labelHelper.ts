import type { GameType } from "../../domain/types";
import { UI_STRINGS } from "../constants/uiStrings";

export const GAME_TYPE_LABELS: Record<GameType, string> = UI_STRINGS.GAMES;

export const getGameTypeLabel = (type: GameType): string => {
  return GAME_TYPE_LABELS[type] ?? type;
};
