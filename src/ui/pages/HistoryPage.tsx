import type React from "react";
import { useAppStore } from "../../app/store/appStore";
import { DealDetailPanel } from "../components/history/DealDetailPanel";
import { DealSummaryList } from "../components/history/DealSummaryList";

export const HistoryPage: React.FC = () => {
  const game = useAppStore((state) => state.game);
  const selectedDealId = useAppStore((state) => state.ui.selectedDealId);
  const setScreen = useAppStore((state) => state.setScreen);

  const dealHistory = game?.dealHistory ?? [];

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-2xl font-bold">履歴</h1>
        <button
          type="button"
          onClick={() => setScreen("PLAY")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          プレイに戻る
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* List */}
        <div className="w-1/2 border-r border-border overflow-y-auto">
          {dealHistory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              履歴がありません
            </div>
          ) : (
            <DealSummaryList />
          )}
        </div>

        {/* Detail */}
        <div className="w-1/2 overflow-y-auto">
          {selectedDealId ? (
            <DealDetailPanel dealId={selectedDealId} />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              ディールを選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
