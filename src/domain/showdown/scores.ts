import type { DealState, PlayerId, SeatIndex } from "../types";

/**
 * deltaStacksを計算する
 * @param deal ディール終了時のDealState
 * @param potShare ポット分配結果（PlayerIdごとの配分額）
 * @param seatToPlayerId seatからPlayerIdへの変換関数
 * @returns PlayerIdごとのスタック変動（-committedTotal + potShare）
 */
export const calcDeltaStacks = (
  deal: DealState,
  potShare: Record<PlayerId, number>,
  seatToPlayerId: (seat: SeatIndex) => PlayerId,
): Record<PlayerId, number> => {
  const delta: Record<PlayerId, number> = {};

  // まず全員のcommittedTotalをマイナス
  for (const player of deal.players) {
    const pid = seatToPlayerId(player.seat);
    delta[pid] = (delta[pid] || 0) - player.committedTotal;
  }

  // 次に勝者へpotShareをプラス
  for (const pid of Object.keys(potShare)) {
    delta[pid] = (delta[pid] || 0) + potShare[pid];
  }

  return delta;
};
