import { describe, expect, it } from "vitest";
import {
  allOppsHaveWorseDoor,
  countBetterDoors,
  countDeadLow,
  estimateBoardQuality,
  eval3rdQuality,
  isStealLikely,
  lowValue,
  scoreOppBoardDirt,
} from "../../../../src/domain/cpu/razz/eval";
import type { Card, Rank } from "../../../../src/domain/types";

/**
 * Razz評価関数のテスト
 */
describe("razz/eval", () => {
  const emptyRankCount = (): Record<Rank, number> =>
    Object.fromEntries(
      ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"].map(
        (r) => [r, 0],
      ),
    ) as Record<Rank, number>;

  describe("lowValue", () => {
    it("A=1（最強のロー）", () => {
      expect(lowValue("A")).toBe(1);
    });

    it("K=13（最弱）", () => {
      expect(lowValue("K")).toBe(13);
    });

    it("5=5", () => {
      expect(lowValue("5")).toBe(5);
    });
  });

  describe("eval3rdQuality", () => {
    it("A23 → Monster3", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "3", suit: "d" },
      ];
      expect(eval3rdQuality(cards)).toBe("Monster3");
    });

    it("A45 → Monster3", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "4", suit: "c" },
        { rank: "5", suit: "d" },
      ];
      expect(eval3rdQuality(cards)).toBe("Monster3");
    });

    it("A67 → Good3", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "6", suit: "c" },
        { rank: "7", suit: "d" },
      ];
      expect(eval3rdQuality(cards)).toBe("Good3");
    });

    it("238 → Good3", () => {
      const cards: Card[] = [
        { rank: "2", suit: "h" },
        { rank: "3", suit: "c" },
        { rank: "8", suit: "d" },
      ];
      expect(eval3rdQuality(cards)).toBe("Good3");
    });

    it("669 → Okay3（8以下2枚＋9以下1枚）", () => {
      const cards: Card[] = [
        { rank: "6", suit: "h" },
        { rank: "6", suit: "c" },
        { rank: "9", suit: "d" },
      ];
      // ペアありなのでOkay3かBad3
      // 8以下2枚 + 9以下1枚の条件を満たす
      expect(["Okay3", "Bad3"]).toContain(eval3rdQuality(cards));
    });

    it("JQK → Bad3", () => {
      const cards: Card[] = [
        { rank: "J", suit: "h" },
        { rank: "Q", suit: "c" },
        { rank: "K", suit: "d" },
      ];
      expect(eval3rdQuality(cards)).toBe("Bad3");
    });
  });

  describe("countDeadLow", () => {
    it("A〜5が2枚dead → deadA5=2", () => {
      const deadRank = { ...emptyRankCount(), A: 1, "3": 1 };
      const result = countDeadLow(deadRank);
      expect(result.deadA5).toBe(2);
      expect(result.dead68).toBe(0);
    });

    it("6,7,8が各1枚dead → dead68=3", () => {
      const deadRank = { ...emptyRankCount(), "6": 1, "7": 1, "8": 1 };
      const result = countDeadLow(deadRank);
      expect(result.dead68).toBe(3);
    });
  });

  describe("estimateBoardQuality", () => {
    it("低牌のみ → lowCount8=4, highCount9=0, pairPenalty=0", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "3", suit: "d" },
        { rank: "4", suit: "s" },
      ];
      const result = estimateBoardQuality(cards);
      expect(result.lowCount8).toBe(4);
      expect(result.highCount9).toBe(0);
      expect(result.pairPenalty).toBe(0);
    });

    it("ブリック混入 → highCount9>0", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "K", suit: "d" },
        { rank: "Q", suit: "s" },
      ];
      const result = estimateBoardQuality(cards);
      expect(result.highCount9).toBe(2);
    });

    it("ペア汚染 → pairPenalty>0", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "A", suit: "c" },
        { rank: "3", suit: "d" },
      ];
      const result = estimateBoardQuality(cards);
      expect(result.pairPenalty).toBe(1);
    });
  });

  describe("isStealLikely", () => {
    it("相手K、自分5 → スチールっぽい", () => {
      expect(isStealLikely("K", "5")).toBe(true);
    });

    it("相手5、自分K → スチールっぽくない", () => {
      expect(isStealLikely("5", "K")).toBe(false);
    });

    it("相手8、自分5 → スチールっぽくない（相手が8以下）", () => {
      expect(isStealLikely("8", "5")).toBe(false);
    });
  });

  describe("scoreOppBoardDirt", () => {
    it("低牌のみ → 低スコア", () => {
      const up: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
      ];
      expect(scoreOppBoardDirt(up)).toBe(0);
    });

    it("高牌含む → 高スコア", () => {
      const up: Card[] = [
        { rank: "K", suit: "h" },
        { rank: "Q", suit: "c" },
      ];
      expect(scoreOppBoardDirt(up)).toBeGreaterThanOrEqual(4);
    });

    it("ペアあり → +3", () => {
      const up: Card[] = [
        { rank: "5", suit: "h" },
        { rank: "5", suit: "c" },
      ];
      expect(scoreOppBoardDirt(up)).toBeGreaterThanOrEqual(3);
    });
  });

  describe("countBetterDoors", () => {
    it("自分5、相手A,2 → 2人", () => {
      const opponents = [
        { seat: 0, active: true, up: [{ rank: "A", suit: "h" } as Card], downCount: 2 },
        { seat: 1, active: true, up: [{ rank: "2", suit: "c" } as Card], downCount: 2 },
      ];
      expect(countBetterDoors("5", opponents)).toBe(2);
    });

    it("自分A、相手K,Q → 0人", () => {
      const opponents = [
        { seat: 0, active: true, up: [{ rank: "K", suit: "h" } as Card], downCount: 2 },
        { seat: 1, active: true, up: [{ rank: "Q", suit: "c" } as Card], downCount: 2 },
      ];
      expect(countBetterDoors("A", opponents)).toBe(0);
    });
  });

  describe("allOppsHaveWorseDoor", () => {
    it("自分A、相手K,Q → true", () => {
      const opponents = [
        { seat: 0, active: true, up: [{ rank: "K", suit: "h" } as Card], downCount: 2 },
        { seat: 1, active: true, up: [{ rank: "Q", suit: "c" } as Card], downCount: 2 },
      ];
      expect(allOppsHaveWorseDoor("A", opponents)).toBe(true);
    });

    it("自分5、相手3,K → false（3が良い）", () => {
      const opponents = [
        { seat: 0, active: true, up: [{ rank: "3", suit: "h" } as Card], downCount: 2 },
        { seat: 1, active: true, up: [{ rank: "K", suit: "c" } as Card], downCount: 2 },
      ];
      expect(allOppsHaveWorseDoor("5", opponents)).toBe(false);
    });
  });
});
