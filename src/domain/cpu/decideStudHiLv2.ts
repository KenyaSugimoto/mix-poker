/**
 * Stud Hi CPU Lv2: 意思決定ロジック
 *
 * ストリート別の意思決定ルールを実装。
 * 仕様: docs/cpu_Lv2/StudHi_CPU戦略_実装指示書.md
 */

import type { EventType, Rank, Suit } from "../types";
import type { ActionType, CpuDecisionContext } from "./policy";
import {
  evalCategory,
  evalTier3rd,
  liveForFlushSuit,
  liveForPairImprove,
  rankValue,
  scoreThreat,
} from "./studHi/eval";
import {
  buildVisibleContext,
  type LiveGrade,
  type VisibleContext,
} from "./studHi/visibleContext";

// ============================================================
// フォールバック関数
// ============================================================

const has = (allowed: EventType[], t: EventType) => allowed.includes(t);

/**
 * 望ましいアクションを優先順位リストから選択
 * allowedActionsに含まれる最初のアクションを返す
 */
export const pickAction = (
  allowed: EventType[],
  pref: ActionType[],
): ActionType => {
  for (const t of pref) {
    if (has(allowed, t)) return t;
  }
  // 最低限の保険
  if (has(allowed, "CHECK")) return "CHECK";
  if (has(allowed, "CALL")) return "CALL";
  if (has(allowed, "FOLD")) return "FOLD";
  // ここまで来るのは想定外
  return (allowed[0] as ActionType) ?? "FOLD";
};

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 自分のupカードの最大ランク値を取得
 */
const getMyDoorRank = (ctx: VisibleContext): number => {
  if (ctx.me.up.length === 0) return 0;
  return Math.max(...ctx.me.up.map((c) => rankValue(c.rank)));
};

/**
 * 未行動の相手のドアランク最大値を取得
 */
const getMaxOppDoorRank = (ctx: VisibleContext): number => {
  const activeOpps = ctx.opponents.filter((p) =>
    ctx.aliveSeats.includes(p.seat),
  );
  if (activeOpps.length === 0) return 0;

  let max = 0;
  for (const opp of activeOpps) {
    if (opp.up.length > 0) {
      const oppDoor = Math.max(...opp.up.map((c) => rankValue(c.rank)));
      max = Math.max(max, oppDoor);
    }
  }
  return max;
};

/**
 * 後ろにAドアがいるか判定
 */
const hasAceDoorBehind = (ctx: VisibleContext): boolean => {
  const activeOpps = ctx.opponents.filter((p) =>
    ctx.aliveSeats.includes(p.seat),
  );
  return activeOpps.some((opp) => opp.up.some((c) => c.rank === "A"));
};

/**
 * スチール条件を満たすか判定
 */
const canSteal = (ctx: VisibleContext): boolean => {
  const myDoor = getMyDoorRank(ctx);
  const maxOppDoor = getMaxOppDoorRank(ctx);

  // 自分のドアがJ以下 → スチール禁止
  if (myDoor <= 11) return false;

  // 後ろにAドアがいる → スチール禁止
  if (hasAceDoorBehind(ctx)) return false;

  // 自分のドアが全員より高い
  return myDoor > maxOppDoor;
};

/**
 * 自分の手札から最も多いスートを取得
 */
const getMostSuit = (cards: { suit: Suit }[]): Suit | null => {
  const m = new Map<Suit, number>();
  for (const c of cards) {
    m.set(c.suit, (m.get(c.suit) ?? 0) + 1);
  }
  let maxSuit: Suit | null = null;
  let maxCount = 0;
  for (const [suit, count] of m.entries()) {
    if (count > maxCount) {
      maxSuit = suit;
      maxCount = count;
    }
  }
  return maxSuit;
};

/**
 * 自分のペアランクを取得
 */
const getPairRank = (cards: { rank: Rank }[]): Rank | null => {
  const m = new Map<Rank, number>();
  for (const c of cards) {
    m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
  }
  for (const [rank, count] of m.entries()) {
    if (count >= 2) return rank;
  }
  return null;
};

/**
 * 自分のLive状態を取得（フラッシュorペア改善）
 */
const getMyLive = (ctx: VisibleContext): LiveGrade => {
  const allCards = [...ctx.me.down, ...ctx.me.up];

  // まずペアがあるか確認
  const pairRank = getPairRank(allCards);
  if (pairRank) {
    return liveForPairImprove(pairRank, ctx.deadRankCount);
  }

  // 次にフラッシュドロー判定
  const mostSuit = getMostSuit(allCards);
  if (mostSuit) {
    return liveForFlushSuit(mostSuit, ctx.deadSuitCount);
  }

  return "OK"; // デフォルト
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
  const tier = evalTier3rd(meCards3, vctx.deadRankCount, vctx.deadSuitCount);
  const threat = scoreThreat(vctx.opponents);
  const live = getMyLive(vctx);

  // 3rd-1: 自分がBring-in担当
  if (has(allowed, "BRING_IN")) {
    // Tier S/A/B → COMPLETE
    if (tier === "S" || tier === "A" || tier === "B") {
      if (has(allowed, "COMPLETE")) return "COMPLETE";
    }
    // Tier C/D → BRING_IN
    return "BRING_IN";
  }

  // 3rd-2: まだcompleteされていない（COMPLETEが選択可能）
  if (has(allowed, "COMPLETE") && !has(allowed, "RAISE")) {
    if (tier === "S" || tier === "A") {
      return "COMPLETE";
    }
    if (tier === "B") {
      if (live === "GOOD" || live === "OK") {
        return "COMPLETE";
      }
      // Live BAD → FOLD寄り
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
    if (tier === "C") {
      // スチール条件なら COMPLETE
      if (canSteal(vctx)) {
        return "COMPLETE";
      }
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
    // Tier D
    return pickAction(allowed, ["FOLD", "CALL"]);
  }

  // 3rd-4: 相手COMPLETEに直面（CALL/RAISE/FOLD）
  if (has(allowed, "RAISE") || has(allowed, "CALL")) {
    if (tier === "S") {
      return pickAction(allowed, ["RAISE", "CALL"]);
    }
    if (tier === "A") {
      // 相手ドアが自分より弱い & Threat低いなら RAISE
      const myDoor = getMyDoorRank(vctx);
      const maxOppDoor = getMaxOppDoorRank(vctx);
      if (myDoor > maxOppDoor && threat <= 3) {
        return pickAction(allowed, ["RAISE", "CALL"]);
      }
      return pickAction(allowed, ["CALL"]);
    }
    if (tier === "B") {
      if (live === "GOOD" || live === "OK") {
        return pickAction(allowed, ["CALL"]);
      }
      return pickAction(allowed, ["FOLD"]);
    }
    // Tier C/D
    return pickAction(allowed, ["FOLD"]);
  }

  // フォールバック
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
  const category = evalCategory(
    meCards,
    vctx.deadRankCount,
    vctx.deadSuitCount,
  );
  const threat = scoreThreat(vctx.opponents);
  const live = getMyLive(vctx);
  const currentBet = ctx.state.currentBet;

  // currentBet == 0: 自分がベット可能（CHECK/BET）
  if (currentBet === 0) {
    // Made → BET
    if (category === "M") {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    // Draw + 低〜中Threat → セミブラフBET
    if (category === "D" && threat <= 6) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    // Nothing or 高Threat → CHECK
    return pickAction(allowed, ["CHECK"]);
  }

  // currentBet > 0: 相手BETに直面（CALL/RAISE/FOLD）
  // 原則CALL（「基本降りない」）

  // FOLD許可条件: Nothing + Draw薄い + Threat高い
  if (category === "N" && live === "BAD" && threat >= 7) {
    return pickAction(allowed, ["FOLD", "CALL"]);
  }

  // RAISE条件: Made（オープンペア以上） or 強いDraw + 低〜中Threat
  if (category === "M" || (category === "D" && threat <= 6)) {
    // 強い場合はRAISEも考慮
    if (category === "M" && threat <= 4) {
      return pickAction(allowed, ["RAISE", "CALL"]);
    }
    return pickAction(allowed, ["CALL"]);
  }

  // 基本CALL
  return pickAction(allowed, ["CALL", "FOLD"]);
};

// ============================================================
// 5th Street 決定ロジック（最重要分岐 / Big Bet）
// ============================================================

const decide5th = (
  ctx: CpuDecisionContext,
  vctx: VisibleContext,
): ActionType => {
  const allowed = ctx.allowedActions;
  const meCards = [...vctx.me.down, ...vctx.me.up];
  const category = evalCategory(
    meCards,
    vctx.deadRankCount,
    vctx.deadSuitCount,
  );
  const threat = scoreThreat(vctx.opponents);
  const live = getMyLive(vctx);
  const currentBet = ctx.state.currentBet;

  // 5th-1: 自分がベット可能
  if (currentBet === 0) {
    // M → BET（スロープレイしない）
    if (category === "M") {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    // D → Threat低〜中のみ BET（セミブラフ）
    if (category === "D" && threat <= 6) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    // N → CHECK
    return pickAction(allowed, ["CHECK"]);
  }

  // 5th-2: 相手BETに直面（CALL/RAISE/FOLD）
  // M → 基本CALL。優位ならRAISE
  if (category === "M") {
    if (threat <= 4) {
      return pickAction(allowed, ["RAISE", "CALL"]);
    }
    return pickAction(allowed, ["CALL"]);
  }

  // D → Live GOOD/OKならCALL、Live BADならFOLD
  if (category === "D") {
    if (live === "GOOD" || live === "OK") {
      return pickAction(allowed, ["CALL"]);
    }
    return pickAction(allowed, ["FOLD", "CALL"]);
  }

  // N → FOLD（ここで切れるのが強いCPU）
  return pickAction(allowed, ["FOLD", "CALL"]);
};

// ============================================================
// 6th Street 決定ロジック（Big Bet / "完成"を尊重）
// ============================================================

const decide6th = (
  ctx: CpuDecisionContext,
  vctx: VisibleContext,
): ActionType => {
  const allowed = ctx.allowedActions;
  const meCards = [...vctx.me.down, ...vctx.me.up];
  const category = evalCategory(
    meCards,
    vctx.deadRankCount,
    vctx.deadSuitCount,
  );
  const threat = scoreThreat(vctx.opponents);
  const live = getMyLive(vctx);
  const currentBet = ctx.state.currentBet;

  // currentBet == 0
  if (currentBet === 0) {
    if (category === "M") {
      return pickAction(allowed, ["BET", "CHECK"]);
    }
    return pickAction(allowed, ["CHECK"]);
  }

  // 相手BETに直面
  // TwoPair+ → CALL/RAISE
  // 簡易判定: Mでペアが2つ以上あるかチェック
  const hasTwoPairPlus = (() => {
    const m = new Map<Rank, number>();
    for (const c of meCards) {
      m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
    }
    const pairs = Array.from(m.values()).filter((v) => v >= 2).length;
    return pairs >= 2;
  })();

  if (hasTwoPairPlus) {
    if (threat <= 5) {
      return pickAction(allowed, ["RAISE", "CALL"]);
    }
    return pickAction(allowed, ["CALL"]);
  }

  // OnePair → Threat高ならFOLDも許可
  if (category === "M") {
    if (threat >= 7 && live === "BAD") {
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
    return pickAction(allowed, ["CALL"]);
  }

  // Draw → Live GOODでも、相手完成シグナル強いならFOLD
  if (category === "D") {
    if (threat >= 7) {
      return pickAction(allowed, ["FOLD", "CALL"]);
    }
    if (live === "GOOD" || live === "OK") {
      return pickAction(allowed, ["CALL"]);
    }
    return pickAction(allowed, ["FOLD", "CALL"]);
  }

  // N → FOLD
  return pickAction(allowed, ["FOLD", "CALL"]);
};

// ============================================================
// 7th Street 決定ロジック（バリュー・薄いブラフキャッチ）
// ============================================================

const decide7th = (
  ctx: CpuDecisionContext,
  vctx: VisibleContext,
): ActionType => {
  const allowed = ctx.allowedActions;
  const meCards = [...vctx.me.down, ...vctx.me.up];
  const category = evalCategory(
    meCards,
    vctx.deadRankCount,
    vctx.deadSuitCount,
  );
  const threat = scoreThreat(vctx.opponents);
  const currentBet = ctx.state.currentBet;

  // 7th-1: 相手がチェックしてきた（自分がBET可能）
  if (currentBet === 0) {
    // TwoPair+ → BET（バリュー）
    const hasTwoPairPlus = (() => {
      const m = new Map<Rank, number>();
      for (const c of meCards) {
        m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
      }
      const pairs = Array.from(m.values()).filter((v) => v >= 2).length;
      return pairs >= 2;
    })();

    if (hasTwoPairPlus) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }

    // OnePair → 相手upが弱ければ薄いバリューBET
    if (category === "M" && threat <= 3) {
      return pickAction(allowed, ["BET", "CHECK"]);
    }

    // それ以外 → CHECK
    return pickAction(allowed, ["CHECK"]);
  }

  // 7th-2: 相手BETに直面（CALL/FOLD）
  // ブラフキャッチは限定的に許可
  // 条件: 相手upが完成形に見えない, 自分が上位OnePair

  // 簡易判定: 高ランクペアを持っているか
  const hasHighPair = (() => {
    const m = new Map<Rank, number>();
    for (const c of meCards) {
      m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
    }
    for (const [rank, count] of m.entries()) {
      if (count >= 2 && rankValue(rank) >= 12) {
        // Q以上のペア
        return true;
      }
    }
    return false;
  })();

  // 条件2つ以上でCALL
  let callConditions = 0;
  if (threat <= 4) callConditions++; // 相手upが完成形に見えない
  if (hasHighPair) callConditions++; // 上位OnePair

  if (callConditions >= 2 || category === "M") {
    return pickAction(allowed, ["CALL"]);
  }

  // 満たさない → FOLD
  return pickAction(allowed, ["FOLD", "CALL"]);
};

// ============================================================
// メイン決定関数
// ============================================================

/**
 * Stud Hi CPU Lv2 意思決定
 */
export const decideStudHiLv2 = (ctx: CpuDecisionContext): ActionType => {
  const allowed = ctx.allowedActions;

  // 選択肢が1つならそれを返す
  if (allowed.length === 1) {
    return allowed[0] as ActionType;
  }

  // 選択肢がない場合のフォールバック
  if (allowed.length === 0) {
    return "FOLD";
  }

  // VisibleContextを生成
  const vctx = buildVisibleContext(ctx.state, ctx.seat);

  // ストリート別に分岐
  switch (vctx.street) {
    case "3rd":
      return decide3rd(ctx, vctx);
    case "4th":
      return decide4th(ctx, vctx);
    case "5th":
      return decide5th(ctx, vctx);
    case "6th":
      return decide6th(ctx, vctx);
    case "7th":
      return decide7th(ctx, vctx);
    default:
      return pickAction(allowed, ["CHECK", "CALL", "FOLD"]);
  }
};
