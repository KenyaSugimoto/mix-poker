import type React from "react";
import { useAppStore } from "../../../app/store/appStore";
import type { DealSummary } from "../../../domain/types";
import { getGameTypeLabel } from "../../utils/labelHelper";

interface DealSummaryRowProps {
  summary: DealSummary;
}

export const DealSummaryRow: React.FC<DealSummaryRowProps> = ({ summary }) => {
  const selectedDealId = useAppStore((state) => state.ui.selectedDealId);
  const setSelectedDealId = useAppStore((state) => state.setSelectedDealId);
  const fullStore = useAppStore((state) => state.fullStore);
  const isSelected = selectedDealId === summary.dealId;
  const hasFull = fullStore.fullDealsById[summary.dealId] != null;

  const handleClick = () => {
    setSelectedDealId(summary.dealId);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDeltaStacks = (deltaStacks: Record<string, number>) => {
    const entries = Object.entries(deltaStacks);
    const winners = entries.filter(([, delta]) => delta > 0);
    const losers = entries.filter(([, delta]) => delta < 0);

    const parts: string[] = [];
    if (winners.length > 0) {
      parts.push(`勝者: ${winners.map(([, delta]) => `+${delta}`).join(", ")}`);
    }
    if (losers.length > 0) {
      parts.push(`敗者: ${losers.map(([, delta]) => `${delta}`).join(", ")}`);
    }
    return parts.join(" | ");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left p-4 cursor-pointer hover:bg-muted transition-colors ${
        isSelected ? "bg-muted border-l-4 border-l-primary" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">#{summary.dealId.slice(0, 8)}</span>
            <span className="text-sm text-muted-foreground">
              {getGameTypeLabel(summary.gameType)}
            </span>
            {hasFull && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                フルあり
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mb-1">
            {formatDate(summary.startedAt)}
          </div>
          <div className="text-sm">
            <div>ポット: {summary.pot}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDeltaStacks(summary.deltaStacks)}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};
