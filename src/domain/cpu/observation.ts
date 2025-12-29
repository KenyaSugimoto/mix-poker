import type {
  Card,
  DealState,
  GameType,
  PlayerKind,
  SeatIndex,
  Street,
} from "../types";

/**
 * CPUが観測可能な情報のみを含む構造体
 * 公平性を担保するため、DealState から必要な情報のみを抽出する
 */
export interface CpuObservation {
  // ---- Game/Deal meta ----
  dealId: string;
  gameType: GameType;
  street: Street;

  // ---- Stakes / cost context ----
  stakes: {
    ante: number;
    bringIn: number;
    smallBet: number;
    bigBet: number;
  };

  // ---- Turn / betting ----
  bringInIndex: SeatIndex;
  currentActorIndex: SeatIndex;
  pot: number;
  currentBet: number;
  raiseCount: number;

  // ---- Optional counters (debug/heuristic) ----
  checksThisStreet: number;
  pendingResponseCount: number;

  // ---- Me (self - includes private info) ----
  me: {
    seat: SeatIndex;
    kind: PlayerKind;
    active: boolean;
    stack: number;
    committedTotal: number;
    committedThisStreet: number;
    downCards: Card[];
    upCards: Card[];
  };

  // ---- Others (public info only) ----
  players: Array<{
    seat: SeatIndex;
    kind: PlayerKind;
    active: boolean;
    stack: number;
    committedTotal: number;
    committedThisStreet: number;
    upCards: Card[];
  }>;
}

/**
 * DealState から CpuObservation を生成する
 * 公平性を担保するため、deck, rngSeed, 他人の downCards は含めない
 *
 * @param state - 現在のDealState
 * @param seat - CPU自身のシートインデックス
 * @returns CpuObservation
 */
export const buildObservation = (
  state: DealState,
  seat: SeatIndex,
): CpuObservation => {
  const mePlayer = state.players[seat];
  const meHand = state.hands[seat];

  if (!mePlayer || !meHand) {
    throw new Error(`Invalid seat index: ${seat}`);
  }

  // 自分の情報（downCards + upCards を含む）
  const me: CpuObservation["me"] = {
    seat: mePlayer.seat,
    kind: mePlayer.kind,
    active: mePlayer.active,
    stack: mePlayer.stack,
    committedTotal: mePlayer.committedTotal,
    committedThisStreet: mePlayer.committedThisStreet,
    downCards: meHand.downCards,
    upCards: meHand.upCards,
  };

  // 他のプレイヤーの情報（upCards のみ、downCards は含めない）
  const players: CpuObservation["players"] = state.players.map((p, idx) => {
    const hand = state.hands[idx];
    return {
      seat: p.seat,
      kind: p.kind,
      active: p.active,
      stack: p.stack,
      committedTotal: p.committedTotal,
      committedThisStreet: p.committedThisStreet,
      upCards: hand?.upCards ?? [],
    };
  });

  return {
    dealId: state.dealId,
    gameType: state.gameType,
    street: state.street,

    stakes: {
      ante: state.ante,
      bringIn: state.bringIn,
      smallBet: state.smallBet,
      bigBet: state.bigBet,
    },

    bringInIndex: state.bringInIndex,
    currentActorIndex: state.currentActorIndex,
    pot: state.pot,
    currentBet: state.currentBet,
    raiseCount: state.raiseCount,

    checksThisStreet: state.checksThisStreet,
    pendingResponseCount: state.pendingResponseCount,

    me,
    players,
  };
};
