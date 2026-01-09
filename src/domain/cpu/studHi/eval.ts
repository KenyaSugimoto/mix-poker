/**
 * Stud Hi CPU Lv2: 評価関数群
 *
 * 3rd Tier判定、Threat、Live、Category判定を実装。
 * 仕様: docs/cpu_Lv2/StudHi_CPU戦略_実装指示書.md
 */

import type { Card, Rank, Suit } from "../../types";
import type {
  Category,
  LiveGrade,
  Tier3rd,
  VisiblePlayer,
} from "./visibleContext";

// ============================================================
// 定数
// ============================================================

/** ランクを数値に変換（High用: A=14） */
const RANK_VALUE: Record<Rank, number> = {
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
  A: 14,
};

/** ランクを数値化 */
export const rankValue = (r: Rank): number => RANK_VALUE[r];

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * カード配列からランクごとの枚数をカウント（ローカル用）
 */
const countByRank = (cards: Card[]): Record<Rank, number> => {
  const init = Object.fromEntries(
    Object.keys(RANK_VALUE).map((r) => [r, 0]),
  ) as Record<Rank, number>;
  for (const c of cards) {
    init[c.rank] += 1;
  }
  return init;
};

/**
 * 同じスートの最大枚数を取得
 */
const maxSameSuit = (cards: Card[]): number => {
  const m = new Map<Suit, number>();
  for (const c of cards) {
    m.set(c.suit, (m.get(c.suit) ?? 0) + 1);
  }
  return Math.max(0, ...Array.from(m.values()));
};

/**
 * 3枚で連結度が高いか判定（ギャップ合計<=3を"近接"とみなす）
 */
const isThreeStraightish = (cards: Card[]): boolean => {
  if (cards.length !== 3) return false;
  const vals = cards.map((c) => rankValue(c.rank)).sort((a, b) => a - b);
  const gap1 = vals[1] - vals[0];
  const gap2 = vals[2] - vals[1];
  // 連結〜1gap程度: 各ギャップが1以上で、合計が3以下
  return gap1 >= 1 && gap2 >= 1 && gap1 + gap2 <= 3;
};

/**
 * 4枚で4ストレート（連結度が高い）か判定
 */
const isFourStraightish = (cards: Card[]): boolean => {
  if (cards.length < 4) return false;

  const ranks = cards.map((c) => rankValue(c.rank));
  const unique = [...new Set(ranks)].sort((a, b) => a - b);

  // A-2-3-4 の場合も考慮（A=14 だが A-low として 1 も扱う）
  const withAceLow = unique.includes(14) ? [...unique, 1] : unique;
  const sortedWithAce = [...new Set(withAceLow)].sort((a, b) => a - b);

  // 4枚連続 or 1-gap を探す
  for (let i = 0; i <= sortedWithAce.length - 4; i++) {
    let gapCount = 0;
    for (let j = 0; j < 3; j++) {
      const diff = sortedWithAce[i + j + 1] - sortedWithAce[i + j];
      if (diff === 1) continue;
      if (diff === 2) gapCount++;
      else {
        gapCount = 99;
        break;
      }
    }
    if (gapCount <= 1) return true;
  }
  return false;
};

/**
 * 3枚のカードで最も多いスートを取得
 */
const getFlushSuit = (cards: Card[]): Suit | null => {
  const m = new Map<Suit, number>();
  for (const c of cards) {
    m.set(c.suit, (m.get(c.suit) ?? 0) + 1);
  }
  for (const [suit, count] of m.entries()) {
    if (count >= 3) return suit;
  }
  return null;
};

// ============================================================
// 3rd Street Tier判定
// ============================================================

/**
 * 3rd StreetのTier評価（S/A/B/C/D）
 *
 * @param meCards3 - 自分のカード（down2 + up1 = 3枚）
 * @param deadRankCount - デッドカードのランク別カウント
 * @param deadSuitCount - デッドカードのスート別カウント
 * @returns Tier3rd
 */
export const evalTier3rd = (
  meCards3: Card[],
  _deadRankCount: Record<Rank, number>,
  deadSuitCount: Record<Suit, number>,
): Tier3rd => {
  if (meCards3.length !== 3) {
    // 3枚でない場合はフォールバック
    return "D";
  }

  const byRank = countByRank(meCards3);
  const ranks = Object.keys(byRank) as Rank[];

  // 1. Trips判定
  const hasTrips = ranks.some((r) => byRank[r] === 3);
  if (hasTrips) return "S";

  // 2. ペア判定
  const pairRank = ranks.find((r) => byRank[r] === 2);
  if (pairRank) {
    const v = rankValue(pairRank);
    if (v >= 11) return "S"; // JJ+
    if (v >= 7) return "A"; // 77–TT
    return "B"; // 22–66
  }

  // 3. 3-flush判定
  const suitMax = maxSameSuit(meCards3);
  if (suitMax === 3) {
    const suit = getFlushSuit(meCards3);
    const deadSuit = suit ? (deadSuitCount[suit] ?? 0) : 0;

    // A/K/Q を含むなら上位
    const high = Math.max(...meCards3.map((c) => rankValue(c.rank)));
    const base: Tier3rd = high >= 12 ? "A" : "B"; // Q以上含む→A

    // Live判定: deadSuit >= 3 なら2段階降格
    if (deadSuit >= 3) return "C";
    if (deadSuit === 2 && base === "A") return "B";
    return base;
  }

  // 4. 3-straight-ish判定
  if (isThreeStraightish(meCards3)) {
    const high = Math.max(...meCards3.map((c) => rankValue(c.rank)));
    return high >= 11 ? "A" : "B"; // J以上を含むならA
  }

  // 5. 高ドア単体
  const doorHigh = Math.max(...meCards3.map((c) => rankValue(c.rank)));
  if (doorHigh >= 11) return "C"; // J/Q/K/A
  return "D";
};

// ============================================================
// 4th〜7th Category判定
// ============================================================

/**
 * Category評価（M/D/N）
 *
 * @param meCards - 自分のカード（down + up 全て）
 * @param _deadRankCount - デッドカードのランク別カウント（将来拡張用）
 * @param _deadSuitCount - デッドカードのスート別カウント（将来拡張用）
 * @returns Category
 */
export const evalCategory = (
  meCards: Card[],
  _deadRankCount: Record<Rank, number>,
  _deadSuitCount: Record<Suit, number>,
): Category => {
  const byRank = countByRank(meCards);
  const ranks = Object.keys(byRank) as Rank[];

  // Made: ペア以上が確定
  const hasPair = ranks.some((r) => byRank[r] >= 2);
  if (hasPair) return "M";

  // Draw: 4フラ or 4ストレ
  const suitMax = maxSameSuit(meCards);
  if (suitMax >= 4) return "D";
  if (isFourStraightish(meCards)) return "D";

  // Nothing
  return "N";
};

// ============================================================
// Threat（相手ボード圧）
// ============================================================

/**
 * 単一相手のupCardsからThreatスコアを計算
 */
export const scoreThreatForUp = (up: Card[]): number => {
  if (up.length === 0) return 0;
  let score = 0;

  // ランク・スート別カウント
  const byRank = new Map<Rank, number>();
  const bySuit = new Map<Suit, number>();
  for (const c of up) {
    byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1);
    bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + 1);
  }

  // オープンペア +5
  const hasOpenPair = Array.from(byRank.values()).some((v) => v >= 2);
  if (hasOpenPair) score += 5;

  // フラッシュ判定
  const maxSuit = Math.max(0, ...Array.from(bySuit.values()));
  if (maxSuit === 3) score += 4;
  if (maxSuit >= 4) score += 6;

  // A high pressure
  if (up.some((c) => c.rank === "A")) score += 2;
  const highCount = up.filter((c) => ["K", "Q"].includes(c.rank)).length;
  if (highCount >= 2) score += 1;

  // ストレート判定（連結3枚以上なら加点）
  const vals = up.map((c) => rankValue(c.rank)).sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] === vals[i - 1] + 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run === 3) score += 4;
    if (run === 4) score += 6;
  }

  return Math.min(score, 10);
};

/**
 * 全相手からThreatスコアを計算（最大値を採用）
 */
export const scoreThreat = (opponents: VisiblePlayer[]): number => {
  let max = 0;
  for (const o of opponents) {
    max = Math.max(max, scoreThreatForUp(o.up));
  }
  return max;
};

// ============================================================
// Live判定
// ============================================================

/**
 * フラッシュドローのLive判定
 */
export const liveForFlushSuit = (
  suit: Suit,
  deadSuitCount: Record<Suit, number>,
): LiveGrade => {
  const dead = deadSuitCount[suit] ?? 0;
  if (dead <= 1) return "GOOD";
  if (dead === 2) return "OK";
  return "BAD"; // >=3
};

/**
 * ペア改善のLive判定
 */
export const liveForPairImprove = (
  pairRank: Rank,
  deadRankCount: Record<Rank, number>,
): LiveGrade => {
  const dead = deadRankCount[pairRank] ?? 0;
  if (dead === 0) return "GOOD";
  if (dead === 1) return "OK";
  return "BAD"; // >=2
};

/**
 * ストレートドローのLive判定（必要ランクを指定）
 */
export const liveForStraight = (
  neededRanks: Rank[],
  deadRankCount: Record<Rank, number>,
): LiveGrade => {
  let maxDead = 0;
  for (const r of neededRanks) {
    maxDead = Math.max(maxDead, deadRankCount[r] ?? 0);
  }
  if (maxDead === 0) return "GOOD";
  if (maxDead === 1) return "OK";
  return "BAD"; // >=2
};
