import { evaluateStudHi, groupByRank } from "../showdown/resolveShowdown";
import type { Card } from "../types";
import type { CpuObservation } from "./observation";
import { HAND_RANK_SCORES } from "./params";

/**
 * ランクを数値に変換（High用 - A=14）
 */
const rankToNumberHigh = (rank: Card["rank"]): number => {
  const map: Record<Card["rank"], number> = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    T: 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
  };
  return map[rank];
};

/**
 * ランクを数値に変換（Low用 - A=1）
 */
const rankToNumberLow = (rank: Card["rank"]): number => {
  const map: Record<Card["rank"], number> = {
    A: 1,
    K: 13,
    Q: 12,
    J: 11,
    T: 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
  };
  return map[rank];
};

/**
 * 自分の既知カード（downCards + upCards）を取得
 */
const getMeKnownCards = (obs: CpuObservation): Card[] => {
  return [...obs.me.downCards, ...obs.me.upCards];
};

/**
 * 全員のupCardsを取得（自分を除く）
 */
const getOppUpCards = (obs: CpuObservation): Card[] => {
  return obs.players
    .filter((p) => p.seat !== obs.me.seat)
    .flatMap((p) => p.upCards);
};

/**
 * 4-flushかどうか判定（同スート4枚以上）
 */
const has4Flush = (cards: Card[]): boolean => {
  const suitCounts = new Map<string, number>();
  for (const card of cards) {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1);
  }
  return Array.from(suitCounts.values()).some((count) => count >= 4);
};

/**
 * 4-straightかどうか判定（連番に近い4枚）
 */
const has4Straight = (cards: Card[]): boolean => {
  const ranks = cards.map((c) => rankToNumberHigh(c.rank));
  const unique = [...new Set(ranks)].sort((a, b) => a - b);

  // A-2-3-4 の場合も考慮（A=14 だが A-low として 1 も扱う）
  const withAceLow = unique.includes(14) ? [...unique, 1] : unique;
  const sortedWithAce = [...new Set(withAceLow)].sort((a, b) => a - b);

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
 * 相手のupCardsにペアが見えるかどうか
 */
const oppHasVisiblePair = (oppUp: Card[]): boolean => {
  const rankGroups = groupByRank(oppUp);
  return Array.from(rankGroups.values()).some((cards) => cards.length >= 2);
};

/**
 * Stud Hi 用スコア計算（0..100）
 */
export const calcStudHiScore = (obs: CpuObservation): number => {
  const meKnown = getMeKnownCards(obs);
  const oppUp = getOppUpCards(obs);

  // 既知カードから役を評価
  const handResult = evaluateStudHi(meKnown);
  const madeScore = HAND_RANK_SCORES[handResult.rank] ?? 50;

  // ドロー点
  let drawScore = 0;
  if (has4Flush(meKnown)) drawScore += 10;
  if (has4Straight(meKnown)) drawScore += 8;

  // ライブ度ペナルティ（相手upに同スートが多い場合減点）
  let livePenalty = 0;
  if (has4Flush(meKnown)) {
    const mySuit = meKnown.find((_, i, arr) => {
      const suit = arr[i].suit;
      return arr.filter((c) => c.suit === suit).length >= 4;
    })?.suit;
    if (mySuit) {
      const oppSameSuit = oppUp.filter((c) => c.suit === mySuit).length;
      livePenalty += Math.min(6, oppSameSuit);
    }
  }

  // 相手脅威ペナルティ
  let boardThreatPenalty = 0;
  if (oppHasVisiblePair(oppUp)) {
    boardThreatPenalty += 8;
  }
  // 高札ペナルティ（A/K/Qが2枚以上見える）
  const highCards = oppUp.filter((c) =>
    ["A", "K", "Q"].includes(c.rank),
  ).length;
  if (highCards >= 2) {
    boardThreatPenalty += 4;
  }

  const score = madeScore + drawScore - livePenalty - boardThreatPenalty;
  return Math.max(0, Math.min(100, score));
};

/**
 * Razz 用スコア計算（0..100）
 * 低いハンドほど強い → 高スコアに正規化
 */
export const calcRazzScore = (obs: CpuObservation): number => {
  const meKnown = getMeKnownCards(obs);
  const oppUp = getOppUpCards(obs);

  // 低札のユニーク枚数（8以下）
  const uniqueLowRanks = new Set(
    meKnown.map((c) => rankToNumberLow(c.rank)).filter((r) => r <= 8),
  );
  const lowUniqueCount = uniqueLowRanks.size;

  // ペア数
  const rankGroups = groupByRank(meKnown);
  const pairCount = Array.from(rankGroups.values()).filter(
    (cards) => cards.length >= 2,
  ).length;

  // 高札混入数（9以上）
  const highCount = meKnown.filter((c) => rankToNumberLow(c.rank) >= 9).length;

  // 最悪ランク
  const worstRank = Math.max(...meKnown.map((c) => rankToNumberLow(c.rank)));

  // 基本スコア計算
  let base = 50;
  base += lowUniqueCount * 10; // 最大 +50
  base -= pairCount * 12;
  base -= highCount * 8;
  base -= Math.max(0, worstRank - 8) * 2;

  // 相手の低札脅威
  const oppLowThreat = oppUp.filter((c) => rankToNumberLow(c.rank) <= 5).length;
  base -= Math.min(10, oppLowThreat * 2);

  return Math.max(0, Math.min(100, base));
};

/**
 * Stud8 用スコア計算（0..100）
 * High と Low の両面を評価して合成
 */
export const calcStud8Score = (obs: CpuObservation): number => {
  const meKnown = getMeKnownCards(obs);

  // High スコア（StudHi ベース）
  const highScore = calcStudHiScore(obs);

  // Low スコア計算
  const uniqueLowRanks = new Set(
    meKnown.map((c) => rankToNumberLow(c.rank)).filter((r) => r <= 8),
  );
  const lowUniqueCount = uniqueLowRanks.size;

  const rankGroups = groupByRank(meKnown);
  const pairCount = Array.from(rankGroups.values()).filter(
    (cards) => cards.length >= 2,
  ).length;

  const highCount = meKnown.filter((c) => rankToNumberLow(c.rank) >= 9).length;

  const worstRank = Math.max(...meKnown.map((c) => rankToNumberLow(c.rank)));

  let lowBase = 40;
  lowBase += lowUniqueCount * 12;
  lowBase -= pairCount * 12;
  lowBase -= highCount * 10;
  lowBase -= Math.max(0, worstRank - 8) * 3;
  const lowScore = Math.max(0, Math.min(100, lowBase));

  // 合成スコア
  let score = 0.55 * highScore + 0.45 * lowScore;

  // スクープ可能性ボーナス
  if (highScore >= 70 && lowScore >= 70) {
    score += 6;
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * ゲームタイプに応じたスコアを計算
 */
export const calcHandScore = (obs: CpuObservation): number => {
  switch (obs.gameType) {
    case "studHi":
      return calcStudHiScore(obs);
    case "razz":
      return calcRazzScore(obs);
    case "stud8":
      return calcStud8Score(obs);
    default:
      return 50; // フォールバック
  }
};
