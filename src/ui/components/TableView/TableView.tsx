import type React from "react";
import { evaluateStudHi } from "../../../domain/showdown/resolveShowdown";
import type { DealState, DealSummary, GameState } from "../../../domain/types";
import { getHandRankLabel } from "../../utils/handRankLabel";
import { PotStackBadge } from "./PotStackBadge";
import { SeatPanel } from "./SeatPanel";

interface TableViewProps {
  deal: DealState;
  game: GameState;
  dealSummary: DealSummary | null; // 終了したディールの場合の結果情報
}

export const TableView: React.FC<TableViewProps> = ({
  deal,
  game,
  dealSummary,
}) => {
  // 役の計算（dealFinished時のみ）
  const handRankLabels: Record<number, string | null> = {};
  if (deal.dealFinished) {
    for (const seat of Object.keys(deal.hands)) {
      const seatIdx = Number(seat);
      const player = deal.players.find((p) => p.seat === seatIdx);
      if (player?.active) {
        const hand = deal.hands[seatIdx];
        const cards = [...hand.downCards, ...hand.upCards];
        if (cards.length >= 5) {
          const result = evaluateStudHi(cards);
          handRankLabels[seatIdx] = getHandRankLabel(result.rank);
        }
      }
    }
  }

  // 勝者情報をseatIndexベースに変換
  const winnerSeats = new Set<number>();
  if (dealSummary) {
    // PlayerIdからseatIndexに変換
    dealSummary.winnersHigh.forEach((playerId) => {
      const seatIndex = deal.seatOrder.indexOf(playerId);
      if (seatIndex >= 0) {
        winnerSeats.add(seatIndex);
      }
    });
    dealSummary.winnersLow?.forEach((playerId) => {
      const seatIndex = deal.seatOrder.indexOf(playerId);
      if (seatIndex >= 0) {
        winnerSeats.add(seatIndex);
      }
    });
  }

  // プレイヤー数に応じてテーブルサイズを調整
  const getTableSize = (playerCount: number) => {
    if (playerCount <= 3) return "max-w-[1200px] max-h-[800px] min-h-[600px]";
    if (playerCount <= 5) return "max-w-[1400px] max-h-[900px] min-h-[700px]";
    return "max-w-[1600px] max-h-[1000px] min-h-[800px]"; // 6-7人
  };

  return (
    <div
      className={`relative w-full h-full ${getTableSize(deal.playerCount)} bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-xl border-4 border-green-700 overflow-hidden p-8`}
    >
      {/* テーブル中央のポット表示 */}
      <div className="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <PotStackBadge pot={deal.pot} ante={deal.ante} />
        {/* ポット額（コンパクト） */}
        <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 shadow-md backdrop-blur-sm">
          <div className="text-sm font-bold tabular-nums text-white">
            {deal.pot}
          </div>
        </div>
      </div>
      {/* 各プレイヤーのSeatPanel */}
      {deal.players.map((player, index) => {
        // DealStateのplayersはseat順に並んでいるが、GameStateのplayersはID順
        // ここでは簡易的にindexで対応（本来はIDでマッチングすべき）
        const gamePlayer = game.players[index];
        const playerName = gamePlayer?.name ?? `Player ${index + 1}`;
        const isCurrentActor = deal.currentActorIndex === index;
        const isWinner = winnerSeats.has(index);

        // 獲得額を取得（potShareから）
        const playerId = deal.seatOrder[index];
        const winningsAmount = dealSummary?.potShare[playerId] ?? null;

        return (
          <SeatPanel
            key={player.seat}
            player={player}
            playerName={playerName}
            isCurrentActor={isCurrentActor}
            seatIndex={index}
            totalSeats={deal.playerCount}
            players={deal.players}
            deal={deal}
            isDealFinished={deal.dealFinished}
            isWinner={isWinner}
            winningsAmount={winningsAmount}
            handRankLabel={handRankLabels[player.seat] ?? null}
          />
        );
      })}
    </div>
  );
};
