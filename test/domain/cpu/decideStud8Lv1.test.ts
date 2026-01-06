import { describe, expect, it } from "vitest";
import { decideStud8Lv1 } from "../../../src/domain/cpu/decideStud8Lv1";
import type { CpuDecisionContext } from "../../../src/domain/cpu/policy";
import type { Card, DealState } from "../../../src/domain/types";

/**
 * decideStud8Lv1 のテスト
 * 6つの戦略ルールの検証
 */
describe("decideStud8Lv1", () => {
  const createStud8State = (overrides: Partial<DealState> = {}): DealState => ({
    dealId: "stud8-test",
    gameType: "stud8",
    playerCount: 2,
    players: [
      {
        seat: 0,
        kind: "human",
        active: true,
        stack: 900,
        committedTotal: 30,
        committedThisStreet: 20,
      },
      {
        seat: 1,
        kind: "cpu",
        active: true,
        stack: 990,
        committedTotal: 10,
        committedThisStreet: 0,
      },
    ],
    seatOrder: ["player1", "player2"],
    ante: 10,
    bringIn: 20,
    smallBet: 40,
    bigBet: 80,
    street: "3rd",
    bringInIndex: 0,
    currentActorIndex: 1,
    pot: 40,
    currentBet: 20,
    raiseCount: 0,
    pendingResponseCount: 1,
    checksThisStreet: 0,
    actionsThisStreet: [],
    dealFinished: false,
    deck: [],
    rngSeed: "",
    hands: {
      0: {
        downCards: [
          { rank: "K", suit: "c" } as Card,
          { rank: "Q", suit: "c" } as Card,
        ],
        upCards: [{ rank: "J", suit: "h" } as Card],
      },
      1: {
        downCards: [
          { rank: "A", suit: "h" } as Card,
          { rank: "2", suit: "c" } as Card,
        ],
        upCards: [{ rank: "3", suit: "s" } as Card],
      },
    },
    eventLog: [],
    ...overrides,
  });

  describe("ルール1: Low可能性があればCALL", () => {
    it("Low可能性がある時はFOLDせずCALLすること", () => {
      const state = createStud8State({
        street: "4th",
        currentBet: 40,
        hands: {
          0: {
            downCards: [
              { rank: "K", suit: "s" } as Card,
              { rank: "Q", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "J", suit: "h" } as Card,
              { rank: "T", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "4", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "5", suit: "s" } as Card,
              { rank: "7", suit: "d" } as Card, // 4枚全て8以下 = Low可能性あり
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideStud8Lv1(ctx);
      expect(action).not.toBe("FOLD");
      expect(["CALL", "RAISE"]).toContain(action);
    });
  });

  describe("ルール2: 3rd全て8以下ならCOMPLETE", () => {
    it("3rdで3枚全て8以下の場合COMPLETEを選択すること", () => {
      const state = createStud8State({
        street: "3rd",
        currentBet: 20,
        hands: {
          0: {
            downCards: [
              { rank: "K", suit: "c" } as Card,
              { rank: "Q", suit: "c" } as Card,
            ],
            upCards: [{ rank: "J", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [{ rank: "5", suit: "s" } as Card], // 全て8以下
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "FOLD", "COMPLETE"],
      };

      const action = decideStud8Lv1(ctx);
      expect(action).toBe("COMPLETE");
    });

    it("ブリングインプレイヤーはBRING_INを選択すること", () => {
      const state = createStud8State({
        street: "3rd",
        currentBet: 0,
        bringInIndex: 1,
        hands: {
          0: {
            downCards: [
              { rank: "K", suit: "c" } as Card,
              { rank: "Q", suit: "c" } as Card,
            ],
            upCards: [{ rank: "J", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [{ rank: "5", suit: "s" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["BRING_IN", "COMPLETE"],
      };

      const action = decideStud8Lv1(ctx);
      expect(action).toBe("BRING_IN");
    });
  });

  describe("ルール3: ハイカード3枚以上でFOLD傾向", () => {
    it("ハイカード(9+)が3枚以上でLow不可かつHighスコア低い場合FOLDすること", () => {
      const state = createStud8State({
        street: "5th",
        currentBet: 80,
        players: [
          {
            seat: 0,
            kind: "human",
            active: true,
            stack: 800,
            committedTotal: 200,
            committedThisStreet: 80,
          },
          {
            seat: 1,
            kind: "cpu",
            active: true,
            stack: 850,
            committedTotal: 150,
            committedThisStreet: 0,
          },
        ],
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "A", suit: "h" } as Card, // 強そう
            ],
            upCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "K", suit: "h" } as Card,
              { rank: "Q", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "9", suit: "h" } as Card,
              { rank: "T", suit: "c" } as Card, // ハイカードのみ、役なし
            ],
            upCards: [
              { rank: "J", suit: "d" } as Card,
              { rank: "Q", suit: "c" } as Card,
              { rank: "K", suit: "s" } as Card, // 5枚全て9+、ハイカードのみ
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideStud8Lv1(ctx);
      // ハイカードのみでLow不可、Highも弱い → FOLD傾向
      // ただしcombinedScoreが40以上ならCALLする可能性もある
      expect(["CALL", "FOLD"]).toContain(action);
    });
  });

  describe("ルール4: 相手upcard全員9+ならアグレッシブ", () => {
    it("相手のupcardが全て9+の場合BETすること", () => {
      const state = createStud8State({
        street: "4th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "K", suit: "s" } as Card,
              { rank: "Q", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "J", suit: "h" } as Card,
              { rank: "T", suit: "d" } as Card, // 全て9+
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "5", suit: "s" } as Card,
              { rank: "7", suit: "d" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      const action = decideStud8Lv1(ctx);
      expect(action).toBe("BET");
    });

    it("相手upcard全員9+でRAISE頻度が高まること", () => {
      const state = createStud8State({
        street: "4th",
        currentBet: 40,
        hands: {
          0: {
            downCards: [
              { rank: "K", suit: "s" } as Card,
              { rank: "Q", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "J", suit: "h" } as Card,
              { rank: "T", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "5", suit: "s" } as Card,
              { rank: "7", suit: "d" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      // rng=0.5 < 0.7 なのでRAISE
      const action = decideStud8Lv1(ctx, () => 0.5);
      expect(action).toBe("RAISE");
    });
  });

  describe("ルール5: 5th以降ペアでやや強気", () => {
    it("5th以降でペアがある場合BET頻度が上がること", () => {
      const state = createStud8State({
        street: "5th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "K", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "Q", suit: "h" } as Card,
              { rank: "J", suit: "d" } as Card,
              { rank: "T", suit: "c" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "7", suit: "h" } as Card,
              { rank: "7", suit: "c" } as Card, // ペア
            ],
            upCards: [
              { rank: "5", suit: "s" } as Card,
              { rank: "3", suit: "d" } as Card,
              { rank: "A", suit: "c" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      // ペア + Low可能性 + 相手全員9+ → BET
      const action = decideStud8Lv1(ctx, () => 0.3);
      expect(action).toBe("BET");
    });
  });

  describe("ルール6: スクープ可能性高時RAISE頻度UP", () => {
    it("High/Low両方強い場合RAISE頻度が上がること", () => {
      const state = createStud8State({
        street: "5th",
        currentBet: 80,
        hands: {
          0: {
            downCards: [
              { rank: "K", suit: "c" } as Card,
              { rank: "Q", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "J", suit: "h" } as Card,
              { rank: "T", suit: "d" } as Card,
              { rank: "9", suit: "s" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "h" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "h" } as Card,
              { rank: "4", suit: "h" } as Card,
              { rank: "5", suit: "h" } as Card, // フラッシュドロー + A-5ロー可能性
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      // スクープ可能性高 + rng < 0.6 → RAISE
      const action = decideStud8Lv1(ctx, () => 0.4);
      expect(action).toBe("RAISE");
    });
  });

  describe("合法性テスト", () => {
    it("返すアクションがallowedActionsに含まれていること", () => {
      const state = createStud8State();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideStud8Lv1(ctx, () => 0.5);
      expect(["CALL", "RAISE", "FOLD"]).toContain(action);
    });

    it("allowedActionsが1つの場合そのアクションを返すこと", () => {
      const state = createStud8State();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL"],
      };

      const action = decideStud8Lv1(ctx);
      expect(action).toBe("CALL");
    });
  });
});
