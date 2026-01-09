/**
 * Stud Hi CPU Lv2: VisibleContext（中間表現）
 *
 * CPUが判断に必要な見える情報のみを抽出した構造体。
 * 仕様: docs/cpu_Lv2/VisibleContext_仕様書.md
 */

import type {
  Card,
  DealState,
  Rank,
  SeatIndex,
  Street,
  Suit,
} from "../../types";

// ============================================================
// 型定義
// ============================================================

/** Liveの3段階評価 */
export type LiveGrade = "GOOD" | "OK" | "BAD";

/** 3rd StreetのTier評価 */
export type Tier3rd = "S" | "A" | "B" | "C" | "D";

/** 4th以降のCategory評価 (Made/Draw/Nothing) */
export type Category = "M" | "D" | "N";

/** 相手プレイヤーの公開情報 */
export interface VisiblePlayer {
  seat: number;
  active: boolean;
  up: Card[];
  downCount: number;
}

/** CPU判断用の中間表現 */
export interface VisibleContext {
  street: Street;
  me: {
    seat: number;
    up: Card[];
    down: Card[];
  };
  opponents: VisiblePlayer[];
  aliveSeats: number[];
  headsUp: boolean;

  /** 公開されているデッドカード（相手全員のupCards、fold済み含む） */
  deadUpCards: Card[];
  deadRankCount: Record<Rank, number>;
  deadSuitCount: Record<Suit, number>;

  bringInSeat: number;
}

// ============================================================
// 定数
// ============================================================

const SUITS: Suit[] = ["c", "d", "h", "s"];
const RANKS: Rank[] = [
  "A",
  "K",
  "Q",
  "J",
  "T",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
];

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * カード配列からランクごとの枚数をカウント
 */
export const makeRankCount = (cards: Card[]): Record<Rank, number> => {
  const init = Object.fromEntries(RANKS.map((r) => [r, 0])) as Record<
    Rank,
    number
  >;
  for (const c of cards) {
    init[c.rank] += 1;
  }
  return init;
};

/**
 * カード配列からスートごとの枚数をカウント
 */
export const makeSuitCount = (cards: Card[]): Record<Suit, number> => {
  const init = Object.fromEntries(SUITS.map((s) => [s, 0])) as Record<
    Suit,
    number
  >;
  for (const c of cards) {
    init[c.suit] += 1;
  }
  return init;
};

// ============================================================
// メイン関数
// ============================================================

/**
 * DealState から VisibleContext を生成
 *
 * @param state - 現在のDealState
 * @param meSeat - CPU自身のシートインデックス
 * @returns VisibleContext
 */
export const buildVisibleContext = (
  state: DealState,
  meSeat: SeatIndex,
): VisibleContext => {
  const myHand = state.hands[meSeat] ?? { upCards: [], downCards: [] };
  const me = {
    seat: meSeat,
    up: myHand.upCards ?? [],
    down: myHand.downCards ?? [],
  };

  // 全プレイヤー情報を抽出
  const players = state.players.map((p) => {
    const hand = state.hands[p.seat] ?? { upCards: [], downCards: [] };
    return {
      seat: p.seat,
      active: p.active,
      up: hand.upCards ?? [],
      downCount: (hand.downCards ?? []).length,
    } satisfies VisiblePlayer;
  });

  // 自分以外を相手として抽出
  const opponents = players.filter((p) => p.seat !== meSeat);

  // アクティブな（フォールドしていない）席
  const aliveSeats = players.filter((p) => p.active).map((p) => p.seat);

  // ヘッズアップ判定
  const headsUp = aliveSeats.length === 2;

  // デッドカード = 自分以外の全upCards（fold済みプレイヤーも含む）
  const deadUpCards = opponents.flatMap((p) => p.up);
  const deadRankCount = makeRankCount(deadUpCards);
  const deadSuitCount = makeSuitCount(deadUpCards);

  return {
    street: state.street,
    me,
    opponents,
    aliveSeats,
    headsUp,
    deadUpCards,
    deadRankCount,
    deadSuitCount,
    bringInSeat: state.bringInIndex,
  };
};
