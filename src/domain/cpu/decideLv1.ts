import { decideRazzLv1 } from "./decideRazzLv1";
import { decideStud8Lv1 } from "./decideStud8Lv1";
import { buildObservation } from "./observation";
import {
  type CpuParamsLv1,
  DEFAULT_PARAMS_LV1,
  STREET_THRESHOLDS,
} from "./params";
import type { ActionType, CpuDecisionContext } from "./policy";
import { calcHandScore } from "./scoring";

/**
 * ActionType のフィルタ用セット
 */
const ACTION_TYPES: Set<string> = new Set([
  "POST_ANTE",
  "BRING_IN",
  "COMPLETE",
  "BET",
  "RAISE",
  "CALL",
  "CHECK",
  "FOLD",
]);

/**
 * allowedActions を ActionType[] にフィルタ
 */
const filterToActionTypes = (allowedActions: string[]): ActionType[] => {
  return allowedActions.filter((a): a is ActionType => ACTION_TYPES.has(a));
};

/**
 * Big Bet Street かどうか（5th以降）
 */
const isBigBetStreet = (street: string): boolean => {
  return street === "5th" || street === "6th" || street === "7th";
};

/**
 * 要求スコア（requiredScore）を計算
 */
const calcRequiredScore = (
  obs: ReturnType<typeof buildObservation>,
  params: CpuParamsLv1,
): number => {
  const baseRequired = 50;
  let required = baseRequired;

  // tightness補正
  required += params.tightness * 10;

  // マルチウェイ補正
  const numActive = obs.players.filter((p) => p.active).length;
  const multiway = Math.max(0, numActive - 2);
  required += params.multiwayPenalty * 10 * multiway;

  // Big Bet補正
  if (isBigBetStreet(obs.street)) {
    required += params.bigBetFear * 15;
  }

  // 圧力補正（raiseCount）
  required += obs.raiseCount * 5;

  return required;
};

/**
 * toCall（コールに必要な額）を計算
 */
const calcToCall = (obs: ReturnType<typeof buildObservation>): number => {
  return obs.currentBet - obs.me.committedThisStreet;
};

/**
 * betUnit（コストの基準単位）を取得
 */
const calcBetUnit = (obs: ReturnType<typeof buildObservation>): number => {
  return isBigBetStreet(obs.street) ? obs.stakes.bigBet : obs.stakes.smallBet;
};

/**
 * toCallWeight（コストの重さ）を計算
 */
const calcToCallWeight = (obs: ReturnType<typeof buildObservation>): number => {
  const betUnit = calcBetUnit(obs);
  if (betUnit === 0) return 0;
  return calcToCall(obs) / betUnit;
};

/**
 * ドロースコアを取得（セミブラフ判定用）
 * scoring.ts の内部ロジックを簡易的に再利用
 */
const getDrawScore = (obs: ReturnType<typeof buildObservation>): number => {
  const meKnown = [...obs.me.downCards, ...obs.me.upCards];

  // 4-flush check
  const suitCounts = new Map<string, number>();
  for (const card of meKnown) {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1);
  }
  const has4Flush = Array.from(suitCounts.values()).some((count) => count >= 4);

  // 簡易的なドロースコア
  let drawScore = 0;
  if (has4Flush) drawScore += 10;

  return drawScore;
};

/**
 * Lv1 CPU の意思決定ロジック
 *
 * @param ctx - CpuDecisionContext
 * @param rng - 乱数生成関数（デフォルト: Math.random）
 * @param params - CPUパラメータ（デフォルト: DEFAULT_PARAMS_LV1）
 * @returns ActionType
 */
export const decideLv1 = (
  ctx: CpuDecisionContext,
  rng: () => number = Math.random,
  params: CpuParamsLv1 = DEFAULT_PARAMS_LV1,
): ActionType => {
  // 1. allowedActions を ActionType[] にフィルタ
  const legal = filterToActionTypes(ctx.allowedActions as string[]);

  // 例外: 選択肢が1つならそれを返す
  if (legal.length === 1) {
    return legal[0];
  }

  // 選択肢がない場合のフォールバック
  if (legal.length === 0) {
    return "FOLD";
  }

  // 2. Observation を生成
  const obs = buildObservation(ctx.state, ctx.seat);

  // Razz専用戦略を使用
  if (obs.gameType === "razz") {
    return decideRazzLv1(ctx);
  }

  // Stud8専用戦略を使用
  if (obs.gameType === "stud8") {
    return decideStud8Lv1(ctx, rng);
  }

  // 3. ハンドスコアを計算
  const handScore = calcHandScore(obs);
  console.log("handScore: ", handScore);

  // 4. 要求スコアを計算
  const required = calcRequiredScore(obs, params);
  const requiredDelta = required - 50;

  // 5. ストリート別閾値を取得
  const thresholds = STREET_THRESHOLDS[obs.street];

  // 6. 状況特徴量
  const toCallWeight = calcToCallWeight(obs);
  const numActive = obs.players.filter((p) => p.active).length;
  const drawScore = getDrawScore(obs);

  // === 3rdストリート処理 ===
  if (obs.street === "3rd") {
    // ブリングインプレイヤーの初回アクション: 常にBRING_IN
    if (legal.includes("BRING_IN")) {
      return "BRING_IN";
    }

    // 非ブリングインプレイヤー: COMPLETE判定（閾値以上の場合）
    if (legal.includes("COMPLETE")) {
      const completeThreshold = thresholds.completeThreshold;
      if (handScore >= completeThreshold) {
        return "COMPLETE";
      }
    }

    // 3rdでcurrentBet > 0の場合は通常のCALL/FOLD/RAISE判定へ
  }

  // === currentBet == 0 の処理（CHECK / BET） ===
  if (obs.currentBet === 0) {
    // セミブラフ判定
    const canSemiBluff =
      legal.includes("BET") &&
      numActive <= 3 &&
      !isBigBetStreet(obs.street) &&
      drawScore >= 8 &&
      rng() < params.semiBluffFreq;

    if (canSemiBluff) {
      return "BET";
    }

    // 通常のBET判定
    if (legal.includes("BET")) {
      const betThreshold = thresholds.betThreshold + requiredDelta;
      if (handScore >= betThreshold) {
        return "BET";
      }
    }

    // CHECK
    if (legal.includes("CHECK")) {
      return "CHECK";
    }
  }

  // === currentBet > 0 の処理（CALL / RAISE / FOLD） ===
  if (obs.currentBet > 0) {
    // FOLD判定（弱いハンド + 高コスト）
    if (legal.includes("FOLD")) {
      const foldThreshold = thresholds.foldThreshold + requiredDelta;
      if (handScore < foldThreshold && toCallWeight > 0.5) {
        return "FOLD";
      }
    }

    // RAISE判定（強いハンド）
    if (legal.includes("RAISE")) {
      const raiseThreshold = thresholds.raiseThreshold + requiredDelta;
      const aggressionAdjusted = params.aggression * params.raiseChanceAdjust; // 抑制気味
      if (handScore >= raiseThreshold && rng() < aggressionAdjusted) {
        return "RAISE";
      }
    }

    // CALL
    if (legal.includes("CALL")) {
      return "CALL";
    }

    // フォールバック: FOLD（ただしFOLDがなければCHECK）
    if (legal.includes("FOLD")) {
      return "FOLD";
    }
  }

  // === フォールバック ===
  // 優先度順: CHECK > CALL > BRING_IN > COMPLETE > BET > RAISE > FOLD
  if (legal.includes("CHECK")) return "CHECK";
  if (legal.includes("CALL")) return "CALL";
  if (legal.includes("BRING_IN")) return "BRING_IN";
  if (legal.includes("COMPLETE")) return "COMPLETE";
  if (legal.includes("BET")) return "BET";
  if (legal.includes("RAISE")) return "RAISE";
  if (legal.includes("FOLD")) return "FOLD";

  // 最終フォールバック
  return legal[0];
};
