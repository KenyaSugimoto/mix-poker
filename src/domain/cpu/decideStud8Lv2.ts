/**
 * Stud8 CPU Lv2: 意思決定ロジック
 *
 * ストリート別の意思決定ルールを実装。
 * 仕様: docs/cpu_Lv2/Stud8_実装指示書.md
 */

import type { EventType, Rank } from "../types";
import type { ActionType, CpuDecisionContext } from "./policy";
import {
  classify3rdStud8,
  countLowDead,
  inferIntentFromDoor,
  inferRoleNow,
  isOppBoardHiStrong,
  isOppBoardLoDirty,
  isOppBoardLoStrong,
  lowValue,
} from "./stud8/eval";
import {
  buildVisibleContext,
  type VisibleContext,
} from "./studHi/visibleContext";

// ============================================================
// フォールバック関数
// ============================================================

const has = (allowed: EventType[], t: EventType) => allowed.includes(t);

/**
 * 望ましいアクションを優先順位リストから選択
 */
const pickAction = (allowed: EventType[], pref: ActionType[]): ActionType => {
  for (const t of pref) {
    if (has(allowed, t)) return t;
  }
  if (has(allowed, "CHECK")) return "CHECK";
  if (has(allowed, "CALL")) return "CALL";
  if (has(allowed, "FOLD")) return "FOLD";
  return (allowed[0] as ActionType) ?? "FOLD";
};

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 自分のドアランクを取得（3rdのup[0]）
 */
const getMyDoorRank = (vctx: VisibleContext): Rank | null => {
  if (vctx.me.up.length === 0) return null;
  return vctx.me.up[0].rank;
};

/**
 * 相手の最良（Lo志向）ドアを持つ相手のドアランクを取得
 */
const getBestLoOppDoorRank = (vctx: VisibleContext): Rank | null => {
  let bestRank: Rank | null = null;
  let bestVal = Infinity;

  for (const opp of vctx.opponents) {
    if (opp.active && opp.up.length > 0) {
      const val = lowValue(opp.up[0].rank);
      if (val <= 8 && val < bestVal) {
        bestVal = val;
        bestRank = opp.up[0].rank;
      }
    }
  }
  return bestRank;
};

/**
 * 相手にLoドア（8以下）がいる数をカウント
 */
const countLoDoorsInOpps = (vctx: VisibleContext): number => {
  let count = 0;
  for (const opp of vctx.opponents) {
    if (opp.active && opp.up.length > 0) {
      const val = lowValue(opp.up[0].rank);
      if (val <= 8) count++;
    }
  }
  return count;
};

/**
 * 相手にA/2/3ドアがいるか
 */
const hasStrongLoDoorsInOpps = (vctx: VisibleContext): boolean => {
  for (const opp of vctx.opponents) {
    if (opp.active && opp.up.length > 0) {
      const val = lowValue(opp.up[0].rank);
      if (val <= 3) return true;
    }
  }
  return false;
};

/**
 * 最もアクティブな相手のupCardsを取得
 */
const getMainOppUpCards = (
  vctx: VisibleContext,
): { up: import("../types").Card[]; intent: "LO" | "HI" } | null => {
  for (const opp of vctx.opponents) {
    if (opp.active && opp.up.length > 0) {
      const intent = inferIntentFromDoor(opp.up[0].rank);
      return { up: opp.up, intent };
    }
  }
  return null;
};

// ============================================================
// 3rd Street 決定ロジック
// ============================================================

const decide3rd = (
  ctx: CpuDecisionContext,
  vctx: VisibleContext,
): ActionType => {
  const allowed = ctx.allowedActions;
  const meCards3 = [...vctx.me.down, ...vctx.me.up];
  const quality = classify3rdStud8(meCards3);
  const myDoorRank = getMyDoorRank(vctx);
  const { penalty } = countLowDead(vctx.deadRankCount);

  // 3rd-1: 自分がBring-in担当
  if (has(allowed, "BRING_IN")) {
    // Scoop3_Monster / Low3_Good / High3_Good → COMPLETE
    if (
      quality === "Scoop3_Monster" ||
      quality === "Low3_Good" ||
      quality === "High3_Good"
    ) {
      if (has(allowed, "COMPLETE")) return "COMPLETE";
    }
    // Marginal → 盤面次第
    if (quality === "Marginal") {
      const loDoors = countLoDoorsInOpps(vctx);
      if (loDoors <= 1 && has(allowed, "COMPLETE")) {
        return "COMPLETE";
      }
    }
    // Trash → BRING_IN
    return "BRING_IN";
  }

  // 3rd-2: 通常オープン（まだcompleteされていない）
  if (has(allowed, "COMPLETE") && !has(allowed, "RAISE")) {
    // スチール条件: 自分ドアが8以下、後ろに強いLoドア（A/2/3）がいない、Loドアが少ない
    if (myDoorRank) {
      const myDoorVal = lowValue(myDoorRank);
      if (myDoorVal <= 8) {
        const hasStrongLo = hasStrongLoDoorsInOpps(vctx);
        const loDoors = countLoDoorsInOpps(vctx);
        if (!hasStrongLo && loDoors <= 1) {
          // スチール可能
          return "COMPLETE";
        }
      }
    }

    // ハンド品質別
    if (quality === "Scoop3_Monster") {
      return "COMPLETE";
    }
    if (quality === "Low3_Good") {
      // 競合Loドアが多くてもCOMPLETE寄り
      return "COMPLETE";
    }
    if (quality === "High3_Good") {
      // 相手にLoドアが多い場合は参加を絞る
      const loDoors = countLoDoorsInOpps(vctx);
      if (loDoors >= 2) {
        return pickAction(allowed, ["FOLD", "CALL"]);
      }
      return "COMPLETE";
    }
    if (quality === "Marginal") {
      // スチール条件を満たすときのみCOMPLETE
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
    // Trash → FOLD
    return pickAction(allowed, ["FOLD"]);
  }

  // 3rd-3: 相手COMPLETEに直面（CALL/RAISE/FOLD）
  if (has(allowed, "RAISE") || has(allowed, "CALL")) {
    const bestLoOppDoor = getBestLoOppDoorRank(vctx);
    const oppIntent: "LO" | "HI" = bestLoOppDoor ? "LO" : "HI";

    // Scoop3_Monster
    if (quality === "Scoop3_Monster") {
      // deadが良ければRAISE
      if (penalty <= 4 && has(allowed, "RAISE")) {
        return "RAISE";
      }
      return pickAction(allowed, ["CALL"]);
    }

    // Low3_Good
    if (quality === "Low3_Good") {
      // 相手ドア <= 8（Lo寄り）→ CALL（降りすぎ防止）
      // 相手ドア >= 9（Hi/Steal寄り）→ CALL（守る）
      return pickAction(allowed, ["CALL"]);
    }

    // High3_Good
    if (quality === "High3_Good") {
      // 相手ドア <= 8 → 原則FOLD（Scoopされる危険）
      if (oppIntent === "LO") {
        return pickAction(allowed, ["FOLD"]);
      }
      // 相手ドア >= 9 → CALL（または99+ならRAISE）
      return pickAction(allowed, ["CALL"]);
    }

    // Marginal/Trash → 基本FOLD
    return pickAction(allowed, ["FOLD"]);
  }

  return pickAction(allowed, ["CHECK", "CALL", "FOLD"]);
};

// ============================================================
// 4th Street 決定ロジック
// ============================================================

const decide4th = (
  ctx: CpuDecisionContext,
  vctx: VisibleContext,
): ActionType => {
  const allowed = ctx.allowedActions;
  const meCards = [...vctx.me.down, ...vctx.me.up];
  const role = inferRoleNow(meCards);
  const currentBet = ctx.state.currentBet;
  const mainOpp = getMainOppUpCards(vctx);

  // 4th-1: 自分がベット可能
  if (currentBet === 0) {
    if (role === "SCOOPING") {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    if (role === "HI_ONLY" && mainOpp?.intent === "LO") {
      // HI_ONLY vs LO相手 → BET（相手を降ろしやすい）
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    if (role === "LO_ONLY") {
      // 相手がHiでボード強いならCHECK、相手が汚いならBET
      if (mainOpp && isOppBoardLoDirty(mainOpp.up)) {
        return pickAction(allowed, ["BET", "CHECK"]);
      }
      return pickAction(allowed, ["CHECK"]);
    }
    // AIR
    return pickAction(allowed, ["CHECK"]);
  }

  // 4th-2: 相手BETに直面
  // 原則CALL（4thは降りすぎない）
  // 例外FOLD: HI_ONLYで相手がLo完成に向かって強く見える
  if (role === "HI_ONLY" && mainOpp && isOppBoardLoStrong(mainOpp.up)) {
    const { penalty } = countLowDead(vctx.deadRankCount);
    if (penalty <= 2) {
      // 相手のLoが生きている → FOLD許可（頻度低め）
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
  }

  return pickAction(allowed, ["CALL", "FOLD"]);
};

// ============================================================
// 5th/6th Street 決定ロジック
// ============================================================

const decide5th6th = (
  ctx: CpuDecisionContext,
  vctx: VisibleContext,
): ActionType => {
  const allowed = ctx.allowedActions;
  const meCards = [...vctx.me.down, ...vctx.me.up];
  const role = inferRoleNow(meCards);
  const currentBet = ctx.state.currentBet;
  const mainOpp = getMainOppUpCards(vctx);
  const { penalty } = countLowDead(vctx.deadRankCount);

  // 5th/6th-1: 自分がベット可能
  if (currentBet === 0) {
    if (role === "SCOOPING") {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    if (role === "HI_ONLY" && mainOpp?.intent === "LO") {
      // 相手のLo未完成のうちは圧
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    if (role === "LO_ONLY") {
      // 原則CALL寄り、相手Hiが弱そうならBET
      if (mainOpp && !isOppBoardHiStrong(mainOpp.up)) {
        return pickAction(allowed, ["BET", "CHECK"]);
      }
      return pickAction(allowed, ["CHECK"]);
    }
    return pickAction(allowed, ["CHECK"]);
  }

  // 5th/6th-2: 相手BETに直面
  // CALL優先条件
  if (role === "SCOOPING") {
    return pickAction(allowed, ["CALL"]);
  }
  if (role === "LO_ONLY" && mainOpp && isOppBoardLoDirty(mainOpp.up)) {
    return pickAction(allowed, ["CALL"]);
  }
  if (role === "HI_ONLY" && mainOpp && !isOppBoardLoStrong(mainOpp.up)) {
    return pickAction(allowed, ["CALL"]);
  }

  // FOLD条件（強め損切り）
  // HI_ONLYで相手Lo確定級
  if (role === "HI_ONLY" && mainOpp && isOppBoardLoStrong(mainOpp.up)) {
    return pickAction(allowed, ["FOLD", "CALL"]);
  }
  // LO_ONLYで相手Hi確定級かつLo枯れ
  if (role === "LO_ONLY" && mainOpp && isOppBoardHiStrong(mainOpp.up)) {
    if (penalty >= 6) {
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
  }

  // デフォルトCALL
  return pickAction(allowed, ["CALL", "FOLD"]);
};

// ============================================================
// 7th Street 決定ロジック
// ============================================================

const decide7th = (
  ctx: CpuDecisionContext,
  vctx: VisibleContext,
): ActionType => {
  const allowed = ctx.allowedActions;
  const meCards = [...vctx.me.down, ...vctx.me.up];
  const role = inferRoleNow(meCards);
  const currentBet = ctx.state.currentBet;
  const mainOpp = getMainOppUpCards(vctx);

  // 7th-1: 相手がチェック（自分がBET可能）
  if (currentBet === 0) {
    if (role === "SCOOPING") {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    if (role === "LO_ONLY") {
      // Loが確定・強いならBET
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    if (role === "HI_ONLY") {
      // 相手がLo強そうならCHECK寄り
      if (mainOpp && isOppBoardLoStrong(mainOpp.up)) {
        return pickAction(allowed, ["CHECK"]);
      }
      // HUや相手が汚い場合は薄いBETを許可
      if (vctx.headsUp || (mainOpp && isOppBoardLoDirty(mainOpp.up))) {
        return pickAction(allowed, ["BET", "CHECK"]);
      }
      return pickAction(allowed, ["CHECK"]);
    }
    return pickAction(allowed, ["CHECK"]);
  }

  // 7th-2: 相手BETに直面
  // オーバーフォールド回避: 2つ以上でCALL、HUなら1つでCALL
  let callConditions = 0;

  // 1) 相手ボードがLoに見えてもdead状況からLoが割れている可能性
  if (mainOpp && isOppBoardLoDirty(mainOpp.up)) callConditions++;

  // 2) 自分が片方（Hi or Lo）を取る見込み
  if (role === "SCOOPING" || role === "LO_ONLY" || role === "HI_ONLY") {
    callConditions++;
  }

  // 3) ヘッズアップ
  if (vctx.headsUp) callConditions++;

  if (callConditions >= 2) {
    return pickAction(allowed, ["CALL"]);
  }

  // HUなら1条件でもCALL
  if (vctx.headsUp && callConditions >= 1) {
    return pickAction(allowed, ["CALL"]);
  }

  // FOLD推奨: 相手がSCOOP濃厚かつ自分がAIR
  if (role === "AIR") {
    return pickAction(allowed, ["FOLD", "CALL"]);
  }

  return pickAction(allowed, ["CALL", "FOLD"]);
};

// ============================================================
// メイン決定関数
// ============================================================

/**
 * Stud8 CPU Lv2 意思決定
 */
export const decideStud8Lv2 = (ctx: CpuDecisionContext): ActionType => {
  const allowed = ctx.allowedActions;

  if (allowed.length === 1) {
    return allowed[0] as ActionType;
  }

  if (allowed.length === 0) {
    return "FOLD";
  }

  const vctx = buildVisibleContext(ctx.state, ctx.seat);

  switch (vctx.street) {
    case "3rd":
      return decide3rd(ctx, vctx);
    case "4th":
      return decide4th(ctx, vctx);
    case "5th":
    case "6th":
      return decide5th6th(ctx, vctx);
    case "7th":
      return decide7th(ctx, vctx);
    default:
      return pickAction(allowed, ["CHECK", "CALL", "FOLD"]);
  }
};
