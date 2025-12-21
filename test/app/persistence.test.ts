import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadAppState,
  STORAGE_KEY,
  STORAGE_VERSION,
  saveAppState,
} from "../../src/app/store/persistence";
import type { AppState } from "../../src/app/types";
import { createInitialGameState, finishDeal } from "../../src/domain/game";
import type { DealState } from "../../src/domain/types";

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const validState: AppState = {
    version: STORAGE_VERSION,
    ui: {
      screen: "SETUP",
      selectedDealId: null,
      displayUnit: "points",
    },
    game: null,
    fullStore: {
      fullDealIds: [],
      fullDealsById: {},
      favoriteDealIds: [],
    },
    lastLoadError: null,
  };

  it("正常な状態を保存・復元できること", () => {
    saveAppState(validState);
    const loaded = loadAppState();
    expect(loaded).toEqual(validState);
  });

  it("保存データがない場合 null を返すこと", () => {
    const loaded = loadAppState();
    expect(loaded).toBeNull();
  });

  it("不正なJSONの場合 null を返すこと", () => {
    // console.warnの出力を抑制
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    localStorage.setItem(STORAGE_KEY, "{ invalid json");
    const loaded = loadAppState();
    // Zod parse error or JSON parse error -> catch -> null
    expect(loaded).toBeNull();

    // console.warnが呼ばれたことを確認
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it("スキーマに違反する場合 null を返すこと", () => {
    // console.warnの出力を抑制
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const invalidState = { ...validState, version: "invalid" }; // number expected
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

    const loaded = loadAppState();
    expect(loaded).toBeNull();

    // console.warnが呼ばれたことを確認
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it("DealSummaryにpotShareが含まれる状態を保存・復元できること", () => {
    const game = createInitialGameState(
      [
        { id: "player1", name: "Player 1", kind: "human" },
        { id: "player2", name: "Player 2", kind: "cpu" },
      ],
      { sequence: ["studHi"], dealPerGame: 6 },
      { ante: 10, bringIn: 20, smallBet: 40, bigBet: 80 },
    );

    // 終了したディールを作成
    const finishedDeal: DealState = {
      dealId: "test-deal-1",
      gameType: "studHi",
      playerCount: 2,
      players: [
        {
          seat: 0,
          kind: "human",
          active: true,
          stack: 1000,
          committedTotal: 100,
          committedThisStreet: 0,
        },
        {
          seat: 1,
          kind: "cpu",
          active: false, // fold済み
          stack: 1000,
          committedTotal: 100,
          committedThisStreet: 0,
        },
      ],
      seatOrder: ["player1", "player2"],
      ante: 10,
      bringIn: 20,
      smallBet: 40,
      bigBet: 80,
      street: "7th",
      bringInIndex: 0,
      currentActorIndex: 0,
      pot: 200,
      currentBet: 0,
      raiseCount: 0,
      pendingResponseCount: 0,
      checksThisStreet: 1,
      actionsThisStreet: [],
      dealFinished: true,
      deck: [],
      rngSeed: "test-seed",
      hands: {
        0: { downCards: [], upCards: [] },
      },
      startedAt: Date.now(),
    };

    // finishDealでDealSummaryを生成
    const gameWithHistory = finishDeal(game, finishedDeal);

    const stateWithGame: AppState = {
      version: STORAGE_VERSION,
      ui: {
        screen: "PLAY",
        selectedDealId: null,
        displayUnit: "points",
      },
      game: gameWithHistory,
      fullStore: {
        fullDealIds: [],
        fullDealsById: {},
        favoriteDealIds: [],
      },
      lastLoadError: null,
    };

    // 保存・復元
    saveAppState(stateWithGame);
    const loaded = loadAppState();

    expect(loaded).not.toBeNull();
    expect(loaded?.game?.dealHistory).toHaveLength(1);
    const summary = loaded?.game?.dealHistory[0];
    expect(summary?.potShare).toBeDefined();
    expect(summary?.potShare.player1).toBe(200);
    // 負けたプレイヤーはpotShareに含まれない（undefined）
    expect(summary?.potShare.player2).toBeUndefined();
  });
});
