
import { ChipStack } from '@/components/ui/Chip';
import type { Street } from '@/types';

interface GameInfoProps {
  pot: number;
  street: Street;
}

export const GameInfo = ({ pot, street }: GameInfoProps) => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-0">
      <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
        {street}
      </div>

      <div className="flex flex-col items-center bg-black/30 px-6 py-4 rounded-full border border-white/5 backdrop-blur-sm">
        <span className="text-slate-400 text-[10px] mb-1">TOTAL POT</span>
        <div className="flex items-center gap-2">
           <ChipStack amount={pot} />
           <span className="text-2xl font-bold text-amber-500 font-mono">${pot}</span>
        </div>
      </div>
    </div>
  );
};
