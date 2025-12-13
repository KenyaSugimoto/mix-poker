import { Hand as SolverHand } from 'pokersolver';
import type { Hand } from '@/types';
import { toSolverCard } from './card';

export interface HandResult {
  rank: number; // Higher is better
  name: string; // "Full House", etc.
  descr: string; // "Full House, Aces over Kings"
}

export const evaluateHand = (cards: Hand): HandResult => {
  if (cards.length === 0) {
    return { rank: 0, name: 'Empty', descr: '' };
  }

  const solverCards = cards.map(toSolverCard);
  const solved = SolverHand.solve(solverCards);

  return {
    rank: solved.rank,
    name: solved.name,
    descr: solved.descr,
  };
};

export const compareHands = (hand1: Hand, hand2: Hand): number => {
  const h1 = SolverHand.solve(hand1.map(toSolverCard));
  const h2 = SolverHand.solve(hand2.map(toSolverCard));

  const winners = SolverHand.winners([h1, h2]);
  if (winners.length === 2) return 0; // Split/Tie
  return winners[0] === h1 ? 1 : -1;
};
