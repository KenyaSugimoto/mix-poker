import { describe, expect, it } from "vitest";
import { distributePot } from "../../src/domain/showdown/distributePot";
import {
  evaluateRazz,
  evaluateStud8,
  evaluateStudHi,
  resolveShowdown,
} from "../../src/domain/showdown/resolveShowdown";
import { calcDeltaStacks } from "../../src/domain/showdown/scores";
import type { Card, DealState } from "../../src/domain/types";

describe("evaluateStudHi", () => {
  it("ロイヤルフラッシュを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "s", rank: "K" },
      { suit: "s", rank: "Q" },
      { suit: "s", rank: "J" },
      { suit: "s", rank: "T" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("STRAIGHT_FLUSH");
    expect(result.kickers[0]).toBe(14); // A-K-Q-J-Tのストレートフラッシュ
  });

  it("フォーカードを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "A" },
      { suit: "d", rank: "A" },
      { suit: "h", rank: "A" },
      { suit: "s", rank: "K" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("FOUR_OF_A_KIND");
    expect(result.kickers[0]).toBe(14); // A
  });

  it("フルハウスを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "A" },
      { suit: "d", rank: "A" },
      { suit: "h", rank: "K" },
      { suit: "s", rank: "K" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("FULL_HOUSE");
    expect(result.kickers[0]).toBe(14); // A
    expect(result.kickers[1]).toBe(13); // K
  });

  it("フラッシュを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "s", rank: "K" },
      { suit: "s", rank: "Q" },
      { suit: "s", rank: "J" },
      { suit: "s", rank: "9" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("FLUSH");
  });

  it("ストレートを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "K" },
      { suit: "d", rank: "Q" },
      { suit: "h", rank: "J" },
      { suit: "s", rank: "T" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("STRAIGHT");
  });

  it("A-2-3-4-5ストレートを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
      { suit: "h", rank: "4" },
      { suit: "s", rank: "5" },
      { suit: "c", rank: "K" },
      { suit: "d", rank: "Q" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("STRAIGHT");
    expect(result.kickers[0]).toBe(5); // A-lowストレートの最高は5
  });

  it("スリーカードを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "A" },
      { suit: "d", rank: "A" },
      { suit: "h", rank: "K" },
      { suit: "s", rank: "Q" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("THREE_OF_A_KIND");
  });

  it("ツーペアを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "A" },
      { suit: "d", rank: "K" },
      { suit: "h", rank: "K" },
      { suit: "s", rank: "Q" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("TWO_PAIR");
  });

  it("ワンペアを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "A" },
      { suit: "d", rank: "K" },
      { suit: "h", rank: "Q" },
      { suit: "s", rank: "J" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("ONE_PAIR");
  });

  it("ハイカードを正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "K" },
      { suit: "d", rank: "Q" },
      { suit: "h", rank: "J" },
      { suit: "s", rank: "9" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
    ];
    const result = evaluateStudHi(cards);
    expect(result.rank).toBe("HIGH_CARD");
  });
});

describe("evaluateRazz", () => {
  it("A-2-3-4-5が最強であること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
      { suit: "h", rank: "4" },
      { suit: "s", rank: "5" },
      { suit: "c", rank: "K" },
      { suit: "d", rank: "Q" },
    ];
    const result = evaluateRazz(cards);
    expect(result.ranks).toEqual([1, 2, 3, 4, 5]);
  });

  it("ペアがある場合は弱くなること", () => {
    const cards1: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
      { suit: "h", rank: "4" },
      { suit: "s", rank: "5" },
      { suit: "c", rank: "K" },
      { suit: "d", rank: "Q" },
    ];
    const cards2: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "A" }, // ペア
      { suit: "d", rank: "2" },
      { suit: "h", rank: "3" },
      { suit: "s", rank: "4" },
      { suit: "c", rank: "5" },
      { suit: "d", rank: "K" },
    ];
    const result1 = evaluateRazz(cards1);
    const result2 = evaluateRazz(cards2);
    // result1の方が強い（ranksが小さい）
    expect(result1.ranks[4]).toBeLessThan(result2.ranks[4]);
  });
});

describe("evaluateStud8", () => {
  it("HighとLowの両方を評価できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
      { suit: "h", rank: "4" },
      { suit: "s", rank: "5" },
      { suit: "c", rank: "K" },
      { suit: "d", rank: "Q" },
    ];
    const result = evaluateStud8(cards);
    expect(result.high.rank).toBeDefined();
    expect(result.low).not.toBeNull();
    expect(result.low?.ranks).toEqual([1, 2, 3, 4, 5]);
  });

  it("Lowが成立しない場合（8以上が含まれる）", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
      { suit: "h", rank: "4" },
      { suit: "s", rank: "9" }, // 8以上
      { suit: "c", rank: "K" },
      { suit: "d", rank: "Q" },
    ];
    const result = evaluateStud8(cards);
    expect(result.high.rank).toBeDefined();
    expect(result.low).toBeNull();
  });

  it("Scoop (High & Low Win) を正しく判定できること", () => {
    const cards: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "2" },
      { suit: "d", rank: "3" },
      { suit: "h", rank: "4" },
      { suit: "s", rank: "5" }, // A-2-3-4-5 Straight (High) & Low
      { suit: "c", rank: "K" },
      { suit: "d", rank: "Q" },
    ];
    const result = evaluateStud8(cards);

    // High: Straight
    expect(result.high.rank).toBe("STRAIGHT");
    expect(result.high.kickers[0]).toBe(5); // 5-high straight

    // Low: 5-4-3-2-A
    expect(result.low).not.toBeNull();
    expect(result.low?.ranks).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("resolveShowdown", () => {
  const createDealState = (
    gameType: "studHi" | "razz" | "stud8",
  ): DealState => {
    return {
      dealId: "test-deal",
      gameType,
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
      dealFinished: false,
      deck: [],
      rngSeed: "",
      hands: {
        0: { downCards: [], upCards: [] },
        1: { downCards: [], upCards: [] },
      },
    };
  };

  it("Stud Hiで明確な勝者を決定できること", () => {
    const hands: Record<number, Card[]> = {
      0: [
        { suit: "s", rank: "A" },
        { suit: "c", rank: "A" },
        { suit: "d", rank: "A" },
        { suit: "h", rank: "K" },
        { suit: "s", rank: "K" },
        { suit: "c", rank: "Q" },
        { suit: "d", rank: "J" },
      ],
      1: [
        { suit: "s", rank: "A" },
        { suit: "c", rank: "A" },
        { suit: "d", rank: "K" },
        { suit: "h", rank: "K" },
        { suit: "s", rank: "Q" },
        { suit: "c", rank: "Q" },
        { suit: "d", rank: "J" },
      ],
    };
    const deal = createDealState("studHi");
    const result = resolveShowdown(deal, hands);
    expect(result.winnersHigh).toHaveLength(1);
    expect(result.winnersHigh[0]).toBe(0); // フルハウスが勝つ
  });

  it("ブロードウェイストレート（A-K-Q-J-T）が最強として判定されること", () => {
    const hands: Record<number, Card[]> = {
      0: [
        { suit: "s", rank: "A" },
        { suit: "c", rank: "K" },
        { suit: "d", rank: "Q" },
        { suit: "h", rank: "J" },
        { suit: "s", rank: "T" },
        { suit: "c", rank: "9" }, // dummy
        { suit: "d", rank: "2" }, // dummy
      ],
      1: [
        // K high straight
        { suit: "s", rank: "K" },
        { suit: "c", rank: "Q" },
        { suit: "d", rank: "J" },
        { suit: "h", rank: "T" },
        { suit: "s", rank: "9" },
        { suit: "c", rank: "8" },
        { suit: "d", rank: "2" },
      ],
    };
    const deal = createDealState("studHi");
    const result = resolveShowdown(deal, hands);
    expect(result.winnersHigh).toHaveLength(1);
    expect(result.winnersHigh[0]).toBe(0); // BroadWay Straight wins
  });

  it("同じランクのペア同士でキッカー勝負が正しく判定されること", () => {
    const hands: Record<number, Card[]> = {
      0: [
        // Aペア + Qキッカー
        { suit: "s", rank: "A" },
        { suit: "c", rank: "A" },
        { suit: "d", rank: "Q" },
        { suit: "h", rank: "T" },
        { suit: "s", rank: "8" },
        { suit: "c", rank: "2" },
        { suit: "d", rank: "3" },
      ],
      1: [
        // Aペア + Jキッカー
        { suit: "s", rank: "A" }, // same pair rank
        { suit: "h", rank: "A" },
        { suit: "d", rank: "J" }, // weaker kicker
        { suit: "h", rank: "T" },
        { suit: "s", rank: "8" },
        { suit: "c", rank: "2" },
        { suit: "d", rank: "3" },
      ],
    };
    const deal = createDealState("studHi");
    const result = resolveShowdown(deal, hands);
    expect(result.winnersHigh).toHaveLength(1);
    expect(result.winnersHigh[0]).toBe(0); // Q kicker wins
  });

  it("Ace HighがKing Highに勝つこと", () => {
    const hands: Record<number, Card[]> = {
      0: [
        // A High
        { suit: "s", rank: "A" },
        { suit: "c", rank: "Q" },
        { suit: "d", rank: "J" },
        { suit: "h", rank: "9" },
        { suit: "s", rank: "7" },
        { suit: "c", rank: "5" },
        { suit: "d", rank: "3" },
      ],
      1: [
        // K High
        { suit: "s", rank: "K" },
        { suit: "c", rank: "Q" },
        { suit: "d", rank: "J" },
        { suit: "h", rank: "9" },
        { suit: "s", rank: "7" },
        { suit: "c", rank: "5" },
        { suit: "d", rank: "3" },
      ],
    };
    const deal = createDealState("studHi");
    const result = resolveShowdown(deal, hands);
    expect(result.winnersHigh).toHaveLength(1);
    expect(result.winnersHigh[0]).toBe(0); // Ace High wins
  });

  it("Stud Hiでチョップを正しく判定できること", () => {
    const sameHand: Card[] = [
      { suit: "s", rank: "A" },
      { suit: "c", rank: "A" },
      { suit: "d", rank: "K" },
      { suit: "h", rank: "K" },
      { suit: "s", rank: "Q" },
      { suit: "c", rank: "Q" },
      { suit: "d", rank: "J" },
    ];
    const hands: Record<number, Card[]> = {
      0: sameHand,
      1: sameHand,
    };
    const deal = createDealState("studHi");
    const result = resolveShowdown(deal, hands);
    expect(result.winnersHigh).toHaveLength(2); // チョップ
  });

  it("Stud HiでAのワンペアが8のワンペアに勝つこと（Issue #42）", () => {
    const hands: Record<number, Card[]> = {
      0: [
        // Aのワンペア
        { suit: "s", rank: "A" },
        { suit: "c", rank: "A" },
        { suit: "d", rank: "K" },
        { suit: "h", rank: "Q" },
        { suit: "s", rank: "J" },
        { suit: "c", rank: "9" },
        { suit: "d", rank: "7" },
      ],
      1: [
        // 8のワンペア
        { suit: "s", rank: "8" },
        { suit: "c", rank: "8" },
        { suit: "d", rank: "K" },
        { suit: "h", rank: "Q" },
        { suit: "s", rank: "J" },
        { suit: "c", rank: "9" },
        { suit: "d", rank: "7" },
      ],
    };
    const deal = createDealState("studHi");
    const result = resolveShowdown(deal, hands);
    expect(result.winnersHigh).toHaveLength(1);
    expect(result.winnersHigh[0]).toBe(0); // seat 0 (Aのペア) が勝者
  });

  it("全員foldの場合（1人だけ残っている）", () => {
    const deal: DealState = {
      dealId: "test-deal",
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
      dealFinished: false,
      deck: [],
      rngSeed: "",
      hands: {
        0: { downCards: [], upCards: [] },
      },
    };
    const result = resolveShowdown(deal, { 0: [] });
    expect(result.winnersHigh).toHaveLength(1);
    expect(result.winnersHigh[0]).toBe(0);
  });
});

describe("distributePot", () => {
  const seatToPlayerId = (seat: number): string => {
    return `player${seat + 1}`;
  };

  it("Stud Hiで均等分配できること", () => {
    const potShare = distributePot(
      "studHi",
      100,
      [0, 1], // 2人でチョップ
      null,
      seatToPlayerId,
    );
    expect(potShare.player1).toBe(50);
    expect(potShare.player2).toBe(50);
  });

  it("Stud Hiで端数処理が正しいこと", () => {
    const potShare = distributePot(
      "studHi",
      101, // 端数1
      [0, 1],
      null,
      seatToPlayerId,
    );
    expect(potShare.player1 + potShare.player2).toBe(101);
    // seat順で配布されるので、player1が1多くもらう
    expect(potShare.player1).toBe(51);
    expect(potShare.player2).toBe(50);
  });

  it("Stud8でLow不成立時はHiが総取り", () => {
    const potShare = distributePot(
      "stud8",
      100,
      [0], // Hi勝者1人
      null, // Low不成立
      seatToPlayerId,
    );
    expect(potShare.player1).toBe(100);
  });

  it("Stud8でLow成立時はHi/Low分割", () => {
    const potShare = distributePot(
      "stud8",
      100,
      [0], // Hi勝者
      [1], // Low勝者
      seatToPlayerId,
    );
    expect(potShare.player1).toBe(50); // Hi側
    expect(potShare.player2).toBe(50); // Low側
  });

  it("Stud8で端数はHi側に配布", () => {
    const potShare = distributePot(
      "stud8",
      101, // 端数1
      [0],
      [1],
      seatToPlayerId,
    );
    expect(potShare.player1).toBe(51); // Hi側（端数込み）
    expect(potShare.player2).toBe(50); // Low側
  });
});

describe("calcDeltaStacks", () => {
  const seatToPlayerId = (seat: number): string => {
    return `player${seat + 1}`;
  };

  it("deltaStacksが正しく計算されること", () => {
    const deal: DealState = {
      dealId: "test-deal",
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
      dealFinished: false,
      deck: [],
      rngSeed: "",
      hands: {},
    };

    const potShare = {
      player1: 200, // 勝者
      player2: 0,
    };

    const delta = calcDeltaStacks(deal, potShare, seatToPlayerId);
    expect(delta.player1).toBe(-100 + 200); // -committed + potShare
    expect(delta.player2).toBe(-100 + 0); // -committed
  });
});
