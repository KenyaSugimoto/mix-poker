import type React from "react";
import type { DealState, DealSummary } from "../../../domain/types";

interface DealDetailFullProps {
  deal: DealState;
  summary: DealSummary;
}

export const DealDetailFull: React.FC<DealDetailFullProps> = ({
  deal,
  summary,
}) => {
  const formatCard = (card: { suit: string; rank: string }) => {
    const suitMap: Record<string, string> = {
      c: "♣",
      d: "♦",
      h: "♥",
      s: "♠",
    };
    return `${card.rank}${suitMap[card.suit] ?? card.suit}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">フル詳細</h3>

      {/* Cards by Seat */}
      <div>
        <h4 className="font-medium mb-2">カード</h4>
        <div className="space-y-3">
          {deal.players.map((player) => {
            const hand = deal.hands[player.seat];
            if (!hand) return null;

            const playerId = deal.seatOrder[player.seat];
            const isWinner =
              summary.winnersHigh.includes(playerId) ||
              summary.winnersLow?.includes(playerId);

            return (
              <div
                key={player.seat}
                className={`p-3 rounded border ${
                  isWinner ? "border-green-500 bg-green-900" : "border-border"
                }`}
              >
                <div className="font-medium mb-1">
                  Seat {player.seat} {isWinner && "(勝者)"}
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Down:</span>{" "}
                    {hand.downCards.length > 0
                      ? hand.downCards.map(formatCard).join(", ")
                      : "なし"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Up:</span>{" "}
                    {hand.upCards.length > 0
                      ? hand.upCards.map(formatCard).join(", ")
                      : "なし"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional info */}
      <div className="text-sm text-muted-foreground">
        <div>ストリート: {deal.street}</div>
        <div>ポット: {deal.pot}</div>
        <div>
          アクティブプレイヤー数: {deal.players.filter((p) => p.active).length}
        </div>
      </div>
    </div>
  );
};
