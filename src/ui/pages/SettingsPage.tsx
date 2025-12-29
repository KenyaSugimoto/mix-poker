import type React from "react";
import { useAppStore } from "../../app/store/appStore";
import { CpuLevelToggle } from "../components/settings/CpuLevelToggle";
import { DangerZoneResetAll } from "../components/settings/DangerZoneResetAll";
import { DisplayUnitToggle } from "../components/settings/DisplayUnitToggle";

export const SettingsPage: React.FC = () => {
  const setScreen = useAppStore((state) => state.setScreen);
  const game = useAppStore((state) => state.game);
  const fullStore = useAppStore((state) => state.fullStore);

  const dealHistoryCount = game?.dealHistory.length ?? 0;
  const fullDealCount = fullStore.fullDealIds.length;
  const favoriteCount = fullStore.favoriteDealIds.length;

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-2xl font-bold">設定</h1>
        <button
          type="button"
          onClick={() => setScreen("PLAY")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          プレイに戻る
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Display Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">表示設定</h2>
            <DisplayUnitToggle />
          </section>

          {/* CPU Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">CPU設定</h2>
            <CpuLevelToggle />
          </section>

          {/* Data Info */}
          <section>
            <h2 className="text-xl font-semibold mb-4">データ情報</h2>
            <div className="bg-muted p-4 rounded space-y-2 text-sm">
              <div>
                <span className="font-medium">履歴件数:</span>{" "}
                {dealHistoryCount}
                /200
              </div>
              <div>
                <span className="font-medium">フル保存件数:</span>{" "}
                {fullDealCount}
                /10
              </div>
              <div>
                <span className="font-medium">お気に入り件数:</span>{" "}
                {favoriteCount}/50
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-destructive">
              危険な操作
            </h2>
            <DangerZoneResetAll />
          </section>
        </div>
      </div>
    </div>
  );
};
