import type { ActionType, Player } from '@/types';
// import { gameEngine } from './StudGameEngine';
// Note: Circular dependency if we import engine here just to use types from it?
// We should pass state to strategy, not import engine.
// Actually strategy just needs state.

interface GameStateForStrategy {
  currentBetAmount: number;
  players: Player[];
  activePlayerIndex: number;
}

export const basicCPUStrategy = (
  gameState: GameStateForStrategy
): { type: ActionType; amount: number } => {
  const { currentBetAmount, players, activePlayerIndex } = gameState;
  const player = players[activePlayerIndex];

  const toCall = currentBetAmount - player.currentBet;

  // Random Logic for MVP
  const rand = Math.random();

  if (toCall === 0) {
    // Can check. Raise 20%
    if (rand > 0.8) return { type: 'bet', amount: 10 }; // Hardcoded amount for MVP (should depend on street)
    return { type: 'check', amount: 0 };
  } else {
    // Must call or fold (or raise)
    // 80% Call
    if (rand > 0.2) return { type: 'call', amount: toCall };
    return { type: 'fold', amount: 0 };
  }
};
