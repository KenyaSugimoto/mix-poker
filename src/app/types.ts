import type { DealState, GameState } from "../domain/types";

export type Screen = "SETUP" | "PLAY" | "HISTORY" | "SETTINGS";

export interface UiState {
  screen: Screen;
  selectedDealId: string | null;
  displayUnit: "points" | "bb";
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
