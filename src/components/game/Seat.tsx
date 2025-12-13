
import { Avatar } from '@/components/ui/Avatar';
import { ChipStack } from '@/components/ui/Chip';
import { HandContainer } from './HandContainer';
import type { Player } from '@/types';
import { cn } from '@/lib/utils';

interface SeatProps {
  player: Player | null; // Seat might be empty
  isActivePlayer: boolean;
  positionStr: string; // CSS Positioning class or style
  isHero: boolean;
}

export const Seat = ({ player, isActivePlayer, positionStr, isHero }: SeatProps) => {
  if (!player) {
    return (
      <div className={cn("absolute flex flex-col items-center justify-center w-32 h-32 opacity-20", positionStr)}>
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center">
          <span className="text-xs">Empty</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center w-48 transition-all duration-300", positionStr)}>
      {/* Action Bubble */}
      {player.lastAction && (
         <div className="absolute -top-12 z-50 animate-bounce-in">
           <div className="bg-white text-black text-sm font-bold px-3 py-1 rounded-full shadow-lg border-2 border-primary relative">
             {player.lastAction}
             <div className="absolute bottom-[-6px] left-1/2 -ml-1 w-2 h-2 bg-white rotate-45 border-b-2 border-r-2 border-primary" />
           </div>
         </div>
      )}

      {/* Hand - Stud specific: Hand is placed "in front" (which visually might mean below or above depending on view)
          Design doc says: "In front of avatar".
          For Hero (bottom): Hand is above avatar? Or below? Usually hand is closest to center of table?
          Actually "In front" relative to player usually means closer to table center.
      */}
      <div className={cn("mb-2 relative z-10", player.hasFolded && "opacity-40 grayscale")}>
         <HandContainer hand={player.hand} isHero={isHero} />
      </div>

      <div className="relative z-20 flex flex-col items-center">
        <Avatar player={player} isActivePlayer={isActivePlayer} />
        <ChipStack amount={player.chips} className="mt-2" />
      </div>
    </div>
  );
};
