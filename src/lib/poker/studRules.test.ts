import { describe, it, expect } from 'vitest';
import { determineBringIn, determineFirstAction } from './studRules';
import type { Card } from '@/types';

// Helper to create a card
const card = (rank: string, suit: string, isFaceUp = true): Card => ({
  id: `${rank}${suit}-0`,
  rank: rank as Card['rank'],
  suit: suit as Card['suit'],
  isFaceUp,
});

describe('determineBringIn', () => {
  it('should return index of player with lowest up-card', () => {
    const players = [
      { id: 'p-0', upCard: card('K', 's'), isActive: true },
      { id: 'p-1', upCard: card('2', 'c'), isActive: true }, // lowest
      { id: 'p-2', upCard: card('A', 'h'), isActive: true },
    ];
    expect(determineBringIn(players)).toBe(1);
  });

  it('should use suit as tiebreaker (clubs < diamonds < hearts < spades)', () => {
    const players = [
      { id: 'p-0', upCard: card('2', 's'), isActive: true },
      { id: 'p-1', upCard: card('2', 'c'), isActive: true }, // lowest suit
      { id: 'p-2', upCard: card('2', 'h'), isActive: true },
    ];
    expect(determineBringIn(players)).toBe(1);
  });

  it('should skip inactive players', () => {
    const players = [
      { id: 'p-0', upCard: card('A', 's'), isActive: true },
      { id: 'p-1', upCard: card('2', 'c'), isActive: false }, // inactive
      { id: 'p-2', upCard: card('3', 'h'), isActive: true }, // lowest active
    ];
    expect(determineBringIn(players)).toBe(2);
  });
});

describe('determineFirstAction', () => {
  it('should return index of player with highest board (up-cards)', () => {
    const players = [
      { id: 'p-0', hand: [card('2', 'c', false), card('3', 'c', false), card('K', 's')], isActive: true },
      { id: 'p-1', hand: [card('2', 'c', false), card('3', 'c', false), card('A', 'h')], isActive: true }, // highest
      { id: 'p-2', hand: [card('2', 'c', false), card('3', 'c', false), card('Q', 'd')], isActive: true },
    ];
    expect(determineFirstAction(players)).toBe(1);
  });

  it('should skip inactive players', () => {
    const players = [
      { id: 'p-0', hand: [card('2', 'c', false), card('3', 'c', false), card('K', 's')], isActive: true },
      { id: 'p-1', hand: [card('2', 'c', false), card('3', 'c', false), card('A', 'h')], isActive: false }, // inactive
      { id: 'p-2', hand: [card('2', 'c', false), card('3', 'c', false), card('Q', 'd')], isActive: true },
    ];
    expect(determineFirstAction(players)).toBe(0); // K > Q
  });
});
