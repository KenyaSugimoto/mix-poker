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

  if (!game.currentDeal) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-card rounded-xl p-8 text-center shadow-sm border">
          <p className="text-muted-foreground mb-4">No active deal</p>
          <StartDealButton game={game} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-6 space-y-6 overflow-hidden">
      <div className="flex-shrink-0">
        <GameHeader deal={game.currentDeal} dealIndex={game.dealIndex} />
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <TableView deal={game.currentDeal} game={game} />
      </div>
      <div className="flex-shrink-0">
        <ActionPanel
          deal={game.currentDeal}
          currentSeat={game.currentDeal.currentActorIndex}
        />
      </div>
    </div>
  );
};
