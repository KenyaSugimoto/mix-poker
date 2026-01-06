/**
 * Razz専用 CPU Lv1 戦略
 *
 * アップカード比較ベースの戦略ロジック
 */

import type { Card } from "../types";
import { buildObservation, type CpuObservation } from "./observation";
import type { ActionType, CpuDecisionContext } from "./policy";

/**
 * ランクを数値に変換（Low用: A=1, K=13）
 */
const rankToNumber = (rank: Card["rank"]): number => {
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
 * カードが全て8以下かどうか判定
 */
const hasAll8OrBelow = (cards: Card[]): boolean => {
  return cards.every((c) => rankToNumber(c.rank) <= 8);
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
 * アップカードから最弱ランク（最大の数値）を取得
 */
const getWorstRank = (upCards: Card[]): number => {
  if (upCards.length === 0) return 0;
  return Math.max(...upCards.map((c) => rankToNumber(c.rank)));
};

/**
 * 全カードから2番目に弱いランク（2番目に大きい数値）を取得
 */
const getSecondWorstRank = (allCards: Card[]): number => {
  if (allCards.length < 2) return getWorstRank(allCards);
  const ranks = allCards.map((c) => rankToNumber(c.rank)).sort((a, b) => b - a);
  return ranks[1]; // 2番目に大きい値
};

/**
 * 自分のアップカードが全相手より強い（最弱ランクが小さい）か判定
 * ペアを考慮: 相手がペアなら自分が有利
 */
const isStrongerThanAllOpponents = (
  myUpCards: Card[],
  opponents: CpuObservation["players"],
): boolean => {
  const myHasPair = hasPair(myUpCards);
  const myWorst = getWorstRank(myUpCards);

  for (const opp of opponents) {
    if (!opp.active) continue;

    const oppHasPair = hasPair(opp.upCards);
    const oppWorst = getWorstRank(opp.upCards);

    // 相手がペアなら自分が有利
    if (oppHasPair && !myHasPair) continue;

    // 自分がペアなら自分が不利
    if (myHasPair && !oppHasPair) return false;

    // 両者ノーペアなら最弱札比較（数値が小さいほうが強い）
    if (myWorst >= oppWorst) return false;
  }

  return true;
};

/**
 * 相手の中にペアを持つプレイヤーがいるか
 */
const anyOpponentHasPair = (
  mySeat: number,
  players: CpuObservation["players"],
): boolean => {
  return players.some(
    (p) => p.seat !== mySeat && p.active && hasPair(p.upCards),
  );
};

/**
 * 全相手の中で最も弱いアップカード（最弱札の最小値）を取得
 */
const getOpponentBestWorstRank = (
  mySeat: number,
  players: CpuObservation["players"],
): number => {
  let bestWorst = 14; // 初期値は最大以上
  for (const p of players) {
    if (p.seat === mySeat || !p.active) continue;
    const worst = getWorstRank(p.upCards);
    if (worst < bestWorst) bestWorst = worst;
  }
  return bestWorst;
};

/**
 * Razz Lv1 意思決定ロジック
 */
export const decideRazzLv1 = (ctx: CpuDecisionContext): ActionType => {
  const { state, seat, allowedActions } = ctx;
  const obs = buildObservation(state, seat);
  const legal = allowedActions as ActionType[];

  // 選択肢が1つならそれを返す
  if (legal.length === 1) return legal[0];
  if (legal.length === 0) return "FOLD";

  const myAllCards = [...obs.me.downCards, ...obs.me.upCards];
  const myUpCards = obs.me.upCards;
  const opponents = obs.players.filter((p) => p.seat !== seat);
  const isBringInPlayer = obs.bringInIndex === seat;
  const isAll8OrBelow = hasAll8OrBelow(myAllCards);
  const myHasPair = hasPair(myAllCards);

  // === 3rd Street ===
  if (obs.street === "3rd") {
    // ブリングインプレイヤーの処理
    if (isBringInPlayer) {
      // 初回アクション: 無条件BRING_IN
      if (legal.includes("BRING_IN")) {
        return "BRING_IN";
      }

      // COMP後の対応
      if (obs.currentBet > obs.stakes.bringIn) {
        if (isAll8OrBelow && legal.includes("RAISE")) {
          return "RAISE";
        }
        if (legal.includes("CALL")) {
          return "CALL";
        }
      }
    }

    // 非ブリングインプレイヤーの処理
    if (!isBringInPlayer) {
      // COMPLETEがまだ入っていない場合（currentBet == bringIn）
      if (obs.currentBet === obs.stakes.bringIn) {
        // 後ろ全員より強いならCOMPLETE
        if (
          legal.includes("COMPLETE") &&
          isStrongerThanAllOpponents(myUpCards, opponents)
        ) {
          return "COMPLETE";
        }
        // それ以外はFOLD
        if (legal.includes("FOLD")) {
          return "FOLD";
        }
      }

      // COMPLETEが入っている場合（currentBet > bringIn）
      if (obs.currentBet > obs.stakes.bringIn) {
        // 8以下3枚ならRAISE（またはCALL）
        if (isAll8OrBelow) {
          if (legal.includes("RAISE")) return "RAISE";
          if (legal.includes("CALL")) return "CALL";
        }
        // それ以外はFOLD
        if (legal.includes("FOLD")) {
          return "FOLD";
        }
      }
    }
  }

  // === 4th Street ===
  if (obs.street === "4th") {
    // BET判定（currentBet == 0）
    if (obs.currentBet === 0) {
      if (legal.includes("BET")) {
        // 自分がペアならBETしない
        if (myHasPair) {
          if (legal.includes("CHECK")) return "CHECK";
        } else {
          // 相手にペアがあればBET
          if (anyOpponentHasPair(seat, obs.players)) {
            return "BET";
          }
          // 両者ノーペアなら最弱札比較
          if (isStrongerThanAllOpponents(myUpCards, opponents)) {
            return "BET";
          }
        }
      }
      if (legal.includes("CHECK")) return "CHECK";
    }

    // CALL判定（currentBet > 0）
    if (obs.currentBet > 0) {
      // 自分ノーペアなら無条件CALL
      if (!myHasPair && legal.includes("CALL")) {
        return "CALL";
      }
      // ペアありでもCALL（4thは優しめ）
      if (legal.includes("CALL")) return "CALL";
      if (legal.includes("FOLD")) return "FOLD";
    }
  }

  // === 5th Street 以降 ===
  if (obs.street === "5th" || obs.street === "6th" || obs.street === "7th") {
    // BET判定（currentBet == 0）
    if (obs.currentBet === 0) {
      if (legal.includes("BET")) {
        // 自分がペアならBETしない
        if (myHasPair) {
          if (legal.includes("CHECK")) return "CHECK";
        } else {
          // 相手にペアがあればBET
          if (anyOpponentHasPair(seat, obs.players)) {
            return "BET";
          }
          // 両者ノーペアなら最弱札比較
          if (isStrongerThanAllOpponents(myUpCards, opponents)) {
            return "BET";
          }
        }
      }
      if (legal.includes("CHECK")) return "CHECK";
    }

    // CALL/FOLD判定（currentBet > 0）
    if (obs.currentBet > 0) {
      // 自分ペアあり + bet受けた → FOLD
      if (myHasPair) {
        if (legal.includes("FOLD")) return "FOLD";
      }

      // 自分2番目弱札 vs 相手最弱アップカード
      const mySecondWorst = getSecondWorstRank(myAllCards);
      const oppBestWorst = getOpponentBestWorstRank(seat, obs.players);

      // 自分の2番目弱札が相手の最弱札より弱い（数値が大きい）→ FOLD
      if (mySecondWorst > oppBestWorst) {
        if (legal.includes("FOLD")) return "FOLD";
      }

      // それ以外 → CALL
      if (legal.includes("CALL")) return "CALL";
      if (legal.includes("FOLD")) return "FOLD";
    }
  }

  // === フォールバック ===
  if (legal.includes("CHECK")) return "CHECK";
  if (legal.includes("CALL")) return "CALL";
  if (legal.includes("BRING_IN")) return "BRING_IN";
  if (legal.includes("FOLD")) return "FOLD";

  return legal[0];
};
