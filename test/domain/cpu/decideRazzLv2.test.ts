import { describe, expect, it } from "vitest";
import { decideRazzLv2 } from "../../../src/domain/cpu/decideRazzLv2";
import type { CpuDecisionContext } from "../../../src/domain/cpu/policy";
import type { Card, DealState } from "../../../src/domain/types";

/**
 * decideRazzLv2 のテスト
 * 仕様: docs/cpu_Lv2/Razz_実装指示書.md §9
 */
describe("decideRazzLv2", () => {
  const createTestState = (overrides: Partial<DealState> = {}): DealState => ({
    dealId: "test-deal",
    gameType: "razz",
    playerCount: 2,
    players: [
      {
        seat: 0,
        kind: "human",
        active: true,
        stack: 900,
        committedTotal: 100,
        committedThisStreet: 40,
      },
      {
        seat: 1,
        kind: "cpu",
        active: true,
        stack: 850,
        committedTotal: 150,
        committedThisStreet: 40,
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
          { rank: "T", suit: "c" } as Card,
          { rank: "J", suit: "c" } as Card,
        ],
        upCards: [{ rank: "K", suit: "h" } as Card],
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

  describe("合法性テスト", () => {
    it("返すアクションがallowedActionsに含まれていること", () => {
      const state = createTestState();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "COMPLETE", "FOLD"],
      };

      const action = decideRazzLv2(ctx);
      expect(["CALL", "COMPLETE", "FOLD"]).toContain(action);
    });
  });

  describe("3rd Street", () => {
    it("Monster3（A23）でCOMPLETEを選択すること", () => {
      const state = createTestState({
        hands: {
          0: {
            downCards: [
              { rank: "T", suit: "c" } as Card,
              { rank: "J", suit: "c" } as Card,
            ],
            upCards: [{ rank: "K", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [{ rank: "3", suit: "s" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "COMPLETE", "FOLD"],
      };

      const action = decideRazzLv2(ctx);
      expect(action).toBe("COMPLETE");
    });

    it("Door>=9で全員高ドア → COMPLETE（スチール）", () => {
      const state = createTestState({
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [{ rank: "K", suit: "h" } as Card], // 相手もKドア
          },
          1: {
            downCards: [
              { rank: "T", suit: "h" } as Card,
              { rank: "J", suit: "c" } as Card,
            ],
            upCards: [{ rank: "Q", suit: "s" } as Card], // 自分Qドア
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "COMPLETE", "FOLD"],
      };

      const action = decideRazzLv2(ctx);
      // 自分Q、相手K → 自分の方が良い（低い）
      expect(action).toBe("COMPLETE");
    });

    it("Door>=9で後ろに低ドアあり → FOLD", () => {
      const state = createTestState({
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [{ rank: "3", suit: "h" } as Card], // 相手3ドア（良い）
          },
          1: {
            downCards: [
              { rank: "T", suit: "h" } as Card,
              { rank: "J", suit: "c" } as Card,
            ],
            upCards: [{ rank: "Q", suit: "s" } as Card], // 自分Qドア（悪い）
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "COMPLETE", "FOLD"],
      };

      const action = decideRazzLv2(ctx);
      expect(["FOLD", "CALL"]).toContain(action);
    });

    it("Bring-in担当でBad3 → BRING_IN", () => {
      const state = createTestState({
        bringInIndex: 1,
        currentActorIndex: 1,
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [{ rank: "3", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "J", suit: "h" } as Card,
              { rank: "Q", suit: "c" } as Card,
            ],
            upCards: [{ rank: "K", suit: "s" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["BRING_IN", "COMPLETE"],
      };

      const action = decideRazzLv2(ctx);
      expect(action).toBe("BRING_IN");
    });
  });

  describe("7th Street オーバーフォールド回避", () => {
    it("相手upが汚い → 弱ローでもCALL", () => {
      const state = createTestState({
        street: "7th",
        currentBet: 80,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
              { rank: "Q", suit: "d" } as Card, // 7thのdown
            ],
            upCards: [
              { rank: "K", suit: "h" } as Card,
              { rank: "Q", suit: "d" } as Card,
              { rank: "J", suit: "s" } as Card,
              { rank: "T", suit: "c" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "s" } as Card,
              { rank: "9", suit: "d" } as Card, // 7thのdown
            ],
            upCards: [
              { rank: "3", suit: "s" } as Card,
              { rank: "5", suit: "d" } as Card,
              { rank: "6", suit: "h" } as Card,
              { rank: "8", suit: "c" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "FOLD"],
      };

      const action = decideRazzLv2(ctx);
      // 相手upが汚い（K,Q,J,T）+ ヘッズアップ → CALL
      expect(action).toBe("CALL");
    });
  });
});
