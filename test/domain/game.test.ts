import { describe, expect, it } from "vitest";
import { createInitialGameState, finishDeal } from "../../src/domain/game";
import type { DealState, GameState } from "../../src/domain/types";

describe("finishDeal", () => {
  const createTestGame = (): GameState => {
    return createInitialGameState(
      [
        { id: "player1", name: "Player 1", kind: "human" },
        { id: "player2", name: "Player 2", kind: "cpu" },
      ],
      { sequence: ["studHi"], dealPerGame: 6 },
      { ante: 10, bringIn: 20, smallBet: 40, bigBet: 80 },
    );
  };

  const createFinishedDeal = (pot: number): DealState => {
    return {
      dealId: "test-deal-1",
      gameType: "studHi",
      playerCount: 2,
      players: [
        {
          seat: 0,
          kind: "human",
          active: true,
          stack: 1000,
          committedTotal: 100,
          committedThisStreet: 0,
        },
        {
          seat: 1,
          kind: "cpu",
          active: true,
          stack: 1000,
          committedTotal: 100,
          committedThisStreet: 0,
        },
      ],
      seatOrder: ["player1", "player2"],
      ante: 10,
      bringIn: 20,
      smallBet: 40,
      bigBet: 80,
      street: "7th",
      bringInIndex: 0,
      currentActorIndex: 0,
      pot,
      currentBet: 0,
      raiseCount: 0,
      pendingResponseCount: 0,
      checksThisStreet: 2,
      actionsThisStreet: [],
      dealFinished: true,
      deck: [],
      rngSeed: "test-seed",
      hands: {
        0: {
          downCards: [
            { suit: "s", rank: "A" },
            { suit: "c", rank: "A" },
            { suit: "d", rank: "A" },
          ],
          upCards: [
            { suit: "h", rank: "K" },
            { suit: "s", rank: "K" },
            { suit: "c", rank: "Q" },
            { suit: "d", rank: "J" },
          ],
        },
        1: {
          downCards: [
            { suit: "s", rank: "A" },
            { suit: "c", rank: "A" },
            { suit: "d", rank: "K" },
          ],
          upCards: [
            { suit: "h", rank: "K" },
            { suit: "s", rank: "Q" },
            { suit: "c", rank: "Q" },
            { suit: "d", rank: "J" },
          ],
        },
      },
      startedAt: Date.now(),
    };
  };

  it("DealSummaryにpotShareが正しく保存されること", () => {
    const game = createTestGame();
    const deal = createFinishedDeal(200);

    const result = finishDeal(game, deal);

    expect(result.dealHistory).toHaveLength(1);
    const summary = result.dealHistory[0];
    expect(summary.potShare).toBeDefined();
    expect(summary.potShare.player1).toBeGreaterThan(0);
    // 負けたプレイヤーはpotShareに含まれない（undefined）
    expect(summary.potShare.player2).toBeUndefined();
  });

  it("potShareの合計がpotと一致すること", () => {
    const game = createTestGame();
    const pot = 200;
    const deal = createFinishedDeal(pot);

    const result = finishDeal(game, deal);

    const summary = result.dealHistory[0];
    const potShareSum = Object.values(summary.potShare).reduce(
      (sum, val) => sum + val,
      0,
    );
    expect(potShareSum).toBe(pot);
  });

  it("チョップの場合、potShareが均等分配されること", () => {
    const game = createTestGame();
    // 同じハンドでチョップになるように設定
    const deal: DealState = {
      dealId: "test-deal-2",
      gameType: "studHi",
      playerCount: 2,
      players: [
        {
          seat: 0,
          kind: "human",
          active: true,
          stack: 1000,
          committedTotal: 100,
          committedThisStreet: 0,
        },
        {
          seat: 1,
          kind: "cpu",
          active: true,
          stack: 1000,
          committedTotal: 100,
          committedThisStreet: 0,
        },
      ],
      seatOrder: ["player1", "player2"],
      ante: 10,
      bringIn: 20,
      smallBet: 40,
      bigBet: 80,
      street: "7th",
      bringInIndex: 0,
      currentActorIndex: 0,
      pot: 200,
      currentBet: 0,
      raiseCount: 0,
      pendingResponseCount: 0,
      checksThisStreet: 2,
      actionsThisStreet: [],
      dealFinished: true,
      deck: [],
      rngSeed: "test-seed",
      hands: {
        // 同じハンドでチョップ
        0: {
          downCards: [
            { suit: "s", rank: "A" },
            { suit: "c", rank: "A" },
            { suit: "d", rank: "K" },
          ],
          upCards: [
            { suit: "h", rank: "K" },
            { suit: "s", rank: "Q" },
            { suit: "c", rank: "Q" },
            { suit: "d", rank: "J" },
          ],
        },
        1: {
          downCards: [
            { suit: "s", rank: "A" },
            { suit: "c", rank: "A" },
            { suit: "d", rank: "K" },
          ],
          upCards: [
            { suit: "h", rank: "K" },
            { suit: "s", rank: "Q" },
            { suit: "c", rank: "Q" },
            { suit: "d", rank: "J" },
          ],
        },
      },
      startedAt: Date.now(),
    };

    const result = finishDeal(game, deal);

    const summary = result.dealHistory[0];
    expect(summary.potShare.player1).toBe(100);
    expect(summary.potShare.player2).toBe(100);
  });

  it("全員foldの場合、残った1人がpotShareを全額獲得すること", () => {
    const game = createTestGame();
    const deal: DealState = {
      dealId: "test-deal-3",
      gameType: "studHi",
      playerCount: 2,
      players: [
        {
          seat: 0,
          kind: "human",
          active: true, // 残ったプレイヤー
          stack: 1000,
          committedTotal: 100,
          committedThisStreet: 0,
        },
        {
          seat: 1,
          kind: "cpu",
          active: false, // fold済み
          stack: 1000,
          committedTotal: 100,
          committedThisStreet: 0,
        },
      ],
      seatOrder: ["player1", "player2"],
      ante: 10,
      bringIn: 20,
      smallBet: 40,
      bigBet: 80,
      street: "7th",
      bringInIndex: 0,
      currentActorIndex: 0,
      pot: 200,
      currentBet: 0,
      raiseCount: 0,
      pendingResponseCount: 0,
      checksThisStreet: 1,
      actionsThisStreet: [],
      dealFinished: true,
      deck: [],
      rngSeed: "test-seed",
      hands: {
        0: { downCards: [], upCards: [] },
      },
      startedAt: Date.now(),
    };

    const result = finishDeal(game, deal);

    const summary = result.dealHistory[0];
    expect(summary.potShare.player1).toBe(200);
    // 負けたプレイヤーはpotShareに含まれない（undefined）
    expect(summary.potShare.player2).toBeUndefined();
  });

  it("deltaStacksとpotShareの関係が正しいこと", () => {
    const game = createTestGame();
    const deal = createFinishedDeal(200);

    const result = finishDeal(game, deal);

    const summary = result.dealHistory[0];
    // deltaStacks = -committedTotal + potShare
    // player1が勝った場合
    const player1Delta = summary.deltaStacks.player1;
    const player1PotShare = summary.potShare.player1;
    const player1Committed = deal.players[0].committedTotal;

    expect(player1Delta).toBe(-player1Committed + player1PotShare);

    // player2が負けた場合
    const player2Delta = summary.deltaStacks.player2;
    const player2PotShare = summary.potShare.player2 ?? 0; // 負けたプレイヤーはundefinedなので0として扱う
    const player2Committed = deal.players[1].committedTotal;

    expect(player2Delta).toBe(-player2Committed + player2PotShare);
    expect(summary.potShare.player2).toBeUndefined(); // 負けたプレイヤーはpotShareに含まれない
  });

  it("dealIndexが正しくインクリメントされること", () => {
    const game = createTestGame();
    expect(game.dealIndex).toBe(0);

    const deal = createFinishedDeal(200);
    const result = finishDeal(game, deal);

    expect(result.dealIndex).toBe(1);
  });

  it("currentDealがnullになること", () => {
    const game = createTestGame();
    const deal = createFinishedDeal(200);

    const result = finishDeal(game, deal);

    expect(result.currentDeal).toBeNull();
  });

  it("dealHistoryにDealSummaryが追加されること", () => {
    const game = createTestGame();
    expect(game.dealHistory).toHaveLength(0);

    const deal = createFinishedDeal(200);
    const result = finishDeal(game, deal);

    expect(result.dealHistory).toHaveLength(1);
    const summary = result.dealHistory[0];
    expect(summary.dealId).toBe(deal.dealId);
    expect(summary.gameType).toBe(deal.gameType);
    expect(summary.pot).toBe(deal.pot);
    expect(summary.potShare).toBeDefined();
  });
});
