/**
 * Razz CPU Lv2: 評価関数群
 *
 * Low評価、3rd品質判定、dead cards評価を実装。
 * 仕様: docs/cpu_Lv2/Razz_実装指示書.md
 */

import type { Card, Rank } from "../../types";
import type { VisiblePlayer } from "../studHi/visibleContext";

// ============================================================
// 定数
// ============================================================

/** Razzのランク値（A=1が最強のロー） */
const LOW_VALUE: Record<Rank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
};

/** ランクをLow値に変換 */
export const lowValue = (r: Rank): number => LOW_VALUE[r];

// ============================================================
// 3rd Street品質判定
// ============================================================

/** 3rdの品質評価 */
export type Quality3rd = "Monster3" | "Good3" | "Okay3" | "Bad3";

/**
 * 3枚のカードでペアがあるか判定
 */
const hasPair = (cards: Card[]): boolean => {
  const ranks = cards.map((c) => c.rank);
  return new Set(ranks).size < ranks.length;
};

/**
 * 3rdの品質を評価（Monster3/Good3/Okay3/Bad3）
 */
export const eval3rdQuality = (meCards3: Card[]): Quality3rd => {
  if (meCards3.length !== 3) return "Bad3";

  const vals = meCards3.map((c) => lowValue(c.rank));
  const maxVal = Math.max(...vals);
  const hasP = hasPair(meCards3);

  // Monster3: 5以下3枚、全て別ランク
  if (maxVal <= 5 && !hasP) {
    return "Monster3";
  }

  // Good3: 8以下3枚、全て別ランク
  if (maxVal <= 8 && !hasP) {
    return "Good3";
  }

  // Okay3: 8以下2枚＋9以下1枚、または8以下3枚だがペア含み
  const lowCount8 = vals.filter((v) => v <= 8).length;
  const lowCount9 = vals.filter((v) => v <= 9).length;
  if (lowCount8 >= 2 && lowCount9 >= 3) {
    return "Okay3";
  }
  if (maxVal <= 8 && hasP) {
    return "Okay3";
  }

  // Bad3: それ以外
  return "Bad3";
};

// ============================================================
// Dead Cards評価
// ============================================================

/**
 * A〜5（車輪周辺）と6〜8のdead枚数をカウント
 */
export const countDeadLow = (
  deadRankCount: Record<Rank, number>,
): { deadA5: number; dead68: number } => {
  const A5_RANKS: Rank[] = ["A", "2", "3", "4", "5"];
  const RANKS_68: Rank[] = ["6", "7", "8"];

  let deadA5 = 0;
  for (const r of A5_RANKS) {
    deadA5 += deadRankCount[r] ?? 0;
  }

  let dead68 = 0;
  for (const r of RANKS_68) {
    dead68 += deadRankCount[r] ?? 0;
  }

  return { deadA5, dead68 };
};

// ============================================================
// ボード品質評価
// ============================================================

export interface BoardQuality {
  lowCount8: number; // 8以下の枚数
  highCount9: number; // 9以上の枚数（ブリック）
  pairPenalty: number; // ペア汚染ペナルティ
}

/**
 * ボード品質を評価（4th以降用）
 */
export const estimateBoardQuality = (cards: Card[]): BoardQuality => {
  const vals = cards.map((c) => lowValue(c.rank));
  const lowCount8 = vals.filter((v) => v <= 8).length;
  const highCount9 = vals.filter((v) => v >= 9).length;

  // ペアペナルティ計算
  const rankCounts = new Map<Rank, number>();
  for (const c of cards) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
  }
  let pairPenalty = 0;
  for (const count of rankCounts.values()) {
    if (count >= 2) {
      pairPenalty += count - 1;
    }
  }

  return { lowCount8, highCount9, pairPenalty };
};

// ============================================================
// スチール判定
// ============================================================

/**
 * 相手がスチールっぽいか判定
 * - 相手ドアが9以上 かつ 自分ドアがそれより低い
 */
export const isStealLikely = (opDoorRank: Rank, myDoorRank: Rank): boolean => {
  const opVal = lowValue(opDoorRank);
  const myVal = lowValue(myDoorRank);
  return opVal >= 9 && myVal < opVal;
};

// ============================================================
// 相手ボード汚れ度
// ============================================================

/**
 * 相手upボードの汚れ度をスコアリング（高いほど汚い）
 * - 9以上の枚数
 * - ペアの有無
 */
export const scoreOppBoardDirt = (opUpCards: Card[]): number => {
  if (opUpCards.length === 0) return 0;

  let score = 0;

  // 高牌の枚数
  const highCount = opUpCards.filter((c) => lowValue(c.rank) >= 9).length;
  score += highCount * 2;

  // ペアの有無
  const ranks = opUpCards.map((c) => c.rank);
  const hasP = new Set(ranks).size < ranks.length;
  if (hasP) score += 3;

  return score;
};

/**
 * 全相手の最悪（汚い）ボードスコアを取得
 */
export const getMaxOppDirt = (opponents: VisiblePlayer[]): number => {
  let max = 0;
  for (const opp of opponents) {
    max = Math.max(max, scoreOppBoardDirt(opp.up));
  }
  return max;
};

/**
 * 全相手の最良（クリーン）ボードを持つ相手のスコアを取得
 */
export const getMinOppDirt = (opponents: VisiblePlayer[]): number => {
  let min = Infinity;
  for (const opp of opponents) {
    if (opp.active) {
      min = Math.min(min, scoreOppBoardDirt(opp.up));
    }
  }
  return min === Infinity ? 0 : min;
};

// ============================================================
// 競合カウント
// ============================================================

/**
 * 3rd時点で自分より良い（低い）ドアを持つ相手の数をカウント
 */
export const countBetterDoors = (
  myDoorRank: Rank,
  opponents: VisiblePlayer[],
): number => {
  const myVal = lowValue(myDoorRank);
  let count = 0;
  for (const opp of opponents) {
    if (opp.active && opp.up.length > 0) {
      const oppDoorVal = lowValue(opp.up[0].rank);
      if (oppDoorVal < myVal) {
        count++;
      }
    }
  }
  return count;
};

/**
 * 全員が自分より悪い（高い）ドアか判定
 */
export const allOppsHaveWorseDoor = (
  myDoorRank: Rank,
  opponents: VisiblePlayer[],
): boolean => {
  const myVal = lowValue(myDoorRank);
  for (const opp of opponents) {
    if (opp.active && opp.up.length > 0) {
      const oppDoorVal = lowValue(opp.up[0].rank);
      if (oppDoorVal <= myVal) {
        return false;
      }
    }
  }
  return true;
};
