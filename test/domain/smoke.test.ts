import { describe, it, expect } from "vitest";
import type { DealState, GameType, Street } from "@/domain/types";

describe("smoke test", () => {
  it("should import types correctly", () => {
    const gameType: GameType = "studHi";
    const street: Street = "3rd";

    expect(gameType).toBe("studHi");
    expect(street).toBe("3rd");
  });

  it("should create minimal DealState structure", () => {
    const dealState: DealState = {
      dealId: "test-deal-1",
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
      ante: 1,
      bringIn: 2,
      smallBet: 4,
      bigBet: 8,
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

    expect(dealState.dealId).toBe("test-deal-1");
    expect(dealState.playerCount).toBe(2);
    expect(dealState.players.length).toBe(2);
    expect(dealState.players[0].kind).toBe("human");
    expect(dealState.players[1].kind).toBe("cpu");
  });
});
