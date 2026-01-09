import { describe, expect, it } from "vitest";
import {
  evalCategory,
  evalTier3rd,
  liveForFlushSuit,
  liveForPairImprove,
  scoreThreat,
  scoreThreatForUp,
} from "../../../../src/domain/cpu/studHi/eval";
import type { Card, Rank, Suit } from "../../../../src/domain/types";

/**
 * 評価関数のテスト
 */
describe("eval", () => {
  // ヘルパー: 空のdeadCount
  const emptyRankCount = (): Record<Rank, number> =>
    Object.fromEntries(
      ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"].map(
        (r) => [r, 0],
      ),
    ) as Record<Rank, number>;

  const emptySuitCount = (): Record<Suit, number> =>
    ({ c: 0, d: 0, h: 0, s: 0 }) as Record<Suit, number>;

  describe("evalTier3rd", () => {
    describe("Tier S", () => {
      it("Trips → S", () => {
        const cards: Card[] = [
          { rank: "7", suit: "h" },
          { rank: "7", suit: "c" },
          { rank: "7", suit: "d" },
        ];
        expect(evalTier3rd(cards, emptyRankCount(), emptySuitCount())).toBe(
          "S",
        );
      });

      it("隠れハイペア（JJ+） → S", () => {
        const cards: Card[] = [
          { rank: "K", suit: "h" },
          { rank: "K", suit: "c" },
          { rank: "4", suit: "d" },
        ];
        expect(evalTier3rd(cards, emptyRankCount(), emptySuitCount())).toBe(
          "S",
        );
      });
    });

    describe("Tier A", () => {
      it("隠れミドルペア（77-TT） → A", () => {
        const cards: Card[] = [
          { rank: "9", suit: "h" },
          { rank: "9", suit: "c" },
          { rank: "2", suit: "d" },
        ];
        expect(evalTier3rd(cards, emptyRankCount(), emptySuitCount())).toBe(
          "A",
        );
      });

      it("A-high 3フラ + Live良 → A", () => {
        const cards: Card[] = [
          { rank: "A", suit: "s" },
          { rank: "6", suit: "s" },
          { rank: "T", suit: "s" },
        ];
        expect(evalTier3rd(cards, emptyRankCount(), emptySuitCount())).toBe(
          "A",
        );
      });
    });

    describe("Tier B", () => {
      it("ローペア（22-66） → B", () => {
        const cards: Card[] = [
          { rank: "4", suit: "h" },
          { rank: "4", suit: "c" },
          { rank: "Q", suit: "d" },
        ];
        expect(evalTier3rd(cards, emptyRankCount(), emptySuitCount())).toBe(
          "B",
        );
      });

      it("低位3フラ → B", () => {
        const cards: Card[] = [
          { rank: "7", suit: "d" },
          { rank: "3", suit: "d" },
          { rank: "2", suit: "d" },
        ];
        expect(evalTier3rd(cards, emptyRankCount(), emptySuitCount())).toBe(
          "B",
        );
      });
    });

    describe("Tier C", () => {
      it("高ドア単体（J/Q/K/A） → C", () => {
        const cards: Card[] = [
          { rank: "Q", suit: "h" },
          { rank: "5", suit: "c" },
          { rank: "2", suit: "d" },
        ];
        expect(evalTier3rd(cards, emptyRankCount(), emptySuitCount())).toBe(
          "C",
        );
      });

      it("3フラでdeadSuit>=3 → 2段階降格（A→C）", () => {
        const cards: Card[] = [
          { rank: "A", suit: "s" },
          { rank: "K", suit: "s" },
          { rank: "Q", suit: "s" },
        ];
        const deadSuit = { ...emptySuitCount(), s: 3 };
        expect(evalTier3rd(cards, emptyRankCount(), deadSuit)).toBe("C");
      });
    });

    describe("Tier D", () => {
      it("低いドア単体 → D", () => {
        const cards: Card[] = [
          { rank: "6", suit: "h" },
          { rank: "3", suit: "c" },
          { rank: "2", suit: "d" },
        ];
        expect(evalTier3rd(cards, emptyRankCount(), emptySuitCount())).toBe(
          "D",
        );
      });
    });
  });

  describe("evalCategory", () => {
    it("ペアあり → M", () => {
      const cards: Card[] = [
        { rank: "T", suit: "h" },
        { rank: "T", suit: "c" },
        { rank: "5", suit: "d" },
        { rank: "3", suit: "s" },
      ];
      expect(evalCategory(cards, emptyRankCount(), emptySuitCount())).toBe("M");
    });

    it("4フラ → D", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "K", suit: "h" },
        { rank: "Q", suit: "h" },
        { rank: "J", suit: "h" },
        { rank: "2", suit: "c" },
      ];
      expect(evalCategory(cards, emptyRankCount(), emptySuitCount())).toBe("D");
    });

    it("ペアなし・ドローなし → N", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "K", suit: "c" },
        { rank: "8", suit: "d" },
        { rank: "5", suit: "s" },
        { rank: "2", suit: "h" },
      ];
      expect(evalCategory(cards, emptyRankCount(), emptySuitCount())).toBe("N");
    });
  });

  describe("scoreThreat", () => {
    it("オープンペアup → +5", () => {
      const up: Card[] = [
        { rank: "K", suit: "h" },
        { rank: "K", suit: "c" },
      ];
      expect(scoreThreatForUp(up)).toBeGreaterThanOrEqual(5);
    });

    it("4フラup → +6", () => {
      const up: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "K", suit: "h" },
        { rank: "Q", suit: "h" },
        { rank: "J", suit: "h" },
      ];
      expect(scoreThreatForUp(up)).toBeGreaterThanOrEqual(6);
    });

    it("A含む → +2", () => {
      const up: Card[] = [{ rank: "A", suit: "h" }];
      expect(scoreThreatForUp(up)).toBeGreaterThanOrEqual(2);
    });

    it("scoreThreat は最大値を返す", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "2", suit: "c" } as Card],
          downCount: 2,
        },
        {
          seat: 2,
          active: true,
          up: [{ rank: "A", suit: "h" } as Card],
          downCount: 2,
        },
      ];
      expect(scoreThreat(opponents)).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Live判定", () => {
    it("liveForFlushSuit: deadSuit <= 1 → GOOD", () => {
      expect(liveForFlushSuit("h", { c: 0, d: 0, h: 1, s: 0 })).toBe("GOOD");
    });

    it("liveForFlushSuit: deadSuit == 2 → OK", () => {
      expect(liveForFlushSuit("h", { c: 0, d: 0, h: 2, s: 0 })).toBe("OK");
    });

    it("liveForFlushSuit: deadSuit >= 3 → BAD", () => {
      expect(liveForFlushSuit("h", { c: 0, d: 0, h: 3, s: 0 })).toBe("BAD");
    });

    it("liveForPairImprove: dead == 0 → GOOD", () => {
      expect(liveForPairImprove("K", emptyRankCount())).toBe("GOOD");
    });

    it("liveForPairImprove: dead == 1 → OK", () => {
      const deadRank = { ...emptyRankCount(), K: 1 };
      expect(liveForPairImprove("K", deadRank)).toBe("OK");
    });

    it("liveForPairImprove: dead >= 2 → BAD", () => {
      const deadRank = { ...emptyRankCount(), K: 2 };
      expect(liveForPairImprove("K", deadRank)).toBe("BAD");
    });
  });
});
