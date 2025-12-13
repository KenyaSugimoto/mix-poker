import { useGameStore } from '../game/store/gameStore';
import { createDeck, shuffleDeck } from '@/lib/poker/card';
import { determineBringIn, determineFirstAction } from '@/lib/poker/studRules';
import { evaluateHand } from '@/lib/poker/handEvaluator';
import type { ActionType, Card, Street } from '@/types';

// Constants
const ANTE = 5;
const BRING_IN = 10;

const STREET_ORDER: Street[] = ['ante', '3rd', '4th', '5th', '6th', '7th', 'showdown'];

export class StudGameEngine {
  private deck: Card[] = [];

  // Helpers to access store state
  private get state() {
    return useGameStore.getState();
  }

  private get actions() {
    return useGameStore.getState();
  }

  // --- Game Flow Control ---

  public startGame(playerCount: number) {
    this.actions.initializeGame(playerCount);
    this.dealAnte();
  }

  public nextHand() {
    // Reset deck for new hand
    this.deck = [];
    this.actions.resetGame();
    // Small delay to ensure state is reset before dealing
    setTimeout(() => {
      this.dealAnte();
    }, 100);
  }

  // Phase 1: Ante
  private dealAnte() {
    this.actions.setStreet('ante');

    // Deduct Ante
    const players = this.state.players;
    const newPot = players.reduce((acc, p) => {
      // Logic for deducting ante
      if (p.chips >= ANTE) {
        this.actions.updatePlayer(parseInt(p.id.split('-')[1]), { chips: p.chips - ANTE });
        return acc + ANTE;
      }
      return acc + (p.chips > 0 ? p.chips : 0);
    }, 0);

    this.actions.setPot(newPot);

    // Deal Initial Cards (2 down, 1 up)
    this.dealCards(3, [false, false, true]);

    this.startThirdStreet();
  }

  // Phase 2: 3rd Street (Bring-in)
  private startThirdStreet() {
    this.actions.setStreet('3rd');

    // Determine Bring-in
    const players = this.state.players;
    const simplePlayers = players.map(p => ({
      id: p.id,
      upCard: p.hand.find(c => c.isFaceUp) || null,
      isActive: p.isActive
    }));

    const bringInIndex = determineBringIn(simplePlayers);

    // Set Active Player
    this.actions.setActivePlayer(bringInIndex);
    this.actions.updatePlayer(bringInIndex, { lastAction: 'Bring-in?' });

    // Set Bet Info
    // Min bet is Bring-in
    useGameStore.setState({
      currentBetAmount: 0,
      minRaise: BRING_IN
    });

    // Trigger CPU action if bring-in player is CPU
    const bringInPlayer = players[bringInIndex];
    if (!bringInPlayer.isHuman) {
      setTimeout(() => {
        const action = this.cpuDecide(bringInIndex);
        this.handleAction(action);
      }, 1000);
    }
  }

  // Phase 3: Dealing subsequent streets
  private nextStreet() {
    const currentStreet = this.state.currentStreet;
    const idx = STREET_ORDER.indexOf(currentStreet);
    if (idx === -1 || idx >= STREET_ORDER.length - 1) return;

    const nextStreetName = STREET_ORDER[idx + 1];
    this.actions.setStreet(nextStreetName);

    // Reset round bets and tracking flags
    useGameStore.setState({
      streetBets: 0,
      currentBetAmount: 0,
      activePlayerIndex: null,
      lastAction: null,
      raiseCount: 0,
      bringInPosted: false,
      streetCompleted: false
    });
    this.state.players.forEach((_, i) => this.actions.updatePlayer(i, { currentBet: 0, lastAction: null }));

    if (nextStreetName === 'showdown') {
      this.handleShowdown();
      return;
    }

    // Deal cards
    let isFaceUp = true;
    if (nextStreetName === '7th') isFaceUp = false;

    this.dealCards(1, [isFaceUp]);

    // Determine First Action (Highest Board)
    const simplePlayers = this.state.players.map(p => ({
      id: p.id,
      hand: p.hand,
      isActive: p.isActive
    }));
    const firstActor = determineFirstAction(simplePlayers);
    this.actions.setActivePlayer(firstActor);

    // Trigger CPU action if first actor is CPU
    const firstActorPlayer = this.state.players[firstActor];
    if (!firstActorPlayer.isHuman && !firstActorPlayer.hasFolded) {
      setTimeout(() => {
        const action = this.cpuDecide(firstActor);
        this.handleAction(action);
      }, 1000);
    }
  }

  // Dealing Logic
  private dealCards(count: number, faceUpFlags: boolean[]) {
    if (!this.deck || this.deck.length < (this.state.players.length * count)) {
       this.deck = shuffleDeck(createDeck());
    }

    // const players = this.state.players;

    for (let c = 0; c < count; c++) {
      const isUp = faceUpFlags[c];

      this.state.players.forEach((_, idx) => {
        // Fetch latest player state inside loop
        const p = this.state.players[idx];

        if (!p.isActive) return;
        const card = this.deck.pop();
        if (card) {
           card.isFaceUp = isUp;
           const newHand = [...p.hand, card];
           this.actions.updatePlayer(idx, { hand: newHand });
        }
      });
    }
  }

  // --- Action Handling ---

  public handleAction(inputAction: { type: ActionType, amount: number }) {
    const { activePlayerIndex, players, pot, currentBetAmount } = this.state;
    if (activePlayerIndex === null) return;

    const player = players[activePlayerIndex];
    let amount = inputAction.amount;

    // Logic updates
    if (inputAction.type === 'fold') {
      this.actions.updatePlayer(activePlayerIndex, { isActive: false, hasFolded: true });
    } else if (inputAction.type === 'check') {
       // No chip movement
    } else if (inputAction.type === 'call') {
       const callAmt = currentBetAmount - player.currentBet;
       amount = Math.min(callAmt, player.chips);
       this.actions.updatePlayer(activePlayerIndex, { chips: player.chips - amount, currentBet: player.currentBet + amount });
       this.actions.setPot(pot + amount);
    } else if (inputAction.type === 'bring-in') {
       // Bring-in: post the minimum forced bet
       this.actions.updatePlayer(activePlayerIndex, { chips: player.chips - amount, currentBet: player.currentBet + amount });
       this.actions.setPot(pot + amount);
       useGameStore.setState({
         currentBetAmount: amount,
         bringInPosted: true
       });
    } else if (inputAction.type === 'complete') {
       // Complete: raise from bring-in to full bet
       this.actions.updatePlayer(activePlayerIndex, { chips: player.chips - amount, currentBet: player.currentBet + amount });
       this.actions.setPot(pot + amount);
       useGameStore.setState({
         currentBetAmount: player.currentBet + amount,
         streetCompleted: true,
         raiseCount: 1 // Complete counts as 1st raise
       });
    } else if (inputAction.type === 'bet') {
       this.actions.updatePlayer(activePlayerIndex, { chips: player.chips - amount, currentBet: player.currentBet + amount });
       this.actions.setPot(pot + amount);
       useGameStore.setState({
         currentBetAmount: player.currentBet + amount,
         raiseCount: 1 // First bet counts as 1st raise
       });
    } else if (inputAction.type === 'raise') {
       this.actions.updatePlayer(activePlayerIndex, { chips: player.chips - amount, currentBet: player.currentBet + amount });
       this.actions.setPot(pot + amount);
       const newRaiseCount = this.state.raiseCount + 1;
       useGameStore.setState({
         currentBetAmount: player.currentBet + amount,
         raiseCount: newRaiseCount
       });
    }

    // Record Action
    this.actions.performAction(activePlayerIndex, { type: inputAction.type, amount });

    // Move to next player
    this.moveToNextPlayer();
  }

  private moveToNextPlayer() {
    const activePlayers = this.state.players.filter(p => !p.hasFolded);
    if (activePlayers.length === 1) {
       this.handleShowdown();
       return;
    }

    let nextIdx = (this.state.activePlayerIndex! + 1) % this.state.players.length;
    let loopCount = 0;

    // Skip folded
    while (this.state.players[nextIdx].hasFolded && loopCount < this.state.players.length) {
      nextIdx = (nextIdx + 1) % this.state.players.length;
      loopCount++;
    }

    // Simple round end check: everybody matched the bet?
    // This logic is MVP-grade and might need refinement for side-pots/all-ins
    // Assuming 2+ players active.

    const allMatched = activePlayers.every(p => p.currentBet === this.state.currentBetAmount);
    // Also need to ensure everyone has had a chance to act?
    // If currentStreetBets > 0 (meaning someone bet/brought-in) or check-around?
    // If everyone checked (currentBetAmount 0, lastAction check for all?)

    // Let's assume if all Matched AND (currentBetAmount > 0 OR everyone acted)
    // For MVP: if all matched and currentBetAmount > 0 (or bring-in), next street.
    // If 0 and everyone checked logic needs state tracking.

    if (allMatched && this.state.currentBetAmount > 0) {
        this.nextStreet();
        return;
    }

    this.actions.setActivePlayer(nextIdx);

    // Trigger CPU
    const nextPlayer = this.state.players[nextIdx];
    if (!nextPlayer.isHuman && !nextPlayer.hasFolded && this.state.status !== 'finished') {
        setTimeout(() => {
           const action = this.cpuDecide(nextIdx);
           this.handleAction(action);
        }, 1000);
    }
  }

  private cpuDecide(index: number): { type: ActionType, amount: number } {
     const { currentBetAmount, players } = this.state;
     const player = players[index];
     const toCall = currentBetAmount - player.currentBet;

     // Get valid actions based on game state
     const validActions = this.getValidActionsFor(index);

     // Priority-based selection
     if (validActions.includes('bring-in')) {
       // 3rd street bring-in - must bring-in or complete
       if (Math.random() > 0.7) return { type: 'complete', amount: 40 };
       return { type: 'bring-in', amount: BRING_IN };
     }

     if (toCall === 0 && validActions.includes('check')) {
       // Can check
       if (Math.random() > 0.7 && validActions.includes('bet')) {
         return { type: 'bet', amount: this.state.minRaise || 10 };
       }
       return { type: 'check', amount: 0 };
     }

     if (validActions.includes('call')) {
       // Must call or fold
       if (Math.random() > 0.2) return { type: 'call', amount: toCall };
     }

     return { type: 'fold', amount: 0 };
   }

   // Helper to determine valid actions for a player
   private getValidActionsFor(playerIndex: number): ActionType[] {
     const { currentBetAmount, players, currentStreet, bringInPosted, streetCompleted, raiseCount } = this.state;
     const player = players[playerIndex];
     const toCall = currentBetAmount - player.currentBet;

     const actions: ActionType[] = [];

     // 3rd Street Logic
     if (currentStreet === '3rd') {
       if (!bringInPosted) {
         // Bring-in player, not yet posted: only bring-in or complete
         return ['bring-in', 'complete'];
       }

       if (!streetCompleted) {
         // Bring-in posted but not completed: fold, call, complete
         actions.push('fold');
         if (toCall > 0) actions.push('call');
         actions.push('complete');
         return actions;
       }

       // Street completed: fold, call, raise (max 4)
       actions.push('fold');
       if (toCall > 0) actions.push('call');
       if (raiseCount < 4) actions.push('raise');
       return actions;
     }

     // 4th Street and beyond
     if (currentBetAmount === 0 || toCall === 0) {
       // No bet yet or we're even: check, bet
       actions.push('check');
       actions.push('bet');
     } else {
       // Someone bet: fold, call, raise (max 4)
       actions.push('fold');
       if (toCall > 0) actions.push('call');
       if (raiseCount < 4) actions.push('raise');
     }

     return actions;
   }

  private handleShowdown() {
    this.actions.setStreet('showdown');
    useGameStore.setState({ status: 'finished' });

    const activePlayers = this.state.players.filter(p => !p.hasFolded);
    const pot = this.state.pot;

    if (activePlayers.length === 0) return;

    if (activePlayers.length === 1) {
      // Everyone else folded - single winner
      const winner = activePlayers[0];
      const winnerIndex = this.state.players.findIndex(p => p.id === winner.id);
      this.actions.updatePlayer(winnerIndex, { chips: winner.chips + pot });
      this.actions.setPot(0);
      return;
    }

    // Multiple players - compare hands
    // For now, find the best hand (TODO: split pots)
    let bestPlayerIndex = -1;
    let bestHand: ReturnType<typeof import('@/lib/poker/handEvaluator').evaluateHand> | null = null;

    activePlayers.forEach(p => {
      const playerIndex = this.state.players.findIndex(pl => pl.id === p.id);
      const handResult = evaluateHand(p.hand);

      if (!bestHand || handResult.rank > bestHand.rank) {
        bestHand = handResult;
        bestPlayerIndex = playerIndex;
      }
    });

    if (bestPlayerIndex >= 0) {
      const winner = this.state.players[bestPlayerIndex];
      this.actions.updatePlayer(bestPlayerIndex, { chips: winner.chips + pot });
      this.actions.setPot(0);
    }
  }
}

export const gameEngine = new StudGameEngine();
