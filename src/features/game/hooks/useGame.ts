import { useGameStore } from '../store/gameStore';

export const useGame = () => {
  const store = useGameStore();
  return {
    ...store,
    activePlayer: store.activePlayerIndex !== null ? store.players[store.activePlayerIndex] : null,
    hero: store.players.find(p => p.isHuman),
  };
};

export const usePlayer = (index: number) => {
  return useGameStore(state => state.players[index]);
};
