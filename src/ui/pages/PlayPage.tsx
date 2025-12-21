import type React from "react";
import { useAppStore } from "../../app/store/appStore";
import type { GameState } from "../../domain/types";
import { ActionPanel } from "../components/play/ActionPanel";
import { GameHeader } from "../components/play/GameHeader";
import { TableView } from "../components/TableView/TableView";

const StartDealButton: React.FC<{ game: GameState }> = ({ game }) => {
  const startDeal = useAppStore((state) => state.startDeal);
  return (
    <button
      type="button"
      onClick={() => {
        startDeal({
          rngSeed: Math.random().toString(),
          seatOrder: game.players.map((p) => p.id),
        });
      }}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
    >
      Start New Deal
    </button>
  );
};

export const PlayPage: React.FC = () => {
  const game = useAppStore((state) => state.game);
  const fullStore = useAppStore((state) => state.fullStore);
  const setScreen = useAppStore((state) => state.setScreen);

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-card rounded-xl p-8 text-center shadow-sm border">
          <p className="text-muted-foreground mb-4">No game in progress</p>
          <button
            type="button"
            onClick={() => setScreen("SETUP")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
          >
            Go to Setup
          </button>
        </div>
      </div>
    );
  }

  // currentDealがない場合、最新の終了したディールを取得
  const displayDeal =
    game.currentDeal ||
    (() => {
      if (game.dealHistory.length === 0) return null;
      const lastDealId = game.dealHistory[0].dealId;
      return fullStore.fullDealsById[lastDealId] || null;
    })();

  // ディールが全く存在しない場合（初回起動時など）
  if (!displayDeal) {
    return (
      <div className="h-full w-full flex flex-col p-6 space-y-6 overflow-hidden">
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="bg-card rounded-xl p-8 text-center shadow-sm border">
            <p className="text-muted-foreground mb-4">No deal available</p>
            <StartDealButton game={game} />
          </div>
        </div>
      </div>
    );
  }

  const isDealFinished = !game.currentDeal;
  // 終了したディールの場合、対応するDealSummaryを取得
  const dealSummary =
    isDealFinished && game.dealHistory.length > 0
      ? game.dealHistory.find((s) => s.dealId === displayDeal.dealId) || null
      : null;

  return (
    <div className="h-full w-full flex flex-col p-6 space-y-6 overflow-hidden">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScreen("HISTORY")}
              className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
            >
              履歴
            </button>
            <button
              type="button"
              onClick={() => setScreen("SETTINGS")}
              className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
            >
              設定
            </button>
          </div>
        </div>
        <GameHeader deal={displayDeal} dealIndex={game.dealIndex} />
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <TableView deal={displayDeal} game={game} dealSummary={dealSummary} />
      </div>
      <div className="flex-shrink-0">
        {isDealFinished ? (
          <div className="flex justify-center">
            <StartDealButton game={game} />
          </div>
        ) : (
          <ActionPanel
            deal={displayDeal}
            currentSeat={displayDeal.currentActorIndex}
          />
        )}
      </div>
    </div>
  );
};
