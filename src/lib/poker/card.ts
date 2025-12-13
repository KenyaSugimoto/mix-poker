import type { Card, Rank, Suit } from '@/types';

// Constants
export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit}`, // e.g. "As"
        suit,
        rank,
        isFaceUp: false,
      });
    }
  }
  return deck;
};

// Fisher-Yates shuffle
export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Convert our Card to pokersolver string (e.g., "Ah", "Td")
export const toSolverCard = (card: Card): string => {
  return `${card.rank}${card.suit}`;
};
