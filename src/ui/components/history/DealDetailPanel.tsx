import type React from "react";
import { useAppStore } from "../../../app/store/appStore";
import { getGameTypeLabel } from "../../utils/labelHelper";
import { DealDetailFull } from "./DealDetailFull";
import { DealDetailSummary } from "./DealDetailSummary";
import { FavoriteToggleButton } from "./FavoriteToggleButton";

interface DealDetailPanelProps {
  dealId: string;
}

export const DealDetailPanel: React.FC<DealDetailPanelProps> = ({ dealId }) => {
  const game = useAppStore((state) => state.game);
  const fullStore = useAppStore((state) => state.fullStore);
  const setSelectedDealId = useAppStore((state) => state.setSelectedDealId);

  const summary = game?.dealHistory.find((d) => d.dealId === dealId);
  const fullDeal = fullStore.fullDealsById[dealId];
  const hasFull = fullDeal != null;

  if (!summary) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        ディールが見つかりません
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const duration = summary.endedAt - summary.startedAt;
  const durationSeconds = Math.floor(duration / 1000);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationDisplay =
    durationMinutes > 0
      ? `${durationMinutes}分${durationSeconds % 60}秒`
      : `${durationSeconds}秒`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold mb-2">
            #{dealId.slice(0, 8)} - {getGameTypeLabel(summary.gameType)}
          </h2>
          <div className="text-sm text-muted-foreground">
            <div>開始: {formatDate(summary.startedAt)}</div>
            <div>終了: {formatDate(summary.endedAt)}</div>
            <div>所要時間: {durationDisplay}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelectedDealId(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {/* Favorite Button */}
      {hasFull && (
        <div className="mb-4">
          <FavoriteToggleButton dealId={dealId} />
        </div>
      )}

      {/* Summary */}
      <DealDetailSummary summary={summary} />

      {/* Full Detail */}
      {hasFull && fullDeal && (
        <div className="mt-6 pt-6 border-t border-border">
          <DealDetailFull deal={fullDeal} summary={summary} />
        </div>
      )}

      {!hasFull && (
        <div className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground">
          このディールのフルデータは保存されていません（直近10ディールのみフル保存されます）
        </div>
      )}
    </div>
  );
};
