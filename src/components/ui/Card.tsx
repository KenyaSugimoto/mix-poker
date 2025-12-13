
import { cn } from '@/lib/utils';
import { Heart, Diamond, Club, Spade } from 'lucide-react';
import type { Card as CardType } from '@/types';

// Utility for display
const getSuitIcon = (suit: string) => {
  switch (suit) {
    case 'h': return <Heart className="w-full h-full fill-current" />;
    case 'd': return <Diamond className="w-full h-full fill-current" />;
    case 'c': return <Club className="w-full h-full fill-current" />;
    case 's': return <Spade className="w-full h-full fill-current" />;
    default: return null;
  }
};

const getSuitColor = (suit: string) => {
  switch (suit) {
    case 'h': return 'text-red-600'; // 2-color: red
    case 'd': return 'text-red-600'; // 2-color: red
    case 'c': return 'text-slate-900'; // 2-color: black
    case 's': return 'text-slate-900'; // 2-color: black
    default: return 'text-slate-500';
  }
};

interface CardProps {
  card: CardType;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ card, className, onClick }: CardProps) => {
  if (!card.isFaceUp) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "w-12 h-18 sm:w-16 sm:h-24 rounded-lg bg-blue-900 border-2 border-white/20 shadow-md",
          "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat",
          "flex items-center justify-center cursor-pointer hover:brightness-110",
          className
        )}
      >
        <div className="w-8 h-12 sm:w-10 sm:h-16 rounded border border-white/10 bg-white/5" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-12 h-18 sm:w-16 sm:h-24 rounded-lg bg-white border border-slate-300 shadow-md relative overflow-hidden",
        "flex flex-col items-center justify-between p-0.5 sm:p-1 select-none",
        getSuitColor(card.suit),
        className
      )}
    >
      <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 flex flex-col items-center leading-none">
        <span className="font-bold text-sm sm:text-lg">{card.rank}</span>
        <div className="w-2 h-2 sm:w-3 sm:h-3">
          {getSuitIcon(card.suit)}
        </div>
      </div>

      <div className="w-6 h-6 sm:w-8 sm:h-8 opacity-20 transform scale-150">
          {getSuitIcon(card.suit)}
      </div>

      <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex flex-col items-center leading-none rotate-180">
        <span className="font-bold text-sm sm:text-lg">{card.rank}</span>
        <div className="w-2 h-2 sm:w-3 sm:h-3">
          {getSuitIcon(card.suit)}
        </div>
      </div>
    </div>
  );
};
