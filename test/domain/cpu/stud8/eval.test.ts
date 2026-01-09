import { describe, expect, it } from "vitest";
import {
  classify3rdStud8,
  countLowDead,
  inferIntentFromDoor,
  inferRoleNow,
  isOppBoardHiStrong,
  isOppBoardLoDirty,
  isOppBoardLoStrong,
  lowValue,
} from "../../../../src/domain/cpu/stud8/eval";
import type { Card, Rank } from "../../../../src/domain/types";

/**
 * Stud8評価関数のテスト
 */
describe("stud8/eval", () => {
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

    it("5=5", () => {
      expect(lowValue("5")).toBe(5);
    });

    it("8=8（Lo資格境界）", () => {
      expect(lowValue("8")).toBe(8);
    });

    it("9=9（Lo資格外）", () => {
      expect(lowValue("9")).toBe(9);
    });

    it("K=13（最弱）", () => {
      expect(lowValue("K")).toBe(13);
    });
  });

  // ============================================================
  // classify3rdStud8 テスト
  // ============================================================

  describe("classify3rdStud8", () => {
    describe("Scoop3_Monster（Hi/Lo両睨み）", () => {
      it("A23 → Scoop3_Monster", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
          { rank: "3", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });

      it("A24 → Scoop3_Monster", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
          { rank: "4", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });

      it("A25 → Scoop3_Monster", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
          { rank: "5", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });

      it("A28 → Scoop3_Monster（x<=8）", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
          { rank: "8", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });

      it("A34 → Scoop3_Monster", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "3", suit: "c" },
          { rank: "4", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });

      it("A38 → Scoop3_Monster", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "3", suit: "c" },
          { rank: "8", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });

      it("33A → Scoop3_Monster（低ペア+A）", () => {
        const cards: Card[] = [
          { rank: "3", suit: "h" },
          { rank: "3", suit: "c" },
          { rank: "A", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });

      it("44A → Scoop3_Monster（低ペア+A）", () => {
        const cards: Card[] = [
          { rank: "4", suit: "h" },
          { rank: "4", suit: "c" },
          { rank: "A", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });

      it("55A → Scoop3_Monster（低ペア+A）", () => {
        const cards: Card[] = [
          { rank: "5", suit: "h" },
          { rank: "5", suit: "c" },
          { rank: "A", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Scoop3_Monster");
      });
    });

    describe("Low3_Good（8以下3枚別ランク）", () => {
      it("346 → Low3_Good", () => {
        const cards: Card[] = [
          { rank: "3", suit: "h" },
          { rank: "4", suit: "c" },
          { rank: "6", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Low3_Good");
      });

      it("568 → Low3_Good", () => {
        const cards: Card[] = [
          { rank: "5", suit: "h" },
          { rank: "6", suit: "c" },
          { rank: "8", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Low3_Good");
      });

      it("A69 → Low3_Good（A含む8以下2枚+9以下1枚）", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "6", suit: "c" },
          { rank: "9", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Low3_Good");
      });
    });

    describe("High3_Good（99+ペア、3フラ）", () => {
      it("99x → High3_Good", () => {
        const cards: Card[] = [
          { rank: "9", suit: "h" },
          { rank: "9", suit: "c" },
          { rank: "K", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("High3_Good");
      });

      it("TTx → High3_Good", () => {
        const cards: Card[] = [
          { rank: "T", suit: "h" },
          { rank: "T", suit: "c" },
          { rank: "A", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("High3_Good");
      });

      it("QQx → High3_Good", () => {
        const cards: Card[] = [
          { rank: "Q", suit: "h" },
          { rank: "Q", suit: "c" },
          { rank: "3", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("High3_Good");
      });

      it("KKx → High3_Good", () => {
        const cards: Card[] = [
          { rank: "K", suit: "h" },
          { rank: "K", suit: "c" },
          { rank: "5", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("High3_Good");
      });

      it("66x → High3_Good（66-88もHi寄り）", () => {
        const cards: Card[] = [
          { rank: "6", suit: "h" },
          { rank: "6", suit: "c" },
          { rank: "K", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("High3_Good");
      });

      it("88x → High3_Good（66-88もHi寄り）", () => {
        const cards: Card[] = [
          { rank: "8", suit: "h" },
          { rank: "8", suit: "c" },
          { rank: "Q", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("High3_Good");
      });

      it("3フラッシュ → High3_Good", () => {
        const cards: Card[] = [
          { rank: "2", suit: "h" },
          { rank: "7", suit: "h" },
          { rank: "K", suit: "h" },
        ];
        expect(classify3rdStud8(cards)).toBe("High3_Good");
      });
    });

    describe("Marginal（片方のみ薄い）", () => {
      it("Low札2枚 → Marginal", () => {
        const cards: Card[] = [
          { rank: "3", suit: "h" },
          { rank: "5", suit: "c" },
          { rank: "T", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Marginal");
      });
    });

    describe("Trash（両方薄い）", () => {
      it("9TJ → Trash", () => {
        const cards: Card[] = [
          { rank: "9", suit: "h" },
          { rank: "T", suit: "c" },
          { rank: "J", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Trash");
      });

      it("TJQ → Trash", () => {
        const cards: Card[] = [
          { rank: "T", suit: "h" },
          { rank: "J", suit: "c" },
          { rank: "Q", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Trash");
      });

      it("JQK → Trash", () => {
        const cards: Card[] = [
          { rank: "J", suit: "h" },
          { rank: "Q", suit: "c" },
          { rank: "K", suit: "d" },
        ];
        expect(classify3rdStud8(cards)).toBe("Trash");
      });
    });

    describe("エッジケース", () => {
      it("2枚のみ → Trash", () => {
        const cards: Card[] = [
          { rank: "A", suit: "h" },
          { rank: "2", suit: "c" },
        ];
        expect(classify3rdStud8(cards)).toBe("Trash");
      });

      it("空配列 → Trash", () => {
        expect(classify3rdStud8([])).toBe("Trash");
      });
    });
  });

  // ============================================================
  // countLowDead テスト
  // ============================================================

  describe("countLowDead", () => {
    it("A〜5が2枚dead → deadAto5=2, penalty=4", () => {
      const deadRank = { ...emptyRankCount(), A: 1, "3": 1 };
      const result = countLowDead(deadRank);
      expect(result.deadAto5).toBe(2);
      expect(result.dead6to8).toBe(0);
      expect(result.penalty).toBe(4);
    });

    it("6,7,8が各1枚dead → dead6to8=3, penalty=3", () => {
      const deadRank = { ...emptyRankCount(), "6": 1, "7": 1, "8": 1 };
      const result = countLowDead(deadRank);
      expect(result.deadAto5).toBe(0);
      expect(result.dead6to8).toBe(3);
      expect(result.penalty).toBe(3);
    });

    it("A〜5全部1枚ずつ → deadAto5=5, penalty=10", () => {
      const deadRank = {
        ...emptyRankCount(),
        A: 1,
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 1,
      };
      const result = countLowDead(deadRank);
      expect(result.deadAto5).toBe(5);
      expect(result.penalty).toBe(10);
    });

    it("混合 → penalty = 2*deadAto5 + 1*dead6to8", () => {
      const deadRank = { ...emptyRankCount(), A: 1, "2": 1, "6": 1, "8": 1 };
      const result = countLowDead(deadRank);
      expect(result.deadAto5).toBe(2);
      expect(result.dead6to8).toBe(2);
      expect(result.penalty).toBe(6); // 2*2 + 2
    });

    it("何もdead無し → penalty=0", () => {
      const result = countLowDead(emptyRankCount());
      expect(result.deadAto5).toBe(0);
      expect(result.dead6to8).toBe(0);
      expect(result.penalty).toBe(0);
    });

    it("9以上はカウントされない", () => {
      const deadRank = { ...emptyRankCount(), "9": 2, T: 2, J: 1, Q: 1, K: 1 };
      const result = countLowDead(deadRank);
      expect(result.deadAto5).toBe(0);
      expect(result.dead6to8).toBe(0);
      expect(result.penalty).toBe(0);
    });
  });

  // ============================================================
  // inferIntentFromDoor テスト
  // ============================================================

  describe("inferIntentFromDoor", () => {
    it("A → LO", () => {
      expect(inferIntentFromDoor("A")).toBe("LO");
    });

    it("5 → LO", () => {
      expect(inferIntentFromDoor("5")).toBe("LO");
    });

    it("8 → LO（境界）", () => {
      expect(inferIntentFromDoor("8")).toBe("LO");
    });

    it("9 → HI（境界）", () => {
      expect(inferIntentFromDoor("9")).toBe("HI");
    });

    it("K → HI", () => {
      expect(inferIntentFromDoor("K")).toBe("HI");
    });
  });

  // ============================================================
  // inferRoleNow テスト
  // ============================================================

  describe("inferRoleNow", () => {
    it("8以下4枚＋ペア → SCOOPING", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "3", suit: "d" },
        { rank: "3", suit: "s" },
        { rank: "5", suit: "h" },
      ];
      expect(inferRoleNow(cards)).toBe("SCOOPING");
    });

    it("8以下4枚＋ペアなし → LO_ONLY", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "3", suit: "d" },
        { rank: "5", suit: "s" },
        { rank: "K", suit: "h" },
      ];
      expect(inferRoleNow(cards)).toBe("LO_ONLY");
    });

    it("8以下3枚未満＋ペア → HI_ONLY", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "K", suit: "c" },
        { rank: "K", suit: "d" },
        { rank: "Q", suit: "s" },
        { rank: "J", suit: "h" },
      ];
      expect(inferRoleNow(cards)).toBe("HI_ONLY");
    });

    it("3枚で8以下3枚 → LO_ONLY", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "3", suit: "d" },
      ];
      expect(inferRoleNow(cards)).toBe("LO_ONLY");
    });

    it("3枚でペアあり → HI_ONLY", () => {
      const cards: Card[] = [
        { rank: "K", suit: "h" },
        { rank: "K", suit: "c" },
        { rank: "Q", suit: "d" },
      ];
      expect(inferRoleNow(cards)).toBe("HI_ONLY");
    });

    it("9以上のみ＋ペアなし → AIR", () => {
      const cards: Card[] = [
        { rank: "9", suit: "h" },
        { rank: "T", suit: "c" },
        { rank: "J", suit: "d" },
        { rank: "Q", suit: "s" },
        { rank: "K", suit: "h" },
      ];
      expect(inferRoleNow(cards)).toBe("AIR");
    });

    it("2枚のみ → AIR", () => {
      const cards: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
      ];
      expect(inferRoleNow(cards)).toBe("AIR");
    });
  });

  // ============================================================
  // isOppBoardLoStrong テスト
  // ============================================================

  describe("isOppBoardLoStrong", () => {
    it("8以下のみ＋ペアなし → true", () => {
      const up: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "3", suit: "c" },
        { rank: "5", suit: "d" },
      ];
      expect(isOppBoardLoStrong(up)).toBe(true);
    });

    it("8以下複数だがペアあり → false", () => {
      const up: Card[] = [
        { rank: "3", suit: "h" },
        { rank: "3", suit: "c" },
        { rank: "5", suit: "d" },
      ];
      expect(isOppBoardLoStrong(up)).toBe(false);
    });

    it("9以上が多い → false", () => {
      const up: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "K", suit: "c" },
        { rank: "Q", suit: "d" },
      ];
      expect(isOppBoardLoStrong(up)).toBe(false);
    });

    it("空配列 → false", () => {
      expect(isOppBoardLoStrong([])).toBe(false);
    });
  });

  // ============================================================
  // isOppBoardLoDirty テスト
  // ============================================================

  describe("isOppBoardLoDirty", () => {
    it("9以上混入 → true", () => {
      const up: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "K", suit: "c" },
      ];
      expect(isOppBoardLoDirty(up)).toBe(true);
    });

    it("ペアあり → true", () => {
      const up: Card[] = [
        { rank: "3", suit: "h" },
        { rank: "3", suit: "c" },
      ];
      expect(isOppBoardLoDirty(up)).toBe(true);
    });

    it("クリーンな低牌 → false", () => {
      const up: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "5", suit: "d" },
      ];
      expect(isOppBoardLoDirty(up)).toBe(false);
    });

    it("空配列 → false", () => {
      expect(isOppBoardLoDirty([])).toBe(false);
    });
  });

  // ============================================================
  // isOppBoardHiStrong テスト
  // ============================================================

  describe("isOppBoardHiStrong", () => {
    it("オープンペア → true", () => {
      const up: Card[] = [
        { rank: "K", suit: "h" },
        { rank: "K", suit: "c" },
      ];
      expect(isOppBoardHiStrong(up)).toBe(true);
    });

    it("低牌ペア → true", () => {
      const up: Card[] = [
        { rank: "3", suit: "h" },
        { rank: "3", suit: "c" },
        { rank: "5", suit: "d" },
      ];
      expect(isOppBoardHiStrong(up)).toBe(true);
    });

    it("ペアなし → false", () => {
      const up: Card[] = [
        { rank: "A", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "5", suit: "d" },
      ];
      expect(isOppBoardHiStrong(up)).toBe(false);
    });

    it("1枚のみ → false", () => {
      const up: Card[] = [{ rank: "K", suit: "h" }];
      expect(isOppBoardHiStrong(up)).toBe(false);
    });
  });
});
