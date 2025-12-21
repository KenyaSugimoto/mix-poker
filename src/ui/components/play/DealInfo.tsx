import type React from "react";
import type { DealState } from "../../../domain/types";
import { getGameTypeLabel } from "../../utils/labelHelper";

interface DealInfoProps {
  deal: DealState;
  dealIndex: number;
}

export const DealInfo: React.FC<DealInfoProps> = ({ deal, dealIndex }) => {
  return (
    <div className="bg-card rounded-xl p-3 shadow-sm border">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-sm font-semibold">
              {getGameTypeLabel(deal.gameType)}
            </h3>
            <p className="text-xs text-muted-foreground">
              Deal #{dealIndex + 1} • {deal.street} Street
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 border-l pl-4 text-xs">
          <div>
            <div className="text-muted-foreground">Ante</div>
            <div className="font-semibold">{deal.ante}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Bring In</div>
            <div className="font-semibold">{deal.bringIn}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Complete(Small)</div>
            <div className="font-semibold">{deal.smallBet}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Big</div>
            <div className="font-semibold">{deal.bigBet}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
