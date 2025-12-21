import { describe, expect, it } from "vitest";
import { getAllowedActions } from "../../src/domain/rules/allowedActions";
import type { DealState } from "../../src/domain/types";

describe("getAllowedActions", () => {
  const baseState: DealState = {
    dealId: "test-deal",
    gameType: "studHi",
    playerCount: 2,
    players: [],
    seatOrder: [],
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
    deck: [],
    rngSeed: "",
    hands: {},
  };

  it("3rdストリートでベットがない場合、BRING_IN と COMPLETE が許可されること", () => {
    const actions = getAllowedActions(baseState);
    expect(actions).toContain("BRING_IN");
    expect(actions).toContain("COMPLETE");
    expect(actions).not.toContain("CHECK");
  });

  it("3rdストリートでBRING_IN後の場合、CALL, FOLD, RAISE が許可されること", () => {
    const state = { ...baseState, currentBet: 20 };
    const actions = getAllowedActions(state);
    expect(actions).toContain("CALL");
    expect(actions).toContain("FOLD");
    expect(actions).toContain("RAISE");
  });

  it("4thストリートでベットがない場合、CHECK と BET が許可されること", () => {
    const state = { ...baseState, street: "4th" as const };
    const actions = getAllowedActions(state);
    expect(actions).toContain("CHECK");
    expect(actions).toContain("BET");
  });

  it("raiseCountが3（キャップ）の場合、RAISE が許可されないこと", () => {
    const state = { ...baseState, currentBet: 40, raiseCount: 3 };
    const actions = getAllowedActions(state);
    expect(actions).not.toContain("RAISE");
    expect(actions).toContain("CALL");
  });
});
