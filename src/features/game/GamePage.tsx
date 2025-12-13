import { useEffect } from 'react';
import { Table } from '@/components/game/Table';
import { useGame } from '@/features/game/hooks/useGame';
import { gameEngine } from '@/features/stud/StudGameEngine';
import type { ActionType } from '@/types';
import { WinAnimation } from '@/components/game/WinAnimation';

export const GamePage = () => {
  const {
    players,
    pot,
    currentStreet,
    activePlayerIndex,
    hero,
    status,
    currentBetAmount
  } = useGame();

  // Initialize game on mount
  useEffect(() => {
    gameEngine.startGame(6); // 6 players default
  }, []);

  // Determine valid actions for Hero
  const getValidActions = (): ActionType[] => {
    if (activePlayerIndex === null) return [];
    if (!hero || players[activePlayerIndex].id !== hero.id) return [];

    // Logic:
    const actions: ActionType[] = ['fold'];
    const toCall = currentBetAmount - hero.currentBet;

    if (toCall === 0) actions.push('check');
    if (toCall > 0) actions.push('call');

    // Bring-in logic vs Bet
    if (currentStreet === '3rd') {
        if (currentBetAmount === 0 || currentBetAmount === 10) { // Bring-in or no-one logic?
            // If we are bring-in player and forced?
            // Engine handles bring-in force logic via action/state?
            // If active and 3rd and no bet?
            // 'bring-in' | 'complete'
             actions.push('bring-in', 'complete');
        } else {
             actions.push('raise');
        }
    } else {
        // 4th+
        actions.push('bet', 'raise');
    }

    return actions;
  };

  const handleAction = (type: ActionType) => {
    // Determine amount based on type
    let amount = 0;
    if (type === 'bring-in') amount = 10;
    else if (type === 'complete') amount = 40;
    else if (type === 'bet') amount = (currentStreet === '3rd' || currentStreet === '4th') ? 40 : 80;
    else if (type === 'raise') amount = (currentStreet === '3rd' || currentStreet === '4th') ? 40 : 80;
    // Call amount calculated in engine, or pass 0? Engine uses passed amount.
    // Call: Engine logic `amount = min(toCall, stack)`. Pass 0 or nominal?
    // Better pass 0 and let engine calc? Or pass `currentBetAmount - currentBet`?
    // Let's pass 0 for Call/Check/Fold.

    gameEngine.handleAction({ type, amount });
  };

  return (
    <div className="w-full h-screen bg-background overflow-hidden flex flex-col">
       <div className="flex-1 relative">
         <Table
            players={players}
            heroIndex={0} // Fixed for MVP
            pot={pot}
            street={currentStreet}
            activePlayerIndex={activePlayerIndex}
            validActions={getValidActions()}
            onAction={handleAction}
         />
       </div>

       {status === 'finished' && (
           <WinAnimation
               amount={pot}
               winnerName="Winner"
               onComplete={() => gameEngine.nextHand()}
           />
       )}
    </div>
  );
};
