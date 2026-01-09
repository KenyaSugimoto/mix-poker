import { describe, expect, it } from "vitest";
import {
  buildVisibleContext,
  makeRankCount,
  makeSuitCount,
} from "../../../../src/domain/cpu/studHi/visibleContext";
import type { Card, DealState } from "../../../../src/domain/types";

/**
 * VisibleContext のテスト
 */
describe("VisibleContext", () => {
  const createTestState = (overrides: Partial<DealState> = {}): DealState => ({
    dealId: "test-deal",
    gameType: "studHi",
    playerCount: 3,
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
      {
        seat: 2,
        kind: "cpu",
        active: false, // フォールド済み
        stack: 800,
        committedTotal: 50,
        committedThisStreet: 0,
      },
    ],
    seatOrder: ["player1", "player2", "player3"],
    ante: 10,
    bringIn: 20,
    smallBet: 40,
    bigBet: 80,
    street: "4th",
    bringInIndex: 0,
    currentActorIndex: 1,
    pot: 250,
    currentBet: 40,
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
          { rank: "A", suit: "h" } as Card,
          { rank: "K", suit: "h" } as Card,
        ],
        upCards: [
          { rank: "Q", suit: "h" } as Card,
          { rank: "J", suit: "h" } as Card,
        ],
      },
      1: {
        downCards: [
          { rank: "T", suit: "c" } as Card,
          { rank: "9", suit: "c" } as Card,
        ],
        upCards: [
          { rank: "8", suit: "c" } as Card,
          { rank: "7", suit: "c" } as Card,
        ],
      },
      2: {
        downCards: [
          { rank: "2", suit: "s" } as Card,
          { rank: "3", suit: "s" } as Card,
        ],
        upCards: [{ rank: "4", suit: "s" } as Card],
      },
    },
    eventLog: [],
    ...overrides,
  });

  describe("buildVisibleContext", () => {
    it("自分の情報（down + up）が正しく取得されること", () => {
      const state = createTestState();
      const ctx = buildVisibleContext(state, 1);

      expect(ctx.me.seat).toBe(1);
      expect(ctx.me.down).toHaveLength(2);
      expect(ctx.me.up).toHaveLength(2);
      expect(ctx.me.down[0].rank).toBe("T");
      expect(ctx.me.up[0].rank).toBe("8");
    });

    it("相手の情報（upのみ）が正しく取得されること", () => {
      const state = createTestState();
      const ctx = buildVisibleContext(state, 1);

      expect(ctx.opponents).toHaveLength(2);
      // seat 0
      const opp0 = ctx.opponents.find((o) => o.seat === 0);
      expect(opp0?.up).toHaveLength(2);
      expect(opp0?.downCount).toBe(2);
      // seat 2
      const opp2 = ctx.opponents.find((o) => o.seat === 2);
      expect(opp2?.up).toHaveLength(1);
    });

    it("aliveSeatsがactiveなプレイヤーのみを含むこと", () => {
      const state = createTestState();
      const ctx = buildVisibleContext(state, 1);

      expect(ctx.aliveSeats).toEqual([0, 1]);
      expect(ctx.aliveSeats).not.toContain(2);
    });

    it("headsUpが2人の場合にtrueになること", () => {
      const state = createTestState();
      const ctx = buildVisibleContext(state, 1);

      expect(ctx.headsUp).toBe(true);
    });

    it("deadUpCardsが相手全員のupCardsを含むこと（fold済みも含む）", () => {
      const state = createTestState();
      const ctx = buildVisibleContext(state, 1);

      // seat 0: 2枚, seat 2: 1枚 = 合計3枚
      expect(ctx.deadUpCards).toHaveLength(3);
    });

    it("deadRankCountが正しくカウントされること", () => {
      const state = createTestState();
      const ctx = buildVisibleContext(state, 1);

      expect(ctx.deadRankCount["Q"]).toBe(1);
      expect(ctx.deadRankCount["J"]).toBe(1);
      expect(ctx.deadRankCount["4"]).toBe(1);
    });

    it("deadSuitCountが正しくカウントされること", () => {
      const state = createTestState();
      const ctx = buildVisibleContext(state, 1);

      expect(ctx.deadSuitCount["h"]).toBe(2); // Q♥, J♥
      expect(ctx.deadSuitCount["s"]).toBe(1); // 4♠
    });
  });

  describe("makeRankCount", () => {
    it("空配列の場合、全ランクが0になること", () => {
      const result = makeRankCount([]);
      expect(result["A"]).toBe(0);
      expect(result["K"]).toBe(0);
    });

    it("カードのランクが正しくカウントされること", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "A", suit: "s" },
        { rank: "K", suit: "c" },
      ];
      const result = makeRankCount(cards);

      expect(result["A"]).toBe(2);
      expect(result["K"]).toBe(1);
      expect(result["Q"]).toBe(0);
    });
  });

  describe("makeSuitCount", () => {
    it("空配列の場合、全スートが0になること", () => {
      const result = makeSuitCount([]);
      expect(result["h"]).toBe(0);
      expect(result["s"]).toBe(0);
    });

    it("カードのスートが正しくカウントされること", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "K", suit: "h" },
        { rank: "Q", suit: "h" },
        { rank: "J", suit: "s" },
      ];
      const result = makeSuitCount(cards);

      expect(result["h"]).toBe(3);
      expect(result["s"]).toBe(1);
      expect(result["c"]).toBe(0);
    });
  });
});
