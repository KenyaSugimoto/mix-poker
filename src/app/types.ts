import type { DealState, GameState } from "../domain/types";

export type Screen = "SETUP" | "PLAY" | "HISTORY" | "SETTINGS";

/** CPU戦略レベル */
export type CpuLevel = "lv0" | "lv1" | "lv2";

export interface UiState {
  screen: Screen;
  selectedDealId: string | null;
  displayUnit: "points" | "bb";
  cpuLevel: CpuLevel;
}

export interface FullStore {
  fullDealIds: string[];
  fullDealsById: Record<string, DealState>;
  favoriteDealIds: string[];
}

export interface AppState {
  version: number; // schema version
  ui: UiState;
  game: GameState | null;
  fullStore: FullStore;
  lastLoadError: string | null;
}
