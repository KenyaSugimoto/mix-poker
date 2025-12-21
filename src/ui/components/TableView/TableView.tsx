import type React from "react";
import type { DealState, DealSummary, GameState } from "../../../domain/types";
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

  return (
    <div className="relative w-full max-w-[1200px] h-full max-h-[800px] min-h-[600px] bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-xl border-4 border-green-700 overflow-hidden p-8">
      {/* テーブル中央のポット表示 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="bg-card/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Pot</div>
            <div className="text-2xl font-bold">{deal.pot}</div>
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
          />
        );
      })}
    </div>
  );
};
