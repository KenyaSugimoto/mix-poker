
import { User, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';

interface AvatarProps {
  player: Player;
  isActivePlayer: boolean;
  className?: string;
}

export const Avatar = ({ player, isActivePlayer, className }: AvatarProps) => {
  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Glow effect for active player */}
      {isActivePlayer && (
        <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full scale-150 animate-pulse" />
      )}

      <div className={cn(
        "w-16 h-16 rounded-full border-2 flex items-center justify-center bg-surface relative z-10",
        isActivePlayer ? "border-primary shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "border-slate-600",
        player.hasFolded && "opacity-50 grayscale"
      )}>
        {player.isHuman ? (
          <User className={cn("w-8 h-8", isActivePlayer ? "text-primary" : "text-slate-400")} />
        ) : (
          <Cpu className={cn("w-8 h-8", isActivePlayer ? "text-primary" : "text-slate-400")} />
        )}
      </div>

      <div className="absolute -bottom-3 bg-black/80 px-2 py-0.5 rounded text-xs font-bold border border-white/10 whitespace-nowrap z-20">
        {player.name}
      </div>
    </div>
  );
};
