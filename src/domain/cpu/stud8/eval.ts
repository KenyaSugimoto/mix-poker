/**
 * Stud8 CPU Lv2: 評価関数群
 *
 * Hi/Lo両面評価、3rd品質分類、dead cards評価を実装。
 * 仕様: docs/cpu_Lv2/Stud8_実装指示書.md
 */

import type { Card, Rank } from "../../types";

// ============================================================
// 定数
// ============================================================

/** Stud8のランク値（Low用: A=1が最強のロー） */
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

/** Lo資格のある値（8以下） */
const isLowQualified = (v: number): boolean => v <= 8;

// ============================================================
// 3rd Street品質判定
// ============================================================

/** 3rdの品質評価（Stud8用） */
export type Quality3rdStud8 =
  | "Scoop3_Monster"
  | "Low3_Good"
  | "High3_Good"
  | "Marginal"
  | "Trash";

/**
 * 3枚のカードでペアがあるか判定
 */
const hasPair = (cards: Card[]): boolean => {
  const ranks = cards.map((c) => c.rank);
  return new Set(ranks).size < ranks.length;
};

/**
 * ペアのランクを取得（なければnull）
 */
const getPairRank = (cards: Card[]): Rank | null => {
  const rankCount = new Map<Rank, number>();
  for (const c of cards) {
    rankCount.set(c.rank, (rankCount.get(c.rank) ?? 0) + 1);
  }
  for (const [rank, count] of rankCount) {
    if (count >= 2) return rank;
  }
  return null;
};

/**
 * 3枚が3フラッシュか判定
 */
const is3Flush = (cards: Card[]): boolean => {
  if (cards.length < 3) return false;
  return cards.every((c) => c.suit === cards[0].suit);
};

/**
 * 3rdの品質を評価（Stud8用）
 */
export const classify3rdStud8 = (meCards3: Card[]): Quality3rdStud8 => {
  if (meCards3.length !== 3) return "Trash";

  const vals = meCards3.map((c) => lowValue(c.rank));
  const lowCount8 = vals.filter((v) => isLowQualified(v)).length;
  const hasP = hasPair(meCards3);
  const pairRank = getPairRank(meCards3);
  const hasAce = vals.includes(1);
  const maxVal = Math.max(...vals);
  const _minVal = Math.min(...vals);

  // Scoop3_Monster: HiもLoも両睨み
  // - A2x（x<=8）かつ3枚すべて別ランク
  // - A3x（x<=8）かつ3枚別ランク
  // - 低いペア（22-55）+ 低札（A-5含む）
  if (!hasP && hasAce) {
    const sorted = [...vals].sort((a, b) => a - b);
    // A2x (x<=8)
    if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] <= 8) {
      return "Scoop3_Monster";
    }
    // A3x (x<=8)
    if (sorted[0] === 1 && sorted[1] === 3 && sorted[2] <= 8) {
      return "Scoop3_Monster";
    }
  }

  // 低ペア＋低札（例：33A, 44A, 55A）
  if (hasP && pairRank) {
    const pairVal = lowValue(pairRank);
    // ペアが2-5
    if (pairVal >= 2 && pairVal <= 5) {
      // 残りの1枚が低い（8以下）
      const otherVals = vals.filter((v) => v !== pairVal);
      if (otherVals.length > 0 && otherVals.every((v) => isLowQualified(v))) {
        // Aが含まれていればさらに良い
        if (hasAce || otherVals.some((v) => v <= 5)) {
          return "Scoop3_Monster";
        }
      }
    }
  }

  // Low3_Good: 8以下3枚別ランク、またはA含む8以下2枚+9以下1枚
  if (!hasP && lowCount8 === 3) {
    return "Low3_Good";
  }
  if (!hasP && hasAce && lowCount8 >= 2 && maxVal <= 9) {
    return "Low3_Good";
  }

  // High3_Good: 99+ペア、3フラ/3ストレ
  if (hasP && pairRank) {
    const pairVal = lowValue(pairRank);
    if (pairVal >= 9) {
      return "High3_Good";
    }
  }
  // 高いペア（66-88）もHi寄り
  if (hasP && pairRank) {
    const pairVal = lowValue(pairRank);
    if (pairVal >= 6 && pairVal <= 8) {
      return "High3_Good";
    }
  }
  // 3フラッシュ
  if (is3Flush(meCards3)) {
    // High系としてカウント（Low札が多ければScoop寄りだが簡易化）
    return "High3_Good";
  }

  // Marginal: 片方のみ薄い
  // Low札が2枚、または弱いペアのみ
  if (lowCount8 >= 2) {
    return "Marginal";
  }
  if (hasP && pairRank) {
    return "Marginal";
  }

  // Trash: 両方薄い
  return "Trash";
};

// ============================================================
// Dead Cards評価
// ============================================================

export interface LowDeadCount {
  deadAto5: number; // A-5のdead枚数
  dead6to8: number; // 6-8のdead枚数
  penalty: number; // 重み付けペナルティ
}

/**
 * Low用のdead枚数と重み付けペナルティを計算
 */
export const countLowDead = (
  deadRankCount: Record<Rank, number>,
): LowDeadCount => {
  const A_5_RANKS: Rank[] = ["A", "2", "3", "4", "5"];
  const RANKS_6_8: Rank[] = ["6", "7", "8"];

  let deadAto5 = 0;
  for (const r of A_5_RANKS) {
    deadAto5 += deadRankCount[r] ?? 0;
  }

  let dead6to8 = 0;
  for (const r of RANKS_6_8) {
    dead6to8 += deadRankCount[r] ?? 0;
  }

  // penalty = 2*deadAto5 + 1*dead6to8
  const penalty = 2 * deadAto5 + dead6to8;

  return { deadAto5, dead6to8, penalty };
};

// ============================================================
// 相手意図推定
// ============================================================

/** 相手の意図タイプ */
export type OpponentIntent = "LO" | "HI";

/**
 * 相手のドアカードから意図を推定
 */
export const inferIntentFromDoor = (doorRank: Rank): OpponentIntent => {
  const val = lowValue(doorRank);
  return val <= 8 ? "LO" : "HI";
};

// ============================================================
// 現在地判定（4th以降用）
// ============================================================

/** プレイヤーの現在地（Role） */
export type PlayerRole = "SCOOPING" | "LO_ONLY" | "HI_ONLY" | "AIR";

/**
 * 自分のカードから現在地を推定
 */
export const inferRoleNow = (cards: Card[]): PlayerRole => {
  if (cards.length < 3) return "AIR";

  const vals = cards.map((c) => lowValue(c.rank));
  const lowCount8 = vals.filter((v) => isLowQualified(v)).length;
  const uniqueVals = new Set(vals);
  const hasP = uniqueVals.size < vals.length;

  // ペアチェック
  const rankCount = new Map<Rank, number>();
  for (const c of cards) {
    rankCount.set(c.rank, (rankCount.get(c.rank) ?? 0) + 1);
  }
  let pairCount = 0;
  let _highPair = false;
  for (const [rank, count] of rankCount) {
    if (count >= 2) {
      pairCount++;
      if (lowValue(rank) >= 9) _highPair = true;
    }
  }

  // Low見込み: 8以下が4枚以上あればLo資格の可能性高
  const lowPotential = lowCount8 >= 4;
  // Hi見込み: ペアがある
  const hiPotential = pairCount >= 1;

  // SCOOPING: HiもLoも現実的
  if (lowPotential && hiPotential) {
    return "SCOOPING";
  }

  // LO_ONLY: Loは現実的、Hiは薄い
  if (lowPotential && !hiPotential) {
    return "LO_ONLY";
  }

  // HI_ONLY: Hiは現実的、Loは薄い
  if (!lowPotential && hiPotential) {
    return "HI_ONLY";
  }

  // まだ4枚以下の場合の判定
  if (cards.length <= 4) {
    // 8以下が3枚以上→LO_ONLY寄り
    if (lowCount8 >= 3) {
      return "LO_ONLY";
    }
    // ペアあり→HI_ONLY寄り
    if (hasP) {
      return "HI_ONLY";
    }
  }

  // AIR: どちらも薄い
  return "AIR";
};

// ============================================================
// ボード評価（相手のup cards）
// ============================================================

/**
 * 相手ボードがLo完成に向かって強く見えるか
 * - 8以下の枚数が多い
 * - ペアがない
 */
export const isOppBoardLoStrong = (opUpCards: Card[]): boolean => {
  if (opUpCards.length === 0) return false;

  const vals = opUpCards.map((c) => lowValue(c.rank));
  const lowCount8 = vals.filter((v) => isLowQualified(v)).length;

  // ペアチェック
  const ranks = opUpCards.map((c) => c.rank);
  const hasP = new Set(ranks).size < ranks.length;

  // 8以下が多く、ペアなし
  return lowCount8 >= opUpCards.length - 1 && !hasP;
};

/**
 * 相手ボードがLoとして汚いか（ブリック/ペア/9以上混入）
 */
export const isOppBoardLoDirty = (opUpCards: Card[]): boolean => {
  if (opUpCards.length === 0) return false;

  const vals = opUpCards.map((c) => lowValue(c.rank));
  const highCount9 = vals.filter((v) => v >= 9).length;

  // ペアチェック
  const ranks = opUpCards.map((c) => c.rank);
  const hasP = new Set(ranks).size < ranks.length;

  return highCount9 >= 1 || hasP;
};

/**
 * 相手ボードがHi強そうか（オープンペア等）
 */
export const isOppBoardHiStrong = (opUpCards: Card[]): boolean => {
  if (opUpCards.length < 2) return false;

  // オープンペアチェック
  const ranks = opUpCards.map((c) => c.rank);
  const hasP = new Set(ranks).size < ranks.length;

  return hasP;
};
