import type { GameType, PlayerId, SeatIndex } from "../types";

/**
 * ポットを分配する（ante単位）
 * @param gameType ゲーム種別
 * @param pot ポット総額
 * @param winnersHigh High勝者のseat配列
 * @param winnersLow Low勝者のseat配列（nullの場合はLow不成立）
 * @param seatToPlayerId seatからPlayerIdへの変換関数
 * @returns PlayerIdごとの配分額（deltaStacksの一部）
 */
export const distributePot = (
  gameType: GameType,
  pot: number,
  winnersHigh: SeatIndex[],
  winnersLow: SeatIndex[] | null,
  seatToPlayerId: (seat: SeatIndex) => PlayerId,
): Record<PlayerId, number> => {
  const result: Record<PlayerId, number> = {};

  if (gameType === "studHi" || gameType === "razz") {
    // Stud Hi / Razz: High勝者に均等分配
    if (winnersHigh.length === 0) return result;

    const sharePerWinner = Math.floor(pot / winnersHigh.length);
    const remainder = pot % winnersHigh.length;

    for (let i = 0; i < winnersHigh.length; i++) {
      const pid = seatToPlayerId(winnersHigh[i]);
      result[pid] = (result[pid] || 0) + sharePerWinner;
    }

    // 端数はseat順で配布（seat番号が若い順）
    const sortedWinners = [...winnersHigh].sort((a, b) => a - b);
    for (let i = 0; i < remainder; i++) {
      const pid = seatToPlayerId(sortedWinners[i]);
      result[pid] = (result[pid] || 0) + 1; // ante単位なので+1
    }
  } else if (gameType === "stud8") {
    // Stud8: Hi/Lowスプリット
    if (winnersLow === null || winnersLow.length === 0) {
      // Low不成立: Hi勝者が総取り
      if (winnersHigh.length === 0) return result;

      const sharePerWinner = Math.floor(pot / winnersHigh.length);
      const remainder = pot % winnersHigh.length;

      for (let i = 0; i < winnersHigh.length; i++) {
        const pid = seatToPlayerId(winnersHigh[i]);
        result[pid] = (result[pid] || 0) + sharePerWinner;
      }

      const sortedWinners = [...winnersHigh].sort((a, b) => a - b);
      for (let i = 0; i < remainder; i++) {
        const pid = seatToPlayerId(sortedWinners[i]);
        result[pid] = (result[pid] || 0) + 1;
      }
    } else {
      // Low成立: ポットを2分割（端数はHi側へ）
      const lowPot = Math.floor(pot / 2);
      const hiPot = pot - lowPot; // 端数はHi側

      // Hi勝者に分配
      if (winnersHigh.length > 0) {
        const hiSharePerWinner = Math.floor(hiPot / winnersHigh.length);
        const hiRemainder = hiPot % winnersHigh.length;

        for (let i = 0; i < winnersHigh.length; i++) {
          const pid = seatToPlayerId(winnersHigh[i]);
          result[pid] = (result[pid] || 0) + hiSharePerWinner;
        }

        const sortedHiWinners = [...winnersHigh].sort((a, b) => a - b);
        for (let i = 0; i < hiRemainder; i++) {
          const pid = seatToPlayerId(sortedHiWinners[i]);
          result[pid] = (result[pid] || 0) + 1;
        }
      }

      // Low勝者に分配
      const lowSharePerWinner = Math.floor(lowPot / winnersLow.length);
      const lowRemainder = lowPot % winnersLow.length;

      for (let i = 0; i < winnersLow.length; i++) {
        const pid = seatToPlayerId(winnersLow[i]);
        result[pid] = (result[pid] || 0) + lowSharePerWinner;
      }

      const sortedLowWinners = [...winnersLow].sort((a, b) => a - b);
      for (let i = 0; i < lowRemainder; i++) {
        const pid = seatToPlayerId(sortedLowWinners[i]);
        result[pid] = (result[pid] || 0) + 1;
      }

      // Hi/Low同一プレイヤーの場合は総取り（既に両方に加算済みなのでそのまま）
    }
  }

  return result;
};
