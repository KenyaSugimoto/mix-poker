
import { Button } from '@/components/ui/Button';
import type { ActionType } from '@/types';
import { cn } from '@/lib/utils';

interface ActionPanelProps {
  validActions: ActionType[];
  onAction: (type: ActionType) => void;
  className?: string;
  minBet?: number; // For label display
  heroStack?: number; // Checks for all-in
}

export const ActionPanel = ({ validActions, onAction, className, minBet = 0 }: ActionPanelProps) => {
  if (validActions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-4 bg-black/80 text-slate-400 rounded-t-xl border-t border-white/10 w-full md:w-auto md:min-w-[400px]", className)}>
        <span className="animate-pulse">Waiting for opponents...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end justify-center gap-4 p-6 bg-gradient-to-t from-black to-black/80 border-t border-white/10 w-full shadow-2xl safe-area-bottom", className)}>

      {validActions.includes('fold') && (
        <Button variant="danger" onClick={() => onAction('fold')} className="w-24 h-14 text-lg">
          Fold
        </Button>
      )}

      {validActions.includes('check') && (
        <Button variant="secondary" onClick={() => onAction('check')} className="w-24 h-14 text-lg">
          Check
        </Button>
      )}

      {validActions.includes('call') && (
        <Button variant="secondary" onClick={() => onAction('call')} className="w-28 h-14 flex flex-col items-center justify-center leading-none gap-1">
          <span className="text-lg">Call</span>
          <span className="text-xs opacity-70">${minBet}</span>
        </Button>
      )}

      {validActions.includes('bring-in') && (
        <Button variant="outline" onClick={() => onAction('bring-in')} className="w-28 h-14 flex flex-col items-center justify-center leading-none gap-1">
          <span className="text-sm">Bring In</span>
          <span className="text-xs opacity-70">${minBet}</span>
        </Button>
      )}

      {validActions.includes('complete') && (
        <Button variant="primary" onClick={() => onAction('complete')} className="w-28 h-14 flex flex-col items-center justify-center leading-none gap-1">
          <span className="text-lg">Complete</span>
          <span className="text-xs opacity-70">${minBet}</span>
        </Button>
      )}

      {validActions.includes('bet') && (
        <Button variant="primary" onClick={() => onAction('bet')} className="w-28 h-14 flex flex-col items-center justify-center leading-none gap-1">
          <span className="text-lg">Bet</span>
          <span className="text-xs opacity-70">${minBet}</span>
        </Button>
      )}

      {validActions.includes('raise') && (
        <Button variant="primary" onClick={() => onAction('raise')} className="w-28 h-14 flex flex-col items-center justify-center leading-none gap-1">
          <span className="text-lg">Raise</span>
          <span className="text-xs opacity-70">${minBet}</span>
        </Button>
      )}
    </div>
  );
};
