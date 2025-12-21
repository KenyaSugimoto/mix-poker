import type React from "react";
import { useAppStore } from "../../../app/store/appStore";
import type { DealSummary } from "../../../domain/types";

interface DealDetailSummaryProps {
  summary: DealSummary;
}

export const DealDetailSummary: React.FC<DealDetailSummaryProps> = ({
  summary,
}) => {
  const game = useAppStore((state) => state.game);
  const players = game?.players ?? [];

  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name ?? playerId;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">結果</h3>
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium">ポット:</span> {summary.pot}
          </div>
          <div>
            <span className="font-medium">勝者 (High):</span>{" "}
            {summary.winnersHigh.length > 0
              ? summary.winnersHigh.map(getPlayerName).join(", ")
              : "なし"}
          </div>
          {summary.winnersLow && summary.winnersLow.length > 0 && (
            <div>
              <span className="font-medium">勝者 (Low):</span>{" "}
              {summary.winnersLow.map(getPlayerName).join(", ")}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">スコア変動</h3>
        <div className="space-y-1 text-sm">
          {Object.entries(summary.deltaStacks).map(([playerId, delta]) => (
            <div key={playerId}>
              <span className="font-medium">{getPlayerName(playerId)}:</span>{" "}
              <span className={delta > 0 ? "text-green-600" : "text-red-600"}>
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">ポット分配</h3>
        <div className="space-y-1 text-sm">
          {Object.entries(summary.potShare).map(([playerId, share]) => {
            if (share === 0) return null;
            return (
              <div key={playerId}>
                <span className="font-medium">{getPlayerName(playerId)}:</span>{" "}
                +{share}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
