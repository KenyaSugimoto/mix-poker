import { create } from "zustand";
import { produce } from "immer";
import type { AppState, UiState, FullStore } from "../types";
import type { Event, GameState } from "../../domain/types";
import { applyEvent } from "../../domain/engine/applyEvent";
import { saveAppState, loadAppState, STORAGE_VERSION } from "./persistence";
import { startNewDeal, type StartDealParams } from "../../domain/game";

export interface AppActions {
  initialize: () => void;
  startNewGame: (initialGameState: GameState) => void;
  startDeal: (params: StartDealParams) => void;
  dispatch: (event: Event) => void;
  resetAll: () => void;
  setScreen: (screen: UiState["screen"]) => void;
}

export type AppStore = AppState & AppActions;

const INITIAL_UI: UiState = {
  screen: "SETUP",
  selectedDealId: null,
  displayUnit: "points",
};

const INITIAL_FULL_STORE: FullStore = {
  fullDealIds: [],
  fullDealsById: {},
  favoriteDealIds: [],
};

const DEFAULT_STATE: AppState = {
  version: STORAGE_VERSION,
  ui: INITIAL_UI,
  game: null,
  fullStore: INITIAL_FULL_STORE,
  lastLoadError: null,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...DEFAULT_STATE,

  initialize: () => {
    const loaded = loadAppState();
    if (loaded) {
      // バージョンチェックなどが必要ならここで行う (persistence側でnullを返す想定だが念のため)
      if (loaded.version !== STORAGE_VERSION) {
        set({ lastLoadError: "Version mismatch, state reset." });
      } else {
        set(loaded);
      }
    }
  },

  startNewGame: (game: GameState) => {
    set(
      produce((state: AppState) => {
        state.game = game;
        state.ui.screen = "PLAY";
        // 新しいゲームなのでFullStoreはキープしつつ、Gameはリセット
        // ※要件次第だが、ここでは簡易的に上書き
      }),
    );
  },

  startDeal: (params: StartDealParams) => {
    set(
      produce((state: AppState) => {
        if (!state.game) return;
        state.game = startNewDeal(state.game, params);
      }),
    );
  },

  dispatch: (event: Event) => {
    set(
      produce((state: AppState) => {
        if (!state.game || !state.game.currentDeal) return;

        // Apply event
        const nextDeal = applyEvent(state.game.currentDeal, event);
        state.game.currentDeal = nextDeal;

        // Domain側でのイベント適用後の副作用（もしあれば）
        // 例: Deal終了判定などは applyEvent 内の dealFinished でわかる

        // Persist logic
        if (event.type === "STREET_ADVANCE" || event.type === "DEAL_END") {
          // 状態更新後に保存するためのフラグ等は不要、immer完了後にsaveAppStateを呼ぶために
          // ここでsaveはできない（produce内）。
          // したがって、produceの外でsaveするか、middlewareを使う。
          // シンプルにするため、set完了後に getState して save する必要があるが
          // zustandのstandard patternでは外側でやる。
          // しかしここは action 内部。
          // produceの副作用として外部関数を呼ぶのはあまり良くないが、
          // 同期的localStorageなら許容範囲か、あるいは subscribe を使うべきか。
          // MVP手動保存なので、シンプルに action の最後で呼ぶ形にする。
        }
      }),
    );

    // Persistence Check
    // produceが完了して state が更新された後に保存する。
    const current = get();
    if (event.type === "STREET_ADVANCE" || event.type === "DEAL_END") {
        
        // DealEnd時の特別な処理（履歴追加など）は本来ここで行うべきだが、
        // M1/M2範囲では「保存」まで。
        // DealEndの詳細は M6 で実装するため、ここでは単純保存のみ。
        // ただし、もし dealFinished が true なら履歴移動などが必要になる。
        // MVP M2では「保存できること」を確認する。
        
      saveAppState(current);
    }
  },

  resetAll: () => {
    set(DEFAULT_STATE);
    localStorage.removeItem("mix-poker:appState"); // 直接キー指定注意
    // STORAGE_KEYをexportして使うべきだがimport循環に注意。今回は直書きor別ファイル定数共有
  },

  setScreen: (screen) => {
    set(
      produce((state: AppState) => {
        state.ui.screen = screen;
      }),
    );
  },
}));
