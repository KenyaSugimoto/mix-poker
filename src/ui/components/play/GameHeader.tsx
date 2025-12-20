import type React from "react";
import type { DealState } from "../../../domain/types";
import { getGameTypeLabel } from "../../utils/labelHelper";

interface GameHeaderProps {
  deal: DealState;
  dealIndex: number;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ deal, dealIndex }) => {
  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {getGameTypeLabel(deal.gameType)}
          </h2>
          <p className="text-sm text-muted-foreground">
            Deal #{dealIndex + 1} • {deal.street} Street
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-muted-foreground">Pot</div>
          <div className="text-xl font-bold">{deal.pot}</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Ante</div>
          <div className="font-semibold">{deal.ante}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Small Bet</div>
          <div className="font-semibold">{deal.smallBet}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Big Bet</div>
          <div className="font-semibold">{deal.bigBet}</div>
        </div>
      </div>
    </div>
  );
};
