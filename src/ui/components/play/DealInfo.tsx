import type React from "react";
import type { DealState } from "../../../domain/types";
import { UI_STRINGS } from "../../constants/uiStrings";

interface DealInfoProps {
  deal: DealState;
  dealIndex: number;
}

export const DealInfo: React.FC<DealInfoProps> = ({ deal }) => {
  return (
    <div className="bg-poker-green/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-white/20 min-w-[200px]">
      <div className="flex flex-col gap-1.5">
        {/* ステークス情報 */}
        <div className="flex items-center justify-between gap-3 text-[10px]">
          <div className="flex flex-col">
            <span className="text-white/40 leading-tight">
              {UI_STRINGS.STAKES.ANTE}
            </span>
            <span className="font-bold text-white leading-tight">
              {deal.ante}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 leading-tight">
              {UI_STRINGS.STAKES.BRING_IN}
            </span>
            <span className="font-bold text-white leading-tight">
              {deal.bringIn}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 leading-tight">
              {UI_STRINGS.STAKES.SMALL_BET}
            </span>
            <span className="font-bold text-white leading-tight">
              {deal.smallBet}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 leading-tight">
              {UI_STRINGS.STAKES.BIG_BET}
            </span>
            <span className="font-bold text-white leading-tight">
              {deal.bigBet}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
