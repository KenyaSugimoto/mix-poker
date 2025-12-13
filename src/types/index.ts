export type Suit = 's' | 'h' | 'd' | 'c'; // spades, hearts, diamonds, clubs
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string; // Unique ID for React keys (e.g., "Ah-1")
  suit: Suit;
  rank: Rank;
  isFaceUp: boolean;
}

export type Hand = Card[];

export interface Player {
  id: string;
  name: string;
  chips: number;
  isHuman: boolean;
  isActive: boolean; // Not folded
  hasFolded: boolean;
  hand: Hand;
  currentBet: number; // Bet in current street
  lastAction: string | null; // UI bubble text
}

export type Street = 'ante' | '3rd' | '4th' | '5th' | '6th' | '7th' | 'showdown';

export type GameType = 'stud_hi';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'bring-in' | 'complete' | 'ante';

export interface Action {
  type: ActionType;
  amount: number;
  playerIndex: number;
}
