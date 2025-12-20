import { describe, expect, it } from "vitest";
import { applyEvent } from "../../src/domain/engine/applyEvent";
import type { DealState, Event } from "../../src/domain/types";

describe("applyEvent", () => {
  const initialState: DealState = {
    dealId: "test-deal",
    gameType: "studHi",
    playerCount: 2,
    players: [
      {
        seat: 0,
        kind: "human",
        active: true,
        stack: 1000,
        committedTotal: 0,
        committedThisStreet: 0,
      },
      {
        seat: 1,
        kind: "cpu",
        active: true,
        stack: 1000,
        committedTotal: 0,
        committedThisStreet: 0,
      },
    ],
    ante: 10,
    bringIn: 20,
    smallBet: 40,
    bigBet: 80,
    street: "3rd",
    bringInIndex: 0,
    currentActorIndex: 0,
    pot: 0,
    currentBet: 0,
    raiseCount: 0,
    pendingResponseCount: 0,
    checksThisStreet: 0,
    actionsThisStreet: [],
    dealFinished: false,
  };

  it("POST_ANTEイベントが正しく処理されること", () => {
    const event: Event = {
      id: "e1",
      type: "POST_ANTE",
      seat: 0,
      street: null,
      amount: 10,
      timestamp: Date.now(),
    };
    const nextState = applyEvent(initialState, event);
    expect(nextState.players[0].stack).toBe(990);
    expect(nextState.players[0].committedTotal).toBe(10);
    expect(nextState.pot).toBe(10);
  });

  it("BRING_INイベントが正しく処理されること", () => {
    const event: Event = {
      id: "e2",
      type: "BRING_IN",
      seat: 0,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    };
    const nextState = applyEvent(initialState, event);
    expect(nextState.players[0].stack).toBe(980);
    expect(nextState.pot).toBe(20);
    expect(nextState.currentBet).toBe(20);
    expect(nextState.pendingResponseCount).toBe(1);
    expect(nextState.currentActorIndex).toBe(1);
  });

  it("CALLイベントが正しく処理されること", () => {
    // Bring-in state
    const intermediateState = applyEvent(initialState, {
      id: "e2",
      type: "BRING_IN",
      seat: 0,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    });

    const callEvent: Event = {
      id: "e3",
      type: "CALL",
      seat: 1,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    };
    const finalState = applyEvent(intermediateState, callEvent);
    expect(finalState.players[1].stack).toBe(980);
    expect(finalState.pot).toBe(40);
    expect(finalState.pendingResponseCount).toBe(0);
  });

  it("FOLDイベントが正しく処理されること", () => {
    const intermediateState = applyEvent(initialState, {
      id: "e2",
      type: "BRING_IN",
      seat: 0,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    });

    const foldEvent: Event = {
      id: "e3",
      type: "FOLD",
      seat: 1,
      street: "3rd",
      timestamp: Date.now(),
    };
    const finalState = applyEvent(intermediateState, foldEvent);
    expect(finalState.players[1].active).toBe(false);
    expect(finalState.dealFinished).toBe(true);
  });

  it("CHECKイベントが正しく処理されること", () => {
    // 4th street, no bet
    const checkState = { ...initialState, street: "4th" as const, currentBet: 0, pendingResponseCount: 2 };
    
    const checkEvent: Event = {
      id: "e4",
      type: "CHECK",
      seat: 0,
      street: "4th",
      timestamp: Date.now(),
    };
    const nextState = applyEvent(checkState, checkEvent);
    expect(nextState.checksThisStreet).toBe(1);
    expect(nextState.pendingResponseCount).toBe(1);
  });

  it("STREET_ADVANCEイベントが正しく処理されること", () => {
    // 3rd street end state
    const endState = { 
      ...initialState, 
      pot: 100, 
      currentBet: 20,
      raiseCount: 1,
      checksThisStreet: 0,
      players: [
         { ...initialState.players[0], committedThisStreet: 20 },
         { ...initialState.players[1], committedThisStreet: 20 },
      ]
    };

    const event: Event = {
      id: "e5",
      type: "STREET_ADVANCE",
      seat: null,
      street: "4th",
      timestamp: Date.now(),
    };

    const nextState = applyEvent(endState, event);
    expect(nextState.street).toBe("4th");
    expect(nextState.pot).toBe(100); // changes nothing directly
    expect(nextState.currentBet).toBe(0);
    expect(nextState.raiseCount).toBe(0);
    expect(nextState.players[0].committedThisStreet).toBe(0);
    expect(nextState.players[1].committedThisStreet).toBe(0);
    expect(nextState.currentActorIndex).toBe(0); // Reset for MVP
  });
});
