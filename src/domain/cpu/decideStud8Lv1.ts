/**
 * Stud8専用 CPU Lv1 戦略
 *
 * High/Low両面を考慮した戦略ロジック
 */

import { groupByRank } from "../showdown/resolveShowdown";
import type { Card } from "../types";
import { buildObservation, type CpuObservation } from "./observation";
import type { ActionType, CpuDecisionContext } from "./policy";
import { calcStud8Score, calcStudHiScore } from "./scoring";

/**
 * ランクを数値に変換（Low用: A=1）
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
 * カードが全て8以下かどうか判定
 */
const hasAll8OrBelow = (cards: Card[]): boolean => {
  return cards.every((c) => rankToNumberLow(c.rank) <= 8);
};

/**
 * ペアがあるかどうか判定
 */
const hasPair = (cards: Card[]): boolean => {
  const ranks = cards.map((c) => c.rank);
  const rankSet = new Set(ranks);
  return rankSet.size < ranks.length;
};

/**
 * ハイカード(9+)の枚数を取得
 */
const countHighCards = (cards: Card[]): number => {
  return cards.filter((c) => rankToNumberLow(c.rank) >= 9).length;
};

/**
 * Low完成可能性判定
 * - 現在の8以下のユニークランク数と残りカード枚数から判定
 * - 最低2枚の8以下が必要
 */
const hasLowPotential = (cards: Card[]): boolean => {
  const uniqueLowRanks = new Set(
    cards.map((c) => rankToNumberLow(c.rank)).filter((r) => r <= 8),
  );
  const cardsRemaining = 7 - cards.length;
  const lowCardsNeeded = 5 - uniqueLowRanks.size;
  // 残りカードで必要枚数を引ける可能性があり、かつ現在2枚以上の8以下がある
  return lowCardsNeeded <= cardsRemaining && uniqueLowRanks.size >= 2;
};

/**
 * 相手全員がハイカードのみ（upcard全て9+）か判定
 */
const allOpponentsHighOnly = (
  mySeat: number,
  players: CpuObservation["players"],
): boolean => {
  const opponents = players.filter((p) => p.seat !== mySeat && p.active);
  if (opponents.length === 0) return false;

  return opponents.every((p) =>
    p.upCards.every((c) => rankToNumberLow(c.rank) >= 9),
  );
};

/**
 * Big Bet Street かどうか（5th以降）
 */
const isBigBetStreet = (street: string): boolean => {
  return street === "5th" || street === "6th" || street === "7th";
};

/**
 * High/Lowスコア計算（スクープ判定用）
 */
const calcHighLowScores = (
  obs: CpuObservation,
): { highScore: number; lowScore: number } => {
  const meKnown = getMeKnownCards(obs);

  // High スコア
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

  return { highScore, lowScore };
};

/**
 * Stud8 Lv1 意思決定ロジック
 */
export const decideStud8Lv1 = (
  ctx: CpuDecisionContext,
  rng: () => number = Math.random,
): ActionType => {
  const { state, seat, allowedActions } = ctx;
  const obs = buildObservation(state, seat);
  const legal = allowedActions as ActionType[];

  // 選択肢が1つならそれを返す
  if (legal.length === 1) return legal[0];
  if (legal.length === 0) return "FOLD";

  const myAllCards = getMeKnownCards(obs);
  const isBringInPlayer = obs.bringInIndex === seat;
  const isAll8OrBelow = hasAll8OrBelow(myAllCards);
  const myHasPair = hasPair(myAllCards);
  const highCardCount = countHighCards(myAllCards);
  const lowPotential = hasLowPotential(myAllCards);
  const opponentsHighOnly = allOpponentsHighOnly(seat, obs.players);

  // スコア計算
  const { highScore, lowScore } = calcHighLowScores(obs);
  const combinedScore = calcStud8Score(obs);
  const isScoopPotential = highScore >= 70 && lowScore >= 70;

  // === 3rd Street ===
  if (obs.street === "3rd") {
    // ブリングインプレイヤー: 常にBRING_IN
    if (isBringInPlayer && legal.includes("BRING_IN")) {
      return "BRING_IN";
    }

    // ルール2: 3枚全て8以下ならCOMPLETE
    if (isAll8OrBelow && legal.includes("COMPLETE")) {
      return "COMPLETE";
    }

    // COMPLETE後の対応（currentBet > bringIn）
    if (obs.currentBet > obs.stakes.bringIn) {
      // 3枚全て8以下ならRAISEまたはCALL
      if (isAll8OrBelow) {
        if (legal.includes("RAISE") && rng() < 0.5) {
          return "RAISE";
        }
        if (legal.includes("CALL")) return "CALL";
      }

      // ルール1: Low可能性があればCALL
      if (lowPotential && legal.includes("CALL")) {
        return "CALL";
      }

      // それ以外はFOLD
      if (legal.includes("FOLD")) return "FOLD";
    }

    // bringInのみの状態：Low可能性があればCALL、なければFOLD
    if (obs.currentBet === obs.stakes.bringIn) {
      if (lowPotential && legal.includes("CALL")) {
        return "CALL";
      }
      if (legal.includes("FOLD")) return "FOLD";
    }
  }

  // === 4th Street 以降 ===

  // currentBet == 0 の処理（CHECK / BET）
  if (obs.currentBet === 0) {
    // ルール4: 相手全員9+ならアグレッシブにBET
    if (opponentsHighOnly && legal.includes("BET")) {
      return "BET";
    }

    // ルール5: 5th以降でペアがあればやや強気でBET
    if (isBigBetStreet(obs.street) && myHasPair && legal.includes("BET")) {
      if (combinedScore >= 50 && rng() < 0.6) {
        return "BET";
      }
    }

    // ルール6: スクープ可能性が高ければBET
    if (isScoopPotential && legal.includes("BET")) {
      return "BET";
    }

    // 通常のBET判定
    if (legal.includes("BET") && combinedScore >= 65) {
      return "BET";
    }

    // CHECK
    if (legal.includes("CHECK")) return "CHECK";
  }

  // currentBet > 0 の処理（CALL / RAISE / FOLD）
  if (obs.currentBet > 0) {
    // ルール3: ハイカード3枚以上でフォールド傾向強化
    if (highCardCount >= 3) {
      // Low可能性がもうない場合はFOLD傾向
      if (!lowPotential && legal.includes("FOLD")) {
        // ただしHighスコアが高ければ粘る
        if (highScore < 60) {
          return "FOLD";
        }
      }
    }

    // ルール4: 相手全員9+ならアグレッシブにRAISE
    if (opponentsHighOnly) {
      if (legal.includes("RAISE") && rng() < 0.7) {
        return "RAISE";
      }
      if (legal.includes("CALL")) return "CALL";
    }

    // ルール6: スクープ可能性が高ければRAISE頻度UP
    if (isScoopPotential && legal.includes("RAISE")) {
      if (rng() < 0.6) {
        return "RAISE";
      }
    }

    // ルール5: 5th以降でペアがあればやや強気
    if (isBigBetStreet(obs.street) && myHasPair) {
      if (legal.includes("CALL")) return "CALL";
    }

    // ルール1: Low可能性があればCALL
    if (lowPotential && legal.includes("CALL")) {
      return "CALL";
    }

    // 通常のFOLD判定
    if (legal.includes("FOLD") && combinedScore < 40) {
      return "FOLD";
    }

    // CALL
    if (legal.includes("CALL")) return "CALL";

    // フォールバック: FOLD
    if (legal.includes("FOLD")) return "FOLD";
  }

  // === フォールバック ===
  if (legal.includes("CHECK")) return "CHECK";
  if (legal.includes("CALL")) return "CALL";
  if (legal.includes("BRING_IN")) return "BRING_IN";
  if (legal.includes("FOLD")) return "FOLD";

  return legal[0];
};
