import { describe, expect, it } from "vitest";
import { decideStud8Lv2 } from "../../../src/domain/cpu/decideStud8Lv2";
import type { CpuDecisionContext } from "../../../src/domain/cpu/policy";
import type { Card, DealState } from "../../../src/domain/types";

/**
 * decideStud8Lv2 のテスト
 * 仕様: docs/cpu_Lv2/Stud8_実装指示書.md
 */
describe("decideStud8Lv2", () => {
  const createTestState = (overrides: Partial<DealState> = {}): DealState => ({
    dealId: "test-deal",
    gameType: "stud8",
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

  // ============================================================
  // 合法性テスト
  // ============================================================

  describe("合法性テスト", () => {
    it("返すアクションがallowedActionsに含まれていること", () => {
      const state = createTestState();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "COMPLETE", "FOLD"],
      };

      const action = decideStud8Lv2(ctx);
      expect(["CALL", "COMPLETE", "FOLD"]).toContain(action);
    });

    it("allowedActionsが1つの場合、そのアクションを返すこと", () => {
      const state = createTestState();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL"],
      };

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("CALL");
    });

    it("allowedActionsが空の場合、FOLDを返すこと", () => {
      const state = createTestState();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: [],
      };

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("FOLD");
    });
  });

  // ============================================================
  // 3rd Street テスト
  // ============================================================

  describe("3rd Street", () => {
    describe("Bring-in判定", () => {
      it("Scoop3_Monster（A23）→ COMPLETE", () => {
        const state = createTestState({
          bringInIndex: 1,
          currentActorIndex: 1,
          currentBet: 0,
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
          allowedActions: ["BRING_IN", "COMPLETE"],
        };

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("COMPLETE");
      });

      it("Low3_Good → COMPLETE", () => {
        const state = createTestState({
          bringInIndex: 1,
          currentActorIndex: 1,
          currentBet: 0,
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
                { rank: "4", suit: "h" } as Card,
                { rank: "5", suit: "c" } as Card,
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

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("COMPLETE");
      });

      it("High3_Good（KKx）→ COMPLETE", () => {
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
                { rank: "K", suit: "h" } as Card,
                { rank: "K", suit: "c" } as Card,
              ],
              upCards: [{ rank: "Q", suit: "s" } as Card],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["BRING_IN", "COMPLETE"],
        };

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("COMPLETE");
      });

      it("Trash（JQK）→ BRING_IN", () => {
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

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("BRING_IN");
      });
    });

    describe("通常オープン", () => {
      it("Scoop3_Monster → COMPLETE", () => {
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

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("COMPLETE");
      });

      it("Low3_Good → COMPLETE", () => {
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
                { rank: "4", suit: "h" } as Card,
                { rank: "5", suit: "c" } as Card,
              ],
              upCards: [{ rank: "7", suit: "s" } as Card],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "COMPLETE", "FOLD"],
        };

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("COMPLETE");
      });
    });

    describe("相手COMPLETEに直面", () => {
      it("Scoop3_Monster → CALL/RAISE", () => {
        const state = createTestState({
          currentBet: 40,
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
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideStud8Lv2(ctx);
        expect(["CALL", "RAISE"]).toContain(action);
      });

      it("Low3_Good → CALL（降りすぎ防止）", () => {
        const state = createTestState({
          currentBet: 40,
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
                { rank: "4", suit: "h" } as Card,
                { rank: "5", suit: "c" } as Card,
              ],
              upCards: [{ rank: "7", suit: "s" } as Card],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("CALL");
      });

      it("High3_Good vs Loドア → FOLD（Scoopリスク回避）", () => {
        const state = createTestState({
          currentBet: 40,
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
                { rank: "K", suit: "h" } as Card,
                { rank: "K", suit: "c" } as Card,
              ],
              upCards: [{ rank: "Q", suit: "s" } as Card],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("FOLD");
      });

      it("Trash → FOLD", () => {
        const state = createTestState({
          currentBet: 40,
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
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideStud8Lv2(ctx);
        expect(action).toBe("FOLD");
      });
    });
  });

  // ============================================================
  // 4th Street テスト
  // ============================================================

  describe("4th Street", () => {
    it("SCOOPING → BET", () => {
      const state = createTestState({
        street: "4th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "T", suit: "c" } as Card,
              { rank: "J", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "K", suit: "h" } as Card,
              { rank: "Q", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "s" } as Card,
              { rank: "3", suit: "d" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("BET");
    });

    it("相手BETに対して原則CALL（降りすぎない）", () => {
      const state = createTestState({
        street: "4th",
        currentBet: 40,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "h" } as Card,
              { rank: "4", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "5", suit: "h" } as Card,
              { rank: "6", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "7", suit: "s" } as Card,
              { rank: "8", suit: "d" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("CALL");
    });
  });

  // ============================================================
  // 5th/6th Street テスト
  // ============================================================

  describe("5th/6th Street", () => {
    it("5th: SCOOPING → BET", () => {
      const state = createTestState({
        street: "5th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "T", suit: "c" } as Card,
              { rank: "J", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "K", suit: "h" } as Card,
              { rank: "Q", suit: "d" } as Card,
              { rank: "9", suit: "s" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "s" } as Card,
              { rank: "3", suit: "d" } as Card,
              { rank: "5", suit: "h" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("BET");
    });

    it("5th: SCOOPING → CALL", () => {
      const state = createTestState({
        street: "5th",
        currentBet: 80,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "h" } as Card,
              { rank: "4", suit: "d" } as Card,
              { rank: "5", suit: "s" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "s" } as Card,
              { rank: "3", suit: "d" } as Card,
              { rank: "6", suit: "h" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("CALL");
    });

    it("HI_ONLY vs Lo強ボード → FOLD寄り", () => {
      const state = createTestState({
        street: "5th",
        currentBet: 80,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "h" } as Card,
              { rank: "4", suit: "d" } as Card,
              { rank: "5", suit: "s" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "K", suit: "h" } as Card,
              { rank: "K", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "Q", suit: "s" } as Card,
              { rank: "J", suit: "d" } as Card,
              { rank: "T", suit: "h" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideStud8Lv2(ctx);
      expect(["FOLD", "CALL"]).toContain(action);
    });
  });

  // ============================================================
  // 7th Street テスト（オーバーフォールド回避）
  // ============================================================

  describe("7th Street オーバーフォールド回避", () => {
    it("SCOOPING → BET", () => {
      const state = createTestState({
        street: "7th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "T", suit: "c" } as Card,
              { rank: "J", suit: "c" } as Card,
              { rank: "Q", suit: "d" } as Card,
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
              { rank: "4", suit: "d" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "s" } as Card,
              { rank: "3", suit: "d" } as Card,
              { rank: "6", suit: "h" } as Card,
              { rank: "7", suit: "c" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("BET");
    });

    it("LO_ONLY → BET", () => {
      const state = createTestState({
        street: "7th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "K", suit: "c" } as Card,
              { rank: "K", suit: "d" } as Card,
              { rank: "Q", suit: "h" } as Card,
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
              { rank: "4", suit: "d" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "s" } as Card,
              { rank: "5", suit: "d" } as Card,
              { rank: "6", suit: "h" } as Card,
              { rank: "7", suit: "c" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("BET");
    });

    it("相手BETに対して片方取れそうならCALL", () => {
      const state = createTestState({
        street: "7th",
        currentBet: 80,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
              { rank: "Q", suit: "d" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "h" } as Card,
              { rank: "K", suit: "d" } as Card,
              { rank: "Q", suit: "s" } as Card,
              { rank: "J", suit: "c" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "s" } as Card,
              { rank: "4", suit: "d" } as Card,
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

      const action = decideStud8Lv2(ctx);
      expect(action).toBe("CALL");
    });

    it("AIR → FOLD寄り", () => {
      const state = createTestState({
        street: "7th",
        currentBet: 80,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "c" } as Card,
              { rank: "2", suit: "c" } as Card,
              { rank: "4", suit: "d" } as Card,
            ],
            upCards: [
              { rank: "3", suit: "h" } as Card,
              { rank: "5", suit: "d" } as Card,
              { rank: "6", suit: "s" } as Card,
              { rank: "7", suit: "c" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "T", suit: "h" } as Card,
              { rank: "J", suit: "s" } as Card,
              { rank: "Q", suit: "d" } as Card,
            ],
            upCards: [
              { rank: "K", suit: "s" } as Card,
              { rank: "9", suit: "d" } as Card,
              { rank: "8", suit: "h" } as Card,
              { rank: "T", suit: "c" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "FOLD"],
      };

      const action = decideStud8Lv2(ctx);
      expect(["FOLD", "CALL"]).toContain(action);
    });
  });
});
