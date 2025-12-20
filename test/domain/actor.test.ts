import { describe, expect, it } from "vitest";
import { getNextActor } from "../../src/domain/rules/actor";
import type { DealState } from "../../src/domain/types";

describe("getNextActor", () => {
  const baseState: DealState = {
    dealId: "test-deal",
    gameType: "studHi",
    playerCount: 3,
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
      {
        seat: 2,
        kind: "cpu",
        active: true,
        stack: 1000,
        committedTotal: 0,
        committedThisStreet: 0,
      },
    ],
    ante: 0,
    bringIn: 0,
    smallBet: 0,
    bigBet: 0,
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

  it("pendingResponseCount > 0 の場合、次のアクティブなプレイヤーインデックスを返すこと", () => {
    // pendingResponseCount=2 なので、0の次は1
    const state = {
      ...baseState,
      currentActorIndex: 0,
      pendingResponseCount: 2,
    };
    const next = getNextActor(state);
    expect(next).toBe(1);
  });

  it("次のプレイヤーが非アクティブの場合、スキップしてその次を返すこと", () => {
    const players = [...baseState.players];
    players[1] = { ...players[1], active: false };
    const state = {
      ...baseState,
      players,
      currentActorIndex: 0,
      pendingResponseCount: 1,
    };

    // 0 -> 1(inactive) -> 2
    const next = getNextActor(state);
    expect(next).toBe(2);
  });

  it("pendingResponseCount が 0 の場合、nullを返すこと（ストリート終了）", () => {
    const state = {
      ...baseState,
      currentActorIndex: 0,
      pendingResponseCount: 0,
    };
    const next = getNextActor(state);
    expect(next).toBeNull();
  });

  it("アクティブプレイヤーが1人以下の場合、nullを返すこと", () => {
    const players = [...baseState.players];
    players[1].active = false;
    players[2].active = false;
    const state = {
      ...baseState,
      players,
      currentActorIndex: 0,
      pendingResponseCount: 1,
    };

    // 残り一人しかいない
    const next = getNextActor(state);
    expect(next).toBeNull();
  });

  it("DealFinished が true の場合、nullを返すこと", () => {
    const state = { ...baseState, dealFinished: true, pendingResponseCount: 1 };
    const next = getNextActor(state);
    expect(next).toBeNull();
  });
});
