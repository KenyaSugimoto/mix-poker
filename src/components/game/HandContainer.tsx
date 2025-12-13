
import { Card } from '@/components/ui/Card';
import type { Hand, Card as CardType } from '@/types';
import { cn } from '@/lib/utils';

interface HandContainerProps {
  hand: Hand;
  isHero: boolean; // Hero's hand is fully visible to them
  className?: string;
}

export const HandContainer = ({ hand, isHero, className }: HandContainerProps) => {
  // Stud overlapping: Cards are laid out horizontally but overlapped.
  // Up-cards are offset vertically to distinguish from down-cards.

  return (
    <div className={cn("flex items-end justify-center h-28 sm:h-32 perspective-1000", className)}>
      {hand.map((card, index) => {
        // Validation: Ensure valid card object
        if (!card) return null;

        // For Hero, show all cards face-up (clone with isFaceUp = true)
        const displayCard: CardType = isHero
          ? { ...card, isFaceUp: true }
          : card;

        // Up-cards (isFaceUp in original state) are offset upward
        const isUpCard = card.isFaceUp;

        return (
          <div
            key={card.id || index}
            style={{
              marginLeft: index === 0 ? 0 : undefined,
            }}
            className={cn(
              "transition-transform duration-300 hover:-translate-y-2 relative",
              isUpCard && "-translate-y-3 sm:-translate-y-4",
              index !== 0 && "-ml-9 sm:-ml-10" // -24px mobile, -40px desktop
            )}
          >
            <Card card={displayCard} />
          </div>
        );
      })}
    </div>
  );
};
