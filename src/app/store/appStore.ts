import { produce } from "immer";
import { create } from "zustand";
import { runCpuTurn } from "../../domain/cpu/runner";
import { applyEvent } from "../../domain/engine/applyEvent";
import { type StartDealParams, startNewDeal } from "../../domain/game";
import { checkStreetEndCondition } from "../../domain/rules/street";
import type { Event, GameState } from "../../domain/types";
import type { AppState, FullStore, UiState } from "../types";
import { loadAppState, saveAppState, STORAGE_VERSION } from "./persistence";

export interface AppActions {
  initialize: () => void;
  startNewGame: (initialGameState: GameState) => void;
  startDeal: (params: StartDealParams) => void;
  dispatch: (event: Event) => void;
  processCpuTurns: () => void;
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

        // ストリート終了判定
        const endEvent = checkStreetEndCondition(nextDeal);
        if (endEvent) {
          const afterEndDeal = applyEvent(nextDeal, endEvent);
          state.game.currentDeal = afterEndDeal;
        }
      }),
    );

    // 保存チェック
    const current = get();
    if (!current.game || !current.game.currentDeal) return;

    const deal = current.game.currentDeal;
    const endEvent = checkStreetEndCondition(deal);
    if (endEvent) {
      // 保存
      if (endEvent.type === "STREET_ADVANCE" || endEvent.type === "DEAL_END") {
        saveAppState(current);
      }

      // DEAL_ENDの場合はCPUターンを実行しない
      if (endEvent.type === "DEAL_END") return;
    } else {
      // 通常のイベントでも保存が必要な場合
      if (event.type === "STREET_ADVANCE" || event.type === "DEAL_END") {
        saveAppState(current);
      }
    }

    // CPUターンの自動進行（Humanアクション後）
    setTimeout(() => {
      get().processCpuTurns();
    }, 500); // Humanアクション後のCPUターン開始までのdelay
  },

  /**
   * CPUターンを連続実行する（再帰的に）
   */
  processCpuTurns: () => {
    const state = get();
    if (!state.game || !state.game.currentDeal) return;

    const deal = state.game.currentDeal;
    if (deal.dealFinished) return;

    const currentActor = deal.players[deal.currentActorIndex];
    if (!currentActor || currentActor.kind !== "cpu") return;

    // CPUターン実行前に短いdelayを入れる
    setTimeout(() => {
      const currentState = get();
      if (!currentState.game || !currentState.game.currentDeal) return;

      const currentDeal = currentState.game.currentDeal;
      if (currentDeal.dealFinished) return;

      const actor = currentDeal.players[currentDeal.currentActorIndex];
      if (!actor || actor.kind !== "cpu") return;

      // CPUターンを実行
      const result = runCpuTurn(currentDeal, currentDeal.currentActorIndex);
      if (!result) return;

      // イベントを適用
      set(
        produce((state: AppState) => {
          if (!state.game) return;
          state.game.currentDeal = result.nextState;
        }),
      );

      // ストリート終了判定
      const nextDeal = result.nextState;
      const endEvent = checkStreetEndCondition(nextDeal);
      let finalDeal = nextDeal;
      if (endEvent) {
        finalDeal = applyEvent(nextDeal, endEvent);
        set(
          produce((state: AppState) => {
            if (state.game) {
              state.game.currentDeal = finalDeal;
            }
          }),
        );

        // 保存
        if (
          endEvent.type === "STREET_ADVANCE" ||
          endEvent.type === "DEAL_END"
        ) {
          saveAppState(get());
        }

        // DEAL_ENDの場合は終了
        if (endEvent.type === "DEAL_END") return;
      }

      // 次のアクターがCPUかチェック
      const updatedState = get();
      if (!updatedState.game || !updatedState.game.currentDeal) return;
      const updatedDeal = updatedState.game.currentDeal;
      if (updatedDeal.dealFinished) return;

      const nextActor = updatedDeal.players[updatedDeal.currentActorIndex];
      if (!nextActor || nextActor.kind !== "cpu") return;

      // 次のCPUターンへ（短いdelayを入れる）
      setTimeout(() => {
        get().processCpuTurns();
      }, 800); // MVP: 800ms delay（CPUターン間の間隔）
    }, 800); // CPUターン実行前のdelay
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
