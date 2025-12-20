import type { DealState, SeatIndex } from "../types";

/**
 * ベット額が有効か確認し、スタックから差し引く額を計算する
 */
export const calculateBetAmount = (
  state: DealState,
  seat: SeatIndex,
  requestedAmount: number,
): { stackDecrement: number; newCommittedThisStreet: number } => {
  const player = state.players[seat];
  const currentCommitted = player.committedThisStreet;

  // プレイヤーが実際に出すべき追加額
  const decrement = Math.min(player.stack, requestedAmount - currentCommitted);

  return {
    stackDecrement: decrement,
    newCommittedThisStreet: currentCommitted + decrement,
  };
};

/**
 * 現在のストリートでの「有効なベット額（フルベット）」を取得
 */
export const getCurrentStreetBetSize = (state: DealState): number => {
  const { street, smallBet, bigBet } = state;
  if (street === "3rd" || street === "4th") {
    return smallBet;
  }
  return bigBet;
};
