import { describe, expect, it } from "vitest";
import { decideStudHiLv2 } from "../../../src/domain/cpu/decideStudHiLv2";
import type { CpuDecisionContext } from "../../../src/domain/cpu/policy";
import type { Card, DealState } from "../../../src/domain/types";

/**
 * decideStudHiLv2 のテスト
 * 仕様: docs/cpu_Lv2/StudHi_CPU戦略_実装指示書.md §9
 */
describe("decideStudHiLv2", () => {
  const createTestState = (overrides: Partial<DealState> = {}): DealState => ({
    dealId: "test-deal",
    gameType: "studHi",
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
          { rank: "2", suit: "c" } as Card,
          { rank: "3", suit: "c" } as Card,
        ],
        upCards: [{ rank: "8", suit: "h" } as Card],
      },
      1: {
        downCards: [
          { rank: "A", suit: "h" } as Card,
          { rank: "A", suit: "c" } as Card,
        ],
        upCards: [{ rank: "K", suit: "s" } as Card],
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

      const action = decideStudHiLv2(ctx);
      expect(["CALL", "COMPLETE", "FOLD"]).toContain(action);
    });

    it("allowedActionsが1つの場合、そのアクションを返すこと", () => {
      const state = createTestState();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL"],
      };

      const action = decideStudHiLv2(ctx);
      expect(action).toBe("CALL");
    });
  });

  describe("3rd Street Tier判定", () => {
    it("Tier S（ハイペア）でCOMPLETEを選択すること", () => {
      const state = createTestState({
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [{ rank: "8", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "A", suit: "c" } as Card, // ハイペア
            ],
            upCards: [{ rank: "K", suit: "s" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "COMPLETE", "FOLD"],
      };

      const action = decideStudHiLv2(ctx);
      expect(action).toBe("COMPLETE");
    });

    it("Tier D（弱い手）でFOLDを選択すること", () => {
      const state = createTestState({
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "K", suit: "h" } as Card,
            ],
            upCards: [{ rank: "Q", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "4", suit: "d" } as Card,
            ],
            upCards: [{ rank: "6", suit: "s" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "COMPLETE", "FOLD"],
      };

      const action = decideStudHiLv2(ctx);
      // Tier DならFOLD寄り
      expect(["FOLD", "CALL"]).toContain(action);
    });
  });

  describe("5th Street Category分岐", () => {
    it("Category N（Nothing）で相手BET → FOLDを選択すること", () => {
      const state = createTestState({
        street: "5th",
        currentBet: 80,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "K", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "Q", suit: "s" } as Card,
              { rank: "J", suit: "d" } as Card,
              { rank: "T", suit: "h" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "4", suit: "h" } as Card,
            ],
            upCards: [
              { rank: "6", suit: "d" } as Card,
              { rank: "8", suit: "c" } as Card,
              { rank: "9", suit: "s" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideStudHiLv2(ctx);
      // Category N → FOLD を優先
      expect(["FOLD", "CALL"]).toContain(action);
    });

    it("Category M（Made）で低Threat → CALL/RAISEを選択すること", () => {
      const state = createTestState({
        street: "5th",
        currentBet: 80,
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "d" } as Card,
            ],
            upCards: [
              { rank: "5", suit: "s" } as Card,
              { rank: "6", suit: "h" } as Card,
              { rank: "7", suit: "c" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "A", suit: "c" } as Card, // ペア
            ],
            upCards: [
              { rank: "K", suit: "s" } as Card,
              { rank: "Q", suit: "d" } as Card,
              { rank: "J", suit: "h" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideStudHiLv2(ctx);
      // Category M で Threat低 → CALL または RAISE
      expect(["CALL", "RAISE"]).toContain(action);
    });
  });

  describe("Bring-in判定", () => {
    it("Bring-in担当でTier S → COMPLETEを選択すること", () => {
      const state = createTestState({
        bringInIndex: 1,
        currentActorIndex: 1,
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "d" } as Card,
            ],
            upCards: [{ rank: "8", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "K", suit: "h" } as Card,
              { rank: "K", suit: "c" } as Card, // ハイペア
            ],
            upCards: [{ rank: "A", suit: "s" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["BRING_IN", "COMPLETE"],
      };

      const action = decideStudHiLv2(ctx);
      // Tier S なら COMPLETE
      expect(action).toBe("COMPLETE");
    });

    it("Bring-in担当でTier D → BRING_INを選択すること", () => {
      const state = createTestState({
        bringInIndex: 1,
        currentActorIndex: 1,
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "K", suit: "h" } as Card,
            ],
            upCards: [{ rank: "Q", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "4", suit: "d" } as Card,
            ],
            upCards: [{ rank: "6", suit: "s" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["BRING_IN", "COMPLETE"],
      };

      const action = decideStudHiLv2(ctx);
      // Tier D なら BRING_IN
      expect(action).toBe("BRING_IN");
    });
  });
});
