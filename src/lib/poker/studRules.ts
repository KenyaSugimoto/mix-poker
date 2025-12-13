import type { Card, Rank, Suit } from '@/types';

// Suit order for Stud (lowest to highest): Clubs < Diamonds < Hearts < Spades
const SUIT_VALUE: Record<Suit, number> = {
  'c': 0,
  'd': 1,
  'h': 2,
  's': 3
};

const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Returns value for comparison (Low is lower value)
const getCardValue = (card: Card): number => {
  return RANK_VALUE[card.rank] * 10 + SUIT_VALUE[card.suit];
};

export const determineBringIn = (players: { id: string, upCard: Card | null, isActive: boolean }[]): number => {
  let lowCardVal = 1000;
  let playerIndex = -1;

  players.forEach((p, idx) => {
    if (!p.isActive || !p.upCard) return;
    const val = getCardValue(p.upCard);
    if (val < lowCardVal) {
      lowCardVal = val;
      playerIndex = idx;
    }
  });

  return playerIndex;
};

// Used for subsequent streets (Highest board acts first)
export const determineFirstAction = (players: { id: string, hand: Card[], isActive: boolean }[]): number => {
  // Simplification: In Stud, highest hand acts first.
  // We need a proper partial hand evaluator for this in real impl.
  // For MVP, we can rely on standard evaluator or simple high card check if not provided.
  // TODO: Implement proper partial hand comparison for Stud order.
  // For now, returning 0 or placeholder logic.
  // Actually, let's use RANK_VALUE for quick high card check on upcards.

  let bestVal = -1;
  let playerIndex = -1;

  // Checking simplified highest upcard logic (Note: Real stud compares poker hands of visible cards)
  players.forEach((p, idx) => {
    if (!p.isActive) return;
    // Get visible cards
    const upCards = p.hand.filter(c => c.isFaceUp);
    if (upCards.length === 0) return;

    // Simple High Card check for scaffolding (User requested Architecture verification mainly)
    // We should improve this later.
    const maxVal = Math.max(...upCards.map(c => getCardValue(c)));
    if (maxVal > bestVal) {
      bestVal = maxVal;
      playerIndex = idx;
    }
  });

  return playerIndex;
};
