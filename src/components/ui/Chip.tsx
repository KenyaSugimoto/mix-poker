
import { cn } from '@/lib/utils';

interface ChipProps {
  amount: number;
  className?: string;
}

const getChipColor = (value: number) => {
  if (value >= 500) return 'bg-purple-600 border-purple-800 text-white'; // $500
  if (value >= 100) return 'bg-slate-900 border-slate-700 text-white';   // $100
  if (value >= 25) return 'bg-green-600 border-green-800 text-white';    // $25
  if (value >= 5) return 'bg-red-600 border-red-800 text-white';         // $5
  return 'bg-blue-600 border-blue-800 text-white';                       // $1
};

export const Chip = ({ amount, className }: ChipProps) => {
  return (
    <div className={cn(
      "relative flex items-center justify-center rounded-full shadow-lg border-dashed border-2",
      "w-8 h-8",
      getChipColor(amount),
      className
    )}>
      <div className="absolute inset-0 rounded-full border border-white/20" />
    </div>
  );
};

// Component to display a stack of chips or total value
export const ChipStack = ({ amount, className }: { amount: number; className?: string }) => {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="flex -space-x-4 items-end justify-center h-8">
        {/* Simplified visualization: just showing one or two relevant chips */}
        <Chip amount={amount > 500 ? 500 : amount > 100 ? 100 : amount > 25 ? 25 : 5} />
        {amount > 25 && <Chip amount={amount > 100 ? 100 : 25} className="-ml-3 mt-1" />}
      </div>
      <span className="text-xs font-mono text-amber-400 font-bold bg-black/40 px-2 rounded-full border border-white/10">
        ${amount}
      </span>
    </div>
  );
};
