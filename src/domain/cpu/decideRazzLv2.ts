/**
 * Razz CPU Lv2: 意思決定ロジック
 *
 * ストリート別の意思決定ルールを実装。
 * 仕様: docs/cpu_Lv2/Razz_実装指示書.md
 */

import type { EventType, Rank } from "../types";
import type { ActionType, CpuDecisionContext } from "./policy";
import {
  allOppsHaveWorseDoor,
  countBetterDoors,
  countDeadLow,
  estimateBoardQuality,
  eval3rdQuality,
  getMinOppDirt,
  isStealLikely,
  lowValue,
  scoreOppBoardDirt,
} from "./razz/eval";
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
 * 相手の最良ドアランクを取得
 */
const getBestOppDoorRank = (vctx: VisibleContext): Rank | null => {
  let bestRank: Rank | null = null;
  let bestVal = Infinity;

  for (const opp of vctx.opponents) {
    if (opp.active && opp.up.length > 0) {
      const val = lowValue(opp.up[0].rank);
      if (val < bestVal) {
        bestVal = val;
        bestRank = opp.up[0].rank;
      }
    }
  }
  return bestRank;
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
  const quality = eval3rdQuality(meCards3);
  const myDoorRank = getMyDoorRank(vctx);
  const { deadA5 } = countDeadLow(vctx.deadRankCount);

  if (!myDoorRank) {
    return pickAction(allowed, ["CHECK", "CALL", "FOLD"]);
  }

  const myDoorVal = lowValue(myDoorRank);
  const competitors = countBetterDoors(myDoorRank, vctx.opponents);

  // 3rd-1: 自分がBring-in担当
  if (has(allowed, "BRING_IN")) {
    // Monster3 / Good3 / Okay3 → COMPLETE
    if (quality !== "Bad3") {
      if (has(allowed, "COMPLETE")) return "COMPLETE";
    }
    // Bad3 → BRING_IN
    return "BRING_IN";
  }

  // 3rd-2: まだcompleteされていない
  if (has(allowed, "COMPLETE") && !has(allowed, "RAISE")) {
    // A: ドアが9以上（高いドアで弱い）
    if (myDoorVal >= 9) {
      // 全員が自分より悪いドア → COMPLETE（Any2スチール）
      if (allOppsHaveWorseDoor(myDoorRank, vctx.opponents)) {
        return "COMPLETE";
      }
      // 自分より低いドアがいる → FOLD
      return pickAction(allowed, ["FOLD", "CALL"]);
    }

    // B: ドアが8以下
    // 競合が2人以上
    if (competitors >= 2) {
      if (quality === "Monster3" || quality === "Good3") {
        return "COMPLETE";
      }
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
    // 競合が1人
    if (competitors === 1) {
      // 8以下が2枚以上
      const lowCount = meCards3.filter((c) => lowValue(c.rank) <= 8).length;
      if (lowCount >= 2 && quality !== "Bad3") {
        return "COMPLETE";
      }
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
    // 競合が0人 → スチール
    return "COMPLETE";
  }

  // 3rd-3: 相手COMPLETEに直面（CALL/RAISE/FOLD）
  if (has(allowed, "RAISE") || has(allowed, "CALL")) {
    const bestOppDoorRank = getBestOppDoorRank(vctx);

    // StealLikely判定
    const stealLikely =
      bestOppDoorRank && isStealLikely(bestOppDoorRank, myDoorRank);

    if (stealLikely) {
      // スチールっぽい相手に対して広めに守る
      if (quality !== "Bad3") {
        // Monster3/Good3でdeadが良ければRAISE
        if ((quality === "Monster3" || quality === "Good3") && deadA5 <= 2) {
          return pickAction(allowed, ["RAISE", "CALL"]);
        }
        return pickAction(allowed, ["CALL"]);
      }
      return pickAction(allowed, ["FOLD"]);
    }

    // TightLikely（相手ドアが8以下）
    if (quality === "Monster3") {
      // 自分ドアが相手より低い → RAISE
      if (bestOppDoorRank && lowValue(myDoorRank) < lowValue(bestOppDoorRank)) {
        return pickAction(allowed, ["RAISE", "CALL"]);
      }
      return pickAction(allowed, ["CALL"]);
    }
    if (quality === "Good3") {
      return pickAction(allowed, ["CALL"]);
    }
    // Okay3以下 → FOLD
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
  const myBoard = estimateBoardQuality(meCards);
  const oppDirt = getMinOppDirt(vctx.opponents);
  const { deadA5 } = countDeadLow(vctx.deadRankCount);
  const currentBet = ctx.state.currentBet;

  // 4th-1: 自分がベット可能
  if (currentBet === 0) {
    // 自分ボードが良い → BET
    if (myBoard.lowCount8 >= 3 && myBoard.pairPenalty === 0) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    // 相手ボードが悪い → BET
    if (oppDirt >= 3) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    return pickAction(allowed, ["CHECK"]);
  }

  // 4th-2: 相手BETに直面
  // 原則CALL（4thは降りすぎない）
  // 例外FOLD: 連続ブリック + 相手良ボード + dead悪い
  if (myBoard.highCount9 >= 2 && oppDirt <= 1 && deadA5 >= 4) {
    return pickAction(allowed, ["FOLD", "CALL"]);
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
  const myBoard = estimateBoardQuality(meCards);
  const oppDirt = getMinOppDirt(vctx.opponents);
  const { deadA5 } = countDeadLow(vctx.deadRankCount);
  const currentBet = ctx.state.currentBet;

  // 5th/6th-1: 自分がベット可能
  if (currentBet === 0) {
    // Equity Leader → BET
    if (myBoard.lowCount8 >= 4 && myBoard.pairPenalty === 0) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    // 相手ボードが悪い → BET
    if (oppDirt >= 4) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    // ブリック + 相手改善 → CHECK
    if (myBoard.highCount9 >= 2 && oppDirt <= 1) {
      return pickAction(allowed, ["CHECK"]);
    }
    return pickAction(allowed, ["CHECK"]);
  }

  // 5th/6th-2: 相手BETに直面
  // CALLしてよい条件
  // 1) 低牌が十分（<=8が4枚以上）でペア汚染軽い
  if (myBoard.lowCount8 >= 4 && myBoard.pairPenalty <= 1) {
    return pickAction(allowed, ["CALL"]);
  }
  // 2) 相手upが悪い
  if (oppDirt >= 4) {
    return pickAction(allowed, ["CALL"]);
  }
  // 3) deadが相手不利
  if (deadA5 >= 5) {
    return pickAction(allowed, ["CALL"]);
  }

  // FOLD条件: ブリック連発 + 相手良ボード + dead不利
  if (myBoard.highCount9 >= 2 && oppDirt <= 2 && deadA5 >= 4) {
    return pickAction(allowed, ["FOLD", "CALL"]);
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
  const myBoard = estimateBoardQuality(meCards);
  const currentBet = ctx.state.currentBet;

  // 相手upの汚れ度
  let oppDirtMax = 0;
  for (const opp of vctx.opponents) {
    if (opp.active) {
      oppDirtMax = Math.max(oppDirtMax, scoreOppBoardDirt(opp.up));
    }
  }

  // 7th-1: 相手がチェック（自分がBET可能）
  if (currentBet === 0) {
    // 8ロー相当以上 → BET
    // 簡易: 低牌が5枚以上でペア軽い
    if (myBoard.lowCount8 >= 5 && myBoard.pairPenalty <= 1) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    // 相手upがとても汚い → 弱めでもBET
    if (oppDirtMax >= 5) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    return pickAction(allowed, ["CHECK"]);
  }

  // 7th-2: 相手BETに直面
  // オーバーフォールド回避: 2条件以上でCALL
  let callConditions = 0;

  // 1) 相手upが汚い
  if (oppDirtMax >= 4) callConditions++;
  // 2) 自分が9ロー相当以上
  if (myBoard.lowCount8 >= 4 && myBoard.pairPenalty <= 1) callConditions++;
  // 3) ヘッズアップ
  if (vctx.headsUp) callConditions++;

  if (callConditions >= 2) {
    return pickAction(allowed, ["CALL"]);
  }

  // FOLD推奨: 相手upが極めて良い + 自分が悪い
  if (oppDirtMax <= 1 && myBoard.highCount9 >= 2) {
    return pickAction(allowed, ["FOLD", "CALL"]);
  }

  // ヘッズアップなら1条件でもCALL
  if (vctx.headsUp && callConditions >= 1) {
    return pickAction(allowed, ["CALL"]);
  }

  return pickAction(allowed, ["FOLD", "CALL"]);
};

// ============================================================
// メイン決定関数
// ============================================================

/**
 * Razz CPU Lv2 意思決定
 */
export const decideRazzLv2 = (ctx: CpuDecisionContext): ActionType => {
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
