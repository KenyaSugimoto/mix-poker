import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, toSolverCard, SUITS, RANKS } from './card';

describe('createDeck', () => {
  it('should create a deck of 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('should have 13 cards of each suit', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      const suitCards = deck.filter(c => c.suit === suit);
      expect(suitCards).toHaveLength(13);
    }
  });

  it('should have 4 cards of each rank', () => {
    const deck = createDeck();
    for (const rank of RANKS) {
      const rankCards = deck.filter(c => c.rank === rank);
      expect(rankCards).toHaveLength(4);
    }
  });

  it('should have all cards face down by default', () => {
    const deck = createDeck();
    expect(deck.every(c => c.isFaceUp === false)).toBe(true);
  });
});

describe('shuffleDeck', () => {
  it('should return a deck of 52 cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
  });

  it('should return a different order (with high probability)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck([...deck]);
    // It's statistically nearly impossible to get the same order
    const sameOrder = deck.every((c, i) => c.id === shuffled[i].id);
    expect(sameOrder).toBe(false);
  });
});

describe('toSolverCard', () => {
  it('should convert card to pokersolver format', () => {
    expect(toSolverCard({ id: 'As-0', suit: 's', rank: 'A', isFaceUp: true })).toBe('As');
    expect(toSolverCard({ id: 'Th-0', suit: 'h', rank: 'T', isFaceUp: true })).toBe('Th');
    expect(toSolverCard({ id: '2c-0', suit: 'c', rank: '2', isFaceUp: true })).toBe('2c');
  });
});
