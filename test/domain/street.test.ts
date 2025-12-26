import { describe, expect, it } from "vitest";
import { checkStreetEndCondition } from "../../src/domain/rules/street";
import type { DealState } from "../../src/domain/types";

describe("checkStreetEndCondition", () => {
  const createBaseDealState = (
    overrides: Partial<DealState> = {},
  ): DealState => ({
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
    seatOrder: ["player1", "player2"],
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
    ...overrides,
  });

  describe("dealFinished時", () => {
    it("dealFinishedがtrueの場合はnullを返すこと", () => {
      const state = createBaseDealState({ dealFinished: true });
      const result = checkStreetEndCondition(state);
      expect(result).toBeNull();
    });
  });

  describe("全員fold（activeが1人以下）", () => {
    it("active playerが1人の場合、DEAL_ENDを返すこと", () => {
      const state = createBaseDealState({
        players: [
          {
            seat: 0,
            kind: "human",
            active: false, // fold済み
            stack: 1000,
            committedTotal: 10,
            committedThisStreet: 0,
          },
          {
            seat: 1,
            kind: "cpu",
            active: true, // 勝者
            stack: 1000,
            committedTotal: 30,
            committedThisStreet: 20,
          },
        ],
      });

      const result = checkStreetEndCondition(state);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("DEAL_END");
      expect(result?.seat).toBe(1); // 勝者のseat
    });

    it("active playerが0人の場合もDEAL_ENDを返すこと", () => {
      const state = createBaseDealState({
        players: [
          {
            seat: 0,
            kind: "human",
            active: false,
            stack: 1000,
            committedTotal: 10,
            committedThisStreet: 0,
          },
          {
            seat: 1,
            kind: "cpu",
            active: false,
            stack: 1000,
            committedTotal: 30,
            committedThisStreet: 20,
          },
        ],
      });

      const result = checkStreetEndCondition(state);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("DEAL_END");
      expect(result?.seat).toBeNull(); // 勝者がいない場合
    });
  });

  describe("7th street終了時", () => {
    it("7thで攻撃フェーズ終了時（currentBet > 0, pendingResponseCount === 0）はDEAL_ENDを返すこと", () => {
      const state = createBaseDealState({
        street: "7th",
        currentBet: 80,
        pendingResponseCount: 0,
      });

      const result = checkStreetEndCondition(state);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("DEAL_END");
      expect(result?.street).toBe("7th");
    });

    it("7thで全員check時（currentBet === 0, checksThisStreet === activeCount）はDEAL_ENDを返すこと", () => {
      const state = createBaseDealState({
        street: "7th",
        currentBet: 0,
        checksThisStreet: 2, // 2人がcheck
      });

      const result = checkStreetEndCondition(state);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("DEAL_END");
      expect(result?.street).toBe("7th");
    });

    it("7thでまだアクションが残っている場合はnullを返すこと", () => {
      const state = createBaseDealState({
        street: "7th",
        currentBet: 0,
        checksThisStreet: 1, // 1人しかcheckしていない
      });

      const result = checkStreetEndCondition(state);

      expect(result).toBeNull();
    });
  });

  describe("STREET_ADVANCE判定（7th以外）", () => {
    it("3rdで攻撃フェーズ終了時はSTREET_ADVANCEを返すこと", () => {
      const state = createBaseDealState({
        street: "3rd",
        currentBet: 40,
        pendingResponseCount: 0,
      });

      const result = checkStreetEndCondition(state);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("STREET_ADVANCE");
      expect(result?.street).toBe("3rd");
    });

    it("4thで全員check時はSTREET_ADVANCEを返すこと", () => {
      const state = createBaseDealState({
        street: "4th",
        currentBet: 0,
        checksThisStreet: 2,
      });

      const result = checkStreetEndCondition(state);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("STREET_ADVANCE");
      expect(result?.street).toBe("4th");
    });

    it("ストリート途中（pendingResponseCount > 0）はnullを返すこと", () => {
      const state = createBaseDealState({
        street: "3rd",
        currentBet: 40,
        pendingResponseCount: 1, // まだ1人が反応していない
      });

      const result = checkStreetEndCondition(state);

      expect(result).toBeNull();
    });

    it("checkフェーズ途中はnullを返すこと", () => {
      const state = createBaseDealState({
        street: "5th",
        currentBet: 0,
        checksThisStreet: 1, // 1人しかcheckしていない
      });

      const result = checkStreetEndCondition(state);

      expect(result).toBeNull();
    });
  });
});
