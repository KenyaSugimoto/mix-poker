import { describe, expect, it } from "vitest";
import { buildObservation } from "../../../src/domain/cpu/observation";
import type { Card, DealState } from "../../../src/domain/types";

/**
 * buildObservation のテスト
 * 公平性を担保するためのテスト
 */
describe("buildObservation", () => {
  const createTestDealState = (): DealState => ({
    dealId: "test-deal",
    gameType: "studHi",
    playerCount: 2,
    players: [
      {
        seat: 0,
        kind: "human",
        active: true,
        stack: 900,
        committedTotal: 100,
        committedThisStreet: 40,
      },
      {
        seat: 1,
        kind: "cpu",
        active: true,
        stack: 850,
        committedTotal: 150,
        committedThisStreet: 40,
      },
    ],
    seatOrder: ["player1", "player2"],
    ante: 10,
    bringIn: 20,
    smallBet: 40,
    bigBet: 80,
    street: "4th",
    bringInIndex: 0,
    currentActorIndex: 1,
    pot: 250,
    currentBet: 40,
    raiseCount: 1,
    pendingResponseCount: 1,
    checksThisStreet: 0,
    actionsThisStreet: ["BET", "RAISE"],
    dealFinished: false,
    deck: [
      { rank: "A", suit: "s" } as Card,
      { rank: "K", suit: "s" } as Card,
      { rank: "Q", suit: "s" } as Card,
    ],
    rngSeed: "secret-seed-12345",
    hands: {
      0: {
        downCards: [
          { rank: "A", suit: "h" } as Card,
          { rank: "K", suit: "h" } as Card,
        ],
        upCards: [
          { rank: "Q", suit: "h" } as Card,
          { rank: "J", suit: "h" } as Card,
        ],
      },
      1: {
        downCards: [
          { rank: "T", suit: "c" } as Card,
          { rank: "9", suit: "c" } as Card,
        ],
        upCards: [
          { rank: "8", suit: "c" } as Card,
          { rank: "7", suit: "c" } as Card,
        ],
      },
    },
    eventLog: [],
  });

  it("他プレイヤーのdownCardsが含まれていないこと", () => {
    const state = createTestDealState();
    const obs = buildObservation(state, 1); // seat1のCPUとして観測

    // 自分（seat1）の情報は確認できる
    expect(obs.me.seat).toBe(1);
    expect(obs.me.downCards).toHaveLength(2);
    expect(obs.me.upCards).toHaveLength(2);

    // players配列内の他プレイヤー（seat0）にdownCardsがないこと
    const otherPlayer = obs.players.find((p) => p.seat === 0);
    expect(otherPlayer).toBeDefined();
    expect(otherPlayer?.upCards).toHaveLength(2); // upCardsはある
    // downCardsプロパティ自体が存在しないことを確認
    expect(otherPlayer ? "downCards" in otherPlayer : false).toBe(false);
  });

  it("Observationにdeckが含まれていないこと", () => {
    const state = createTestDealState();
    const obs = buildObservation(state, 1);

    // Observation型にはdeckプロパティが存在しない
    expect("deck" in obs).toBe(false);
  });

  it("ObservationにrngSeedが含まれていないこと", () => {
    const state = createTestDealState();
    const obs = buildObservation(state, 1);

    // Observation型にはrngSeedプロパティが存在しない
    expect("rngSeed" in obs).toBe(false);
  });

  it("meに自分のdownCardsとupCardsが含まれていること", () => {
    const state = createTestDealState();
    const obs = buildObservation(state, 1);

    expect(obs.me.downCards).toHaveLength(2);
    expect(obs.me.upCards).toHaveLength(2);
    expect(obs.me.downCards[0].rank).toBe("T");
    expect(obs.me.downCards[1].rank).toBe("9");
    expect(obs.me.upCards[0].rank).toBe("8");
    expect(obs.me.upCards[1].rank).toBe("7");
  });

  it("stakes情報が正しく含まれていること", () => {
    const state = createTestDealState();
    const obs = buildObservation(state, 1);

    expect(obs.stakes.ante).toBe(10);
    expect(obs.stakes.bringIn).toBe(20);
    expect(obs.stakes.smallBet).toBe(40);
    expect(obs.stakes.bigBet).toBe(80);
  });

  it("ゲーム状態情報が正しく含まれていること", () => {
    const state = createTestDealState();
    const obs = buildObservation(state, 1);

    expect(obs.gameType).toBe("studHi");
    expect(obs.street).toBe("4th");
    expect(obs.pot).toBe(250);
    expect(obs.currentBet).toBe(40);
    expect(obs.raiseCount).toBe(1);
    expect(obs.bringInIndex).toBe(0);
    expect(obs.currentActorIndex).toBe(1);
  });

  it("全プレイヤーのupCardsが公開情報として含まれていること", () => {
    const state = createTestDealState();
    const obs = buildObservation(state, 1);

    // 両プレイヤーのupCardsが見える
    expect(obs.players).toHaveLength(2);
    expect(obs.players[0].upCards).toHaveLength(2);
    expect(obs.players[1].upCards).toHaveLength(2);
  });

  it("無効なシートインデックスでエラーが発生すること", () => {
    const state = createTestDealState();

    expect(() => buildObservation(state, 99)).toThrow("Invalid seat index");
  });
});
