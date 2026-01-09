import { describe, expect, it } from "vitest";
import {
  allOppsHaveWorseDoor,
  countBetterDoors,
  countDeadLow,
  estimateBoardQuality,
  eval3rdQuality,
  getMaxOppDirt,
  getMinOppDirt,
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

  // ============================================================
  // lowValue テスト
  // ============================================================

  describe("lowValue", () => {
    it("A=1（最強のロー）", () => {
      expect(lowValue("A")).toBe(1);
    });

    it("2=2", () => {
      expect(lowValue("2")).toBe(2);
    });

    it("3=3", () => {
      expect(lowValue("3")).toBe(3);
    });

    it("4=4", () => {
      expect(lowValue("4")).toBe(4);
    });

    it("5=5", () => {
      expect(lowValue("5")).toBe(5);
    });

    it("6=6", () => {
      expect(lowValue("6")).toBe(6);
    });

    it("7=7", () => {
      expect(lowValue("7")).toBe(7);
    });

    it("8=8", () => {
      expect(lowValue("8")).toBe(8);
    });

    it("9=9", () => {
      expect(lowValue("9")).toBe(9);
    });

    it("T=10", () => {
      expect(lowValue("T")).toBe(10);
    });

    it("J=11", () => {
      expect(lowValue("J")).toBe(11);
    });

    it("Q=12", () => {
      expect(lowValue("Q")).toBe(12);
    });

    it("K=13（最弱）", () => {
      expect(lowValue("K")).toBe(13);
    });
  });

  // ============================================================
  // eval3rdQuality テスト
  // ============================================================

  describe("eval3rdQuality", () => {
    describe("Monster3（5以下3枚、ノーペア）", () => {
      it("A23 → Monster3", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
          { rank: "3", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Monster3");
      });

      it("A24 → Monster3", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
          { rank: "4", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Monster3");
      });

      it("A25 → Monster3", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
          { rank: "5", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Monster3");
      });

      it("234 → Monster3", () => {
        const cards: Card[] = [
          { rank: "2", suit: "h" },
          { rank: "3", suit: "c" },
          { rank: "4", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Monster3");
      });

      it("345 → Monster3", () => {
        const cards: Card[] = [
          { rank: "3", suit: "h" },
          { rank: "4", suit: "c" },
          { rank: "5", suit: "d" },
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
    });

    describe("Good3（8以下3枚、ノーペア）", () => {
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

      it("678 → Good3", () => {
        const cards: Card[] = [
          { rank: "6", suit: "h" },
          { rank: "7", suit: "c" },
          { rank: "8", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Good3");
      });

      it("A36 → Good3", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "3", suit: "c" },
          { rank: "6", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Good3");
      });

      it("458 → Good3", () => {
        const cards: Card[] = [
          { rank: "4", suit: "h" },
          { rank: "5", suit: "c" },
          { rank: "8", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Good3");
      });
    });

    describe("Okay3（境界ケース）", () => {
      it("8以下3枚だがペア含み → Okay3", () => {
        const cards: Card[] = [
          { rank: "3", suit: "h" },
          { rank: "3", suit: "c" },
          { rank: "5", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Okay3");
      });

      it("A26 ペア → Okay3", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "A", suit: "c" },
          { rank: "6", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Okay3");
      });
    });

    describe("Bad3（弱い手）", () => {
      it("JQK → Bad3", () => {
        const cards: Card[] = [
          { rank: "J", suit: "h" },
          { rank: "Q", suit: "c" },
          { rank: "K", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Bad3");
      });

      it("TJQ → Bad3", () => {
        const cards: Card[] = [
          { rank: "T", suit: "h" },
          { rank: "J", suit: "c" },
          { rank: "Q", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Bad3");
      });

      it("9TJ → Bad3", () => {
        const cards: Card[] = [
          { rank: "9", suit: "h" },
          { rank: "T", suit: "c" },
          { rank: "J", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Bad3");
      });

      it("KKA → Bad3（高牌ペア）", () => {
        const cards: Card[] = [
          { rank: "K", suit: "h" },
          { rank: "K", suit: "c" },
          { rank: "A", suit: "d" },
        ];
        expect(eval3rdQuality(cards)).toBe("Bad3");
      });
    });

    describe("エッジケース", () => {
      it("2枚のみ → Bad3", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
        ];
        expect(eval3rdQuality(cards)).toBe("Bad3");
      });

      it("4枚 → Bad3", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
          { rank: "3", suit: "d" },
          { rank: "4", suit: "s" },
        ];
        expect(eval3rdQuality(cards)).toBe("Bad3");
      });

      it("空配列 → Bad3", () => {
        const cards: Card[] = [];
        expect(eval3rdQuality(cards)).toBe("Bad3");
      });
    });
  });

  // ============================================================
  // countDeadLow テスト
  // ============================================================

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

    it("A〜5全部1枚ずつdead → deadA5=5", () => {
      const deadRank = {
        ...emptyRankCount(),
        A: 1,
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 1,
      };
      const result = countDeadLow(deadRank);
      expect(result.deadA5).toBe(5);
    });

    it("何もdead無し → deadA5=0, dead68=0", () => {
      const result = countDeadLow(emptyRankCount());
      expect(result.deadA5).toBe(0);
      expect(result.dead68).toBe(0);
    });

    it("9以上はカウントされない", () => {
      const deadRank = { ...emptyRankCount(), "9": 2, T: 2, J: 1, Q: 1, K: 1 };
      const result = countDeadLow(deadRank);
      expect(result.deadA5).toBe(0);
      expect(result.dead68).toBe(0);
    });
  });

  // ============================================================
  // estimateBoardQuality テスト
  // ============================================================

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
      expect(result.lowCount8).toBe(2);
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

    it("トリプス → pairPenalty=2", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "A", suit: "c" },
        { rank: "A", suit: "d" },
        { rank: "2", suit: "s" },
      ];
      const result = estimateBoardQuality(cards);
      expect(result.pairPenalty).toBe(2);
    });

    it("2ペア → pairPenalty=2", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "A", suit: "c" },
        { rank: "3", suit: "d" },
        { rank: "3", suit: "s" },
      ];
      const result = estimateBoardQuality(cards);
      expect(result.pairPenalty).toBe(2);
    });

    it("全て9以上 → lowCount8=0, highCount9=4", () => {
      const cards: Card[] = [
        { rank: "9", suit: "h" },
        { rank: "T", suit: "c" },
        { rank: "J", suit: "d" },
        { rank: "Q", suit: "s" },
      ];
      const result = estimateBoardQuality(cards);
      expect(result.lowCount8).toBe(0);
      expect(result.highCount9).toBe(4);
    });

    it("空配列 → すべて0", () => {
      const result = estimateBoardQuality([]);
      expect(result.lowCount8).toBe(0);
      expect(result.highCount9).toBe(0);
      expect(result.pairPenalty).toBe(0);
    });
  });

  // ============================================================
  // isStealLikely テスト
  // ============================================================

  describe("isStealLikely", () => {
    it("相手K、自分5 → スチールっぽい", () => {
      expect(isStealLikely("K", "5")).toBe(true);
    });

    it("相手Q、自分3 → スチールっぽい", () => {
      expect(isStealLikely("Q", "3")).toBe(true);
    });

    it("相手J、自分A → スチールっぽい", () => {
      expect(isStealLikely("J", "A")).toBe(true);
    });

    it("相手9、自分8 → スチールっぽい", () => {
      expect(isStealLikely("9", "8")).toBe(true);
    });

    it("相手5、自分K → スチールっぽくない", () => {
      expect(isStealLikely("5", "K")).toBe(false);
    });

    it("相手8、自分5 → スチールっぽくない（相手が8以下）", () => {
      expect(isStealLikely("8", "5")).toBe(false);
    });

    it("相手9、自分T → スチールっぽくない（自分が相手より高い）", () => {
      expect(isStealLikely("9", "T")).toBe(false);
    });

    it("相手K、自分K → スチールっぽくない（同じ）", () => {
      expect(isStealLikely("K", "K")).toBe(false);
    });
  });

  // ============================================================
  // scoreOppBoardDirt テスト
  // ============================================================

  describe("scoreOppBoardDirt", () => {
    it("低牌のみ → 0", () => {
      const up: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
      ];
      expect(scoreOppBoardDirt(up)).toBe(0);
    });

    it("高牌1枚 → 2", () => {
      const up: Card[] = [{ rank: "K", suit: "h" }];
      expect(scoreOppBoardDirt(up)).toBe(2);
    });

    it("高牌2枚 → 4以上", () => {
      const up: Card[] = [
        { rank: "K", suit: "h" },
        { rank: "Q", suit: "c" },
      ];
      expect(scoreOppBoardDirt(up)).toBeGreaterThanOrEqual(4);
    });

    it("ペアあり（低牌） → +3", () => {
      const up: Card[] = [
        { rank: "5", suit: "h" },
        { rank: "5", suit: "c" },
      ];
      expect(scoreOppBoardDirt(up)).toBe(3);
    });

    it("ペアあり（高牌） → 高スコア", () => {
      const up: Card[] = [
        { rank: "K", suit: "h" },
        { rank: "K", suit: "c" },
      ];
      // 高牌2枚(4) + ペア(3) = 7
      expect(scoreOppBoardDirt(up)).toBeGreaterThanOrEqual(7);
    });

    it("空配列 → 0", () => {
      expect(scoreOppBoardDirt([])).toBe(0);
    });
  });

  // ============================================================
  // getMaxOppDirt / getMinOppDirt テスト
  // ============================================================

  describe("getMaxOppDirt", () => {
    it("複数相手の最大汚れ度を返す", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "A", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [
            { rank: "K", suit: "c" } as Card,
            { rank: "Q", suit: "d" } as Card,
          ],
          downCount: 2,
        },
      ];
      expect(getMaxOppDirt(opponents)).toBeGreaterThanOrEqual(4);
    });
  });

  describe("getMinOppDirt", () => {
    it("複数相手の最小汚れ度を返す（activeのみ）", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "A", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [
            { rank: "K", suit: "c" } as Card,
            { rank: "Q", suit: "d" } as Card,
          ],
          downCount: 2,
        },
      ];
      expect(getMinOppDirt(opponents)).toBe(0);
    });

    it("inactive相手は無視される", () => {
      const opponents = [
        {
          seat: 0,
          active: false,
          up: [{ rank: "A", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [{ rank: "K", suit: "c" } as Card],
          downCount: 2,
        },
      ];
      expect(getMinOppDirt(opponents)).toBe(2);
    });
  });

  // ============================================================
  // countBetterDoors テスト
  // ============================================================

  describe("countBetterDoors", () => {
    it("自分5、相手A,2 → 2人", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "A", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [{ rank: "2", suit: "c" } as Card],
          downCount: 2,
        },
      ];
      expect(countBetterDoors("5", opponents)).toBe(2);
    });

    it("自分A、相手K,Q → 0人", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "K", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [{ rank: "Q", suit: "c" } as Card],
          downCount: 2,
        },
      ];
      expect(countBetterDoors("A", opponents)).toBe(0);
    });

    it("自分5、相手5,3 → 1人（同じは含まない）", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "5", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [{ rank: "3", suit: "c" } as Card],
          downCount: 2,
        },
      ];
      expect(countBetterDoors("5", opponents)).toBe(1);
    });

    it("inactive相手は無視される", () => {
      const opponents = [
        {
          seat: 0,
          active: false,
          up: [{ rank: "A", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [{ rank: "K", suit: "c" } as Card],
          downCount: 2,
        },
      ];
      expect(countBetterDoors("5", opponents)).toBe(0);
    });
  });

  // ============================================================
  // allOppsHaveWorseDoor テスト
  // ============================================================

  describe("allOppsHaveWorseDoor", () => {
    it("自分A、相手K,Q → true", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "K", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [{ rank: "Q", suit: "c" } as Card],
          downCount: 2,
        },
      ];
      expect(allOppsHaveWorseDoor("A", opponents)).toBe(true);
    });

    it("自分5、相手3,K → false（3が良い）", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "3", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [{ rank: "K", suit: "c" } as Card],
          downCount: 2,
        },
      ];
      expect(allOppsHaveWorseDoor("5", opponents)).toBe(false);
    });

    it("自分5、相手5,K → false（同じは悪くない）", () => {
      const opponents = [
        {
          seat: 0,
          active: true,
          up: [{ rank: "5", suit: "h" } as Card],
          downCount: 2,
        },
        {
          seat: 1,
          active: true,
          up: [{ rank: "K", suit: "c" } as Card],
          downCount: 2,
        },
      ];
      expect(allOppsHaveWorseDoor("5", opponents)).toBe(false);
    });

    it("相手がいない → true", () => {
      expect(allOppsHaveWorseDoor("5", [])).toBe(true);
    });

    it("inactive相手のみ → true", () => {
      const opponents = [
        {
          seat: 0,
          active: false,
          up: [{ rank: "A", suit: "h" } as Card],
          downCount: 2,
        },
      ];
      expect(allOppsHaveWorseDoor("K", opponents)).toBe(true);
    });
  });
});
