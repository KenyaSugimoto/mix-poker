import { produce } from "immer";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { runCpuTurn } from "../../domain/cpu/runner";
import { applyEvent } from "../../domain/engine/applyEvent";
import {
  finishDeal,
  type StartDealParams,
  startNewDeal,
} from "../../domain/game";
import { checkStreetEndCondition } from "../../domain/rules/street";
import type {
  DealCardEvent,
  DealCards3rdEvent,
  DealInitEvent,
  Event,
  GameState,
  PostAnteEvent,
} from "../../domain/types";
import { generateId } from "../../domain/utils/id";
import type { AppState, FullStore, UiState } from "../types";
import {
  loadAppState,
  STORAGE_KEY,
  STORAGE_VERSION,
  saveAppState,
} from "./persistence";

const MAX_FULL_RECENT = 10;

/**
 * フル保存のeviction処理（fullDealIdsに含まれないものを削除）
 */
const evictFullDeals = (state: AppState): void => {
  const keepIds = new Set<string>(state.fullStore.fullDealIds);

  for (const id of Object.keys(state.fullStore.fullDealsById)) {
    if (!keepIds.has(id)) {
      delete state.fullStore.fullDealsById[id];
    }
  }

  // お気に入りも、フルが存在しないものは削除
  state.fullStore.favoriteDealIds = state.fullStore.favoriteDealIds.filter(
    (id) => keepIds.has(id),
  );
};

export interface AppActions {
  initialize: () => void;
  startNewGame: (initialGameState: GameState) => void;
  startDeal: (params: StartDealParams) => void;
  dispatch: (event: Event) => void;
  processCpuTurns: () => void;
  resetAll: () => void;
  setScreen: (screen: UiState["screen"]) => void;
  setSelectedDealId: (dealId: string | null) => void;
  toggleFavoriteDeal: (dealId: string) => void;
  setDisplayUnit: (unit: "points" | "bb") => void;
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

// ストア作成関数
// biome-ignore lint/suspicious/noExplicitAny: Zustandのcreate関数の型定義
const storeCreator = (set: any, get: any): AppStore => ({
  ...DEFAULT_STATE,

  initialize: () => {
    const loaded = loadAppState();
    if (loaded) {
      // バージョンチェックなどが必要ならここで行う (persistence側でnullを返す想定だが念のため)
      if (loaded.version !== STORAGE_VERSION) {
        set({ lastLoadError: "Version mismatch, state reset." });
      } else {
        set(loaded);
        // 復元後、CPUターンを再開
        const state = get();
        if (state.game?.currentDeal && !state.game.currentDeal.dealFinished) {
          const currentActor =
            state.game.currentDeal.players[
              state.game.currentDeal.currentActorIndex
            ];
          if (currentActor?.kind === "cpu") {
            setTimeout(() => get().processCpuTurns(), 500);
          }
        }
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

    // DEAL_INIT → POST_ANTE* → DEAL_CARDS_3RD の順で発火
    const current = get();
    if (!current.game || !current.game.currentDeal) return;

    // DEAL_INIT
    const dealInitEvent: DealInitEvent = {
      id: generateId(),
      type: "DEAL_INIT",
      seat: null,
      street: null,
      timestamp: Date.now(),
      rngSeed: params.rngSeed,
    };

    get().dispatch(dealInitEvent);

    // POST_ANTE（全プレイヤー分）
    const currentAfterInit = get();
    if (!currentAfterInit.game || !currentAfterInit.game.currentDeal) return;

    const deal = currentAfterInit.game.currentDeal;
    for (const player of deal.players) {
      const postAnteEvent: PostAnteEvent = {
        id: generateId(),
        type: "POST_ANTE",
        seat: player.seat,
        street: null,
        timestamp: Date.now(),
        amount: deal.ante,
      };
      get().dispatch(postAnteEvent);
    }

    // DEAL_CARDS_3RD
    const currentAfterAnte = get();
    if (!currentAfterAnte.game || !currentAfterAnte.game.currentDeal) return;

    const dealCards3rdEvent: DealCards3rdEvent = {
      id: generateId(),
      type: "DEAL_CARDS_3RD",
      seat: null,
      street: "3rd",
      timestamp: Date.now(),
    };

    get().dispatch(dealCards3rdEvent);
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

          // STREET_ADVANCEの場合は次のストリートのカード配布イベントを発火
          if (endEvent.type === "STREET_ADVANCE") {
            const nextStreet = afterEndDeal.street;
            let dealCardEvent: DealCardEvent | null = null;

            switch (nextStreet) {
              case "4th":
                dealCardEvent = {
                  id: generateId(),
                  type: "DEAL_CARD_4TH",
                  seat: null,
                  street: "4th",
                  timestamp: Date.now(),
                };
                break;
              case "5th":
                dealCardEvent = {
                  id: generateId(),
                  type: "DEAL_CARD_5TH",
                  seat: null,
                  street: "5th",
                  timestamp: Date.now(),
                };
                break;
              case "6th":
                dealCardEvent = {
                  id: generateId(),
                  type: "DEAL_CARD_6TH",
                  seat: null,
                  street: "6th",
                  timestamp: Date.now(),
                };
                break;
              case "7th":
                dealCardEvent = {
                  id: generateId(),
                  type: "DEAL_CARD_7TH",
                  seat: null,
                  street: "7th",
                  timestamp: Date.now(),
                };
                break;
            }

            if (dealCardEvent) {
              // カード配布イベントを適用
              const afterDeal = applyEvent(afterEndDeal, dealCardEvent);
              state.game.currentDeal = afterDeal;
            }
          }
        }
      }),
    );

    // 保存チェックとDEAL_END処理
    const current = get();
    if (!current.game || !current.game.currentDeal) return;

    const deal = current.game.currentDeal;
    const endEvent = checkStreetEndCondition(deal);
    if (endEvent) {
      // DEAL_ENDの場合はfinishDealを呼び出す
      if (endEvent.type === "DEAL_END") {
        set(
          produce((state: AppState) => {
            if (!state.game || !state.game.currentDeal) return;

            const finishedDeal = state.game.currentDeal;
            // finishDealでGameStateを更新
            state.game = finishDeal(state.game, finishedDeal);

            // フル保存に追加
            const dealId = finishedDeal.dealId;
            state.fullStore.fullDealIds = [
              dealId,
              ...state.fullStore.fullDealIds,
            ].slice(0, MAX_FULL_RECENT);
            state.fullStore.fullDealsById[dealId] = finishedDeal;

            // evict実行
            evictFullDeals(state);
          }),
        );

        // 保存
        saveAppState(get());
        return; // CPUターンを実行しない
      }

      // STREET_ADVANCEの場合は保存
      if (endEvent.type === "STREET_ADVANCE") {
        saveAppState(current);
      }
    } else {
      // 通常のイベントでも保存が必要な場合
      if (event.type === "STREET_ADVANCE" || event.type === "DEAL_END") {
        saveAppState(current);
      }
    }

    // CPUターンの自動進行（Humanアクション後）
    setTimeout(() => {
      get().processCpuTurns();
    }, 200); // Humanアクション後のCPUターン開始までのdelay
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

        // STREET_ADVANCEの場合は次のストリートのカード配布イベントを発火
        if (endEvent.type === "STREET_ADVANCE") {
          const nextStreet = finalDeal.street;
          let dealCardEvent: DealCardEvent | null = null;

          switch (nextStreet) {
            case "4th":
              dealCardEvent = {
                id: generateId(),
                type: "DEAL_CARD_4TH",
                seat: null,
                street: "4th",
                timestamp: Date.now(),
              };
              break;
            case "5th":
              dealCardEvent = {
                id: generateId(),
                type: "DEAL_CARD_5TH",
                seat: null,
                street: "5th",
                timestamp: Date.now(),
              };
              break;
            case "6th":
              dealCardEvent = {
                id: generateId(),
                type: "DEAL_CARD_6TH",
                seat: null,
                street: "6th",
                timestamp: Date.now(),
              };
              break;
            case "7th":
              dealCardEvent = {
                id: generateId(),
                type: "DEAL_CARD_7TH",
                seat: null,
                street: "7th",
                timestamp: Date.now(),
              };
              break;
          }

          if (dealCardEvent) {
            finalDeal = applyEvent(finalDeal, dealCardEvent);
          }
        }

        set(
          produce((state: AppState) => {
            if (state.game) {
              state.game.currentDeal = finalDeal;
            }
          }),
        );

        // DEAL_ENDの場合はfinishDealを呼び出す
        if (endEvent.type === "DEAL_END") {
          set(
            produce((state: AppState) => {
              if (!state.game || !state.game.currentDeal) return;

              const finishedDeal = state.game.currentDeal;
              // finishDealでGameStateを更新
              state.game = finishDeal(state.game, finishedDeal);

              // フル保存に追加
              const dealId = finishedDeal.dealId;
              state.fullStore.fullDealIds = [
                dealId,
                ...state.fullStore.fullDealIds,
              ].slice(0, MAX_FULL_RECENT);
              state.fullStore.fullDealsById[dealId] = finishedDeal;

              // evict実行
              evictFullDeals(state);
            }),
          );

          // 保存
          saveAppState(get());
          return; // CPUターンを実行しない
        }

        // STREET_ADVANCEの場合は保存
        if (endEvent.type === "STREET_ADVANCE") {
          saveAppState(get());
        }
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
    }, 400); // CPUターン実行前のdelay
  },

  resetAll: () => {
    set(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  },

  setScreen: (screen) => {
    set(
      produce((state: AppState) => {
        state.ui.screen = screen;
      }),
    );
  },

  setSelectedDealId: (dealId) => {
    set(
      produce((state: AppState) => {
        state.ui.selectedDealId = dealId;
      }),
    );
  },

  toggleFavoriteDeal: (dealId) => {
    set(
      produce((state: AppState) => {
        const fullDeal = state.fullStore.fullDealsById[dealId];
        // フル保存がないディールはお気に入りにできない
        if (!fullDeal) return;

        const currentFavorites = state.fullStore.favoriteDealIds;
        const isFavorite = currentFavorites.includes(dealId);

        if (isFavorite) {
          // お気に入りから削除
          state.fullStore.favoriteDealIds = currentFavorites.filter(
            (id) => id !== dealId,
          );
        } else {
          // お気に入りに追加（最大50件）
          const MAX_FAVORITE = 50;
          const newFavorites = [dealId, ...currentFavorites].slice(
            0,
            MAX_FAVORITE,
          );
          state.fullStore.favoriteDealIds = newFavorites;
        }

        // 変更を保存
        saveAppState(get());
      }),
    );
  },

  setDisplayUnit: (unit) => {
    set(
      produce((state: AppState) => {
        state.ui.displayUnit = unit;
        // 表示単位の変更は保存する（任意）
        saveAppState(get());
      }),
    );
  },
});

// 開発環境でのみdevtools middlewareを適用してストアを作成
export const useAppStore = import.meta.env.DEV
  ? create<AppStore>()(
      devtools(storeCreator, {
        name: "AppStore",
        // 大きなオブジェクトをフォーマットして表示
        serialize: {
          options: {
            // biome-ignore lint/suspicious/noExplicitAny: JSON.stringifyのreplacer関数の型定義
            replacer: (_key: any, value: any) => {
              // 循環参照を避ける
              if (typeof value === "object" && value !== null) {
                try {
                  JSON.stringify(value);
                } catch {
                  return "[Circular]";
                }
              }
              return value;
            },
          },
        },
      }),
    )
  : create<AppStore>(storeCreator);

// 開発環境でのみwindowオブジェクトにストアを割り当て（コンソールから直接アクセス可能にする）
if (import.meta.env.DEV) {
  // window.$storeでアクセス可能にする
  (window as unknown as { $store: typeof useAppStore }).$store = useAppStore;

  // 現在のstateを取得するヘルパー関数も追加
  (window as unknown as { getState: () => AppStore }).getState = () =>
    useAppStore.getState();

  // コンソールに使い方を表示
  console.log(
    "%c🔍 Zustand DevTools",
    "color: #4CAF50; font-weight: bold; font-size: 14px;",
  );
  console.log(
    "%c使い方:",
    "color: #2196F3; font-weight: bold;",
    "\n- Redux DevTools拡張機能をインストールして使用",
    "\n- コンソールで $store.getState() で現在のstateを確認",
    "\n- または window.$store でストアに直接アクセス",
  );
}
