import type React from "react";
import type { DealState } from "../../../domain/types";

interface DealInfoProps {
  deal: DealState;
  dealIndex: number;
}

export const DealInfo: React.FC<DealInfoProps> = ({ deal }) => {
  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-white/20 min-w-[200px]">
      <div className="flex flex-col gap-1.5">
        {/* ステークス情報 */}
        <div className="flex items-center justify-between gap-3 text-[10px]">
          <div className="flex flex-col">
            <span className="text-white/40 leading-tight">Ante</span>
            <span className="font-bold text-white leading-tight">
              {deal.ante}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 leading-tight">Bring In</span>
            <span className="font-bold text-white leading-tight">
              {deal.bringIn}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 leading-tight">
              Small Bet (comp)
            </span>
            <span className="font-bold text-white leading-tight">
              {deal.smallBet}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 leading-tight">Big Bet</span>
            <span className="font-bold text-white leading-tight">
              {deal.bigBet}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
