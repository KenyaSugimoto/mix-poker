import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Player, Street, GameType, ActionType } from '@/types';

interface GameState {
  status: 'idle' | 'running' | 'showdown' | 'finished';
  gameType: GameType;

  // Table
  players: Player[];
  dealerPosition: number;
  activePlayerIndex: number | null;

  // Betting
  pot: number;
  currentStreet: Street;
  streetBets: number; // Num bets in current street (capping)
  currentBetAmount: number; // To call
  minRaise: number;
  raiseCount: number; // Number of raises in current street (max 4)
  bringInPosted: boolean; // 3rd street: has bring-in been posted?
  streetCompleted: boolean; // 3rd street: has someone completed?

  // Actions
  lastAction: { playerIndex: number; type: ActionType; amount: number } | null;
}

interface GameActions {
  initializeGame: (playerCount: number) => void;
  resetGame: () => void;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (index: number, updates: Partial<Player>) => void;
  setPot: (amount: number) => void;
  setStreet: (street: Street) => void;
  setActivePlayer: (index: number | null) => void;
  performAction: (playerIndex: number, action: { type: ActionType; amount: number }) => void;
}

const INITIAL_STATE: GameState = {
  status: 'idle',
  gameType: 'stud_hi',
  players: [],
  dealerPosition: 0,
  activePlayerIndex: null,
  pot: 0,
  currentStreet: 'ante',
  streetBets: 0,
  currentBetAmount: 0,
  minRaise: 0,
  raiseCount: 0,
  bringInPosted: false,
  streetCompleted: false,
  lastAction: null,
};

export const useGameStore = create<GameState & GameActions>()(
  immer((set) => ({
    ...INITIAL_STATE,

    initializeGame: (playerCount) => set((state) => {
      // Basic init logic is moved to Engine usually, but store provides setters
      state.status = 'idle';
      state.players = Array.from({ length: playerCount }).map((_, i) => ({
        id: `player-${i}`,
        name: i === 0 ? 'Hero' : `CPU ${i}`,
        chips: 1000,
        isHuman: i === 0,
        isActive: true,
        hasFolded: false,
        hand: [],
        currentBet: 0,
        lastAction: null,
      }));
    }),

    resetGame: () => set((state) => {
      // Reset all state but properly reset each player for new hand
      const resetPlayers = state.players.map(p => ({
        ...p,
        isActive: true,
        hasFolded: false,
        hand: [],
        currentBet: 0,
        lastAction: null,
        // Keep chips from previous hand
      }));
      return {
        ...INITIAL_STATE,
        players: resetPlayers,
      };
    }),

    setPlayers: (players) => set((state) => { state.players = players; }),

    updatePlayer: (index, updates) => set((state) => {
      if (state.players[index]) {
        Object.assign(state.players[index], updates);
      }
    }),

    setPot: (amount) => set((state) => { state.pot = amount; }),
    setStreet: (street) => set((state) => { state.currentStreet = street; }),
    setActivePlayer: (index) => set((state) => { state.activePlayerIndex = index; }),

    performAction: (playerIndex, action) => set((state) => {
       // Minimal State Update for Action (Complex logic in Engine)
       state.lastAction = { playerIndex, ...action };
       if (state.players[playerIndex]) {
         state.players[playerIndex].lastAction = `${action.type} ${action.amount > 0 ? action.amount : ''}`;
       }
    }),
  }))
);
