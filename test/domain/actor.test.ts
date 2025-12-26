import { describe, expect, it } from "vitest";
import {
  computeBringInIndex,
  getNextActor,
  pickFirstActorFromUpcards,
} from "../../src/domain/rules/actor";
import type {
  Card,
  DealState,
  GameType,
  PlayerHand,
  PlayerKind,
  SeatIndex,
} from "../../src/domain/types";

describe("getNextActor", () => {
  const baseState: DealState = {
    dealId: "test-deal",
    gameType: "studHi",
    playerCount: 3,
    players: [
      {
        seat: 0,
        kind: "human" as PlayerKind,
        active: true,
        stack: 1000,
        committedTotal: 0,
        committedThisStreet: 0,
      },
      {
        seat: 1,
        kind: "cpu" as PlayerKind,
        active: true,
        stack: 1000,
        committedTotal: 0,
        committedThisStreet: 0,
      },
      {
        seat: 2,
        kind: "cpu" as PlayerKind,
        active: true,
        stack: 1000,
        committedTotal: 0,
        committedThisStreet: 0,
      },
    ],
    seatOrder: ["player1", "player2", "player3"],
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
    deck: [],
    rngSeed: "",
    hands: {},
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
      currentBet: 100, // 攻撃フェーズ
      pendingResponseCount: 0,
    };
    const next = getNextActor(state);
    expect(next).toBeNull();
  });

  it("CHECKフェーズで、まだチェックしていないアクティブプレイヤーがいる場合、次のアクターを返すこと", () => {
    const state = {
      ...baseState,
      currentActorIndex: 0,
      currentBet: 0, // CHECKフェーズ
      checksThisStreet: 1, // 1人がチェック済み
      pendingResponseCount: 0,
    };
    const next = getNextActor(state);
    expect(next).toBe(1); // seat 1が次のアクター
  });

  it("CHECKフェーズで、全員がチェックした場合、nullを返すこと（ストリート終了）", () => {
    const state = {
      ...baseState,
      currentActorIndex: 2,
      currentBet: 0, // CHECKフェーズ
      checksThisStreet: 3, // 全員がチェック済み（activeCount=3）
      pendingResponseCount: 0,
    };
    const next = getNextActor(state);
    expect(next).toBeNull();
  });

  it("CHECKフェーズで、checksThisStreetがactiveCount未満の場合、次のアクターを返すこと", () => {
    const state = {
      ...baseState,
      currentActorIndex: 1,
      currentBet: 0, // CHECKフェーズ
      checksThisStreet: 1, // 1人がチェック済み（activeCount=3）
      pendingResponseCount: 0,
    };
    const next = getNextActor(state);
    expect(next).toBe(2); // seat 2が次のアクター
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

describe("computeBringInIndex", () => {
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
    seatOrder: ["player1", "player2", "player3"],
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
    deck: [],
    rngSeed: "",
    hands: {},
  };

  it("Stud Hiで最弱のアップカード（rank最小）を持つプレイヤーがbring-inになること", () => {
    const state: DealState = {
      ...baseState,
      gameType: "studHi",
      hands: {
        0: {
          downCards: [],
          upCards: [{ rank: "K", suit: "c" }], // K
        },
        1: {
          downCards: [],
          upCards: [{ rank: "2", suit: "c" }], // 2（最弱）
        },
        2: {
          downCards: [],
          upCards: [{ rank: "A", suit: "c" }], // A
        },
      },
    };

    const bringInIndex = computeBringInIndex(state);
    expect(bringInIndex).toBe(1); // seat 1が最弱（2）
  });

  it("Razzで最強のアップカード（rank最大）を持つプレイヤーがbring-inになること", () => {
    const state: DealState = {
      ...baseState,
      gameType: "razz",
      hands: {
        0: {
          downCards: [],
          upCards: [{ rank: "K", suit: "c" }], // K
        },
        1: {
          downCards: [],
          upCards: [{ rank: "2", suit: "c" }], // 2
        },
        2: {
          downCards: [],
          upCards: [{ rank: "A", suit: "c" }], // A（最強）
        },
      },
    };

    const bringInIndex = computeBringInIndex(state);
    expect(bringInIndex).toBe(2); // seat 2が最強（A）
  });

  it("同rankの場合、スート順でタイブレークされること（Stud Hi）", () => {
    const state: DealState = {
      ...baseState,
      gameType: "studHi",
      hands: {
        0: {
          downCards: [],
          upCards: [{ rank: "2", suit: "s" }], // 2♠
        },
        1: {
          downCards: [],
          upCards: [{ rank: "2", suit: "c" }], // 2♣（スート順で最小）
        },
        2: {
          downCards: [],
          upCards: [{ rank: "2", suit: "h" }], // 2♥
        },
      },
    };

    const bringInIndex = computeBringInIndex(state);
    expect(bringInIndex).toBe(1); // seat 1が2♣（スート順で最小）
  });

  it("Razzで同rankの場合、スート順は逆順でタイブレークされること", () => {
    const state: DealState = {
      ...baseState,
      gameType: "razz",
      hands: {
        0: {
          downCards: [],
          upCards: [{ rank: "A", suit: "c" }], // A♣
        },
        1: {
          downCards: [],
          upCards: [{ rank: "A", suit: "s" }], // A♠（Razzではスート順で最小）
        },
        2: {
          downCards: [],
          upCards: [{ rank: "A", suit: "h" }], // A♥
        },
      },
    };

    const bringInIndex = computeBringInIndex(state);
    expect(bringInIndex).toBe(1); // seat 1がA♠（Razzではスート順で最小）
  });

  it("カード情報がない場合はseat最小を返すこと", () => {
    const state: DealState = {
      ...baseState,
      gameType: "studHi",
      hands: {},
    };

    const bringInIndex = computeBringInIndex(state);
    expect(bringInIndex).toBe(0); // seat 0が最小
  });

  it("Stud8でも最弱のアップカードを持つプレイヤーがbring-inになること", () => {
    const state: DealState = {
      ...baseState,
      gameType: "stud8",
      hands: {
        0: {
          downCards: [],
          upCards: [{ rank: "K", suit: "c" }],
        },
        1: {
          downCards: [],
          upCards: [{ rank: "2", suit: "c" }], // 2（最弱）
        },
        2: {
          downCards: [],
          upCards: [{ rank: "A", suit: "c" }],
        },
      },
    };

    const bringInIndex = computeBringInIndex(state);
    expect(bringInIndex).toBe(1); // seat 1が最弱（2）
  });
});

const c = (rank: Card["rank"], suit: Card["suit"] = "c"): Card => ({
  rank,
  suit,
});

const hand = (upRanks: Card["rank"][]): PlayerHand =>
  ({
    downCards: [],
    upCards: upRanks.map((r, i) =>
      c(r, (["c", "d", "h", "s"] as const)[i % 4]),
    ),
  }) as PlayerHand;

const makeUpCards = (
  spec: Record<number, Card["rank"][]>,
): Record<number, PlayerHand> => {
  const out: Record<number, PlayerHand> = {};
  for (const [k, ranks] of Object.entries(spec)) out[Number(k)] = hand(ranks);
  return out;
};

describe("pickFirstActorFromUpcards", () => {
  describe("Stud Hi / Stud8（upcards強い人が先頭）", () => {
    describe("4th Street", () => {
      it("ペア > ハイカード の優先順位で選ばれる", () => {
        const gameType: GameType = "studHi";
        const activeSeats: SeatIndex[] = [0, 1];

        const hands = makeUpCards({
          0: ["A", "K", "Q"], // high
          1: ["9", "9", "2"], // pair
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(1);
      });

      it("同カテゴリ（ハイカード）は大きいランクが高い方が強い（辞書式）", () => {
        const gameType: GameType = "stud8";
        const activeSeats: SeatIndex[] = [0, 1];

        // seat0: A Q
        // seat1: A 9
        // 先頭比較：A同士 → Q vs 9で seat0 が強い
        const hands = makeUpCards({
          0: ["A", "Q"],
          1: ["A", "9"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(0);
      });
    });
    describe("5th Street", () => {
      it("トリップス > ペア > ハイカード の優先順位で選ばれる", () => {
        const gameType: GameType = "studHi";
        const activeSeats: SeatIndex[] = [0, 1, 2];

        const hands = makeUpCards({
          0: ["A", "K", "Q"], // high
          1: ["9", "9", "2"], // pair
          2: ["5", "5", "5"], // trips
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(2);
      });

      it("同カテゴリ（ハイカード）は大きいランクが高い方が強い（辞書式）", () => {
        const gameType: GameType = "stud8";
        const activeSeats: SeatIndex[] = [0, 1];

        // seat0: A K Q
        // seat1: A K 9
        // 先頭比較：A同士 → K同士 → Q vs 9で seat0 が強い
        const hands = makeUpCards({
          0: ["A", "K", "Q"],
          1: ["A", "K", "9"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(0);
      });

      it("同カテゴリ（ペア）は ペアランク → キッカー降順 で比較される (ペア勝負)", () => {
        const gameType: GameType = "studHi";
        const activeSeats: SeatIndex[] = [0, 1];

        // 両方ペアだが、ペアランクで比較
        // seat0: 8 8 Q
        // seat1: A A 3
        // ペア：A > 8 なので seat1
        const hands = makeUpCards({
          0: ["8", "8", "Q"],
          1: ["A", "A", "3"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(1);
      });

      it("同カテゴリ（ペア）は ペアランク → キッカー降順 で比較される (キッカー勝負)", () => {
        const gameType: GameType = "stud8";
        const activeSeats: SeatIndex[] = [0, 1];

        // seat0: A A 2
        // seat1: A A 3
        // ペアランク：A同士 → キッカー 2 vs 3 で seat1が強い
        const hands = makeUpCards({
          0: ["A", "A", "2"],
          1: ["A", "A", "3"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(1);
      });
    });
    describe("6th, 7th Street", () => {
      it("フォーカード > トリップス > ペア > ハイカード の優先順位で選ばれる", () => {
        const gameType: GameType = "studHi";
        const activeSeats: SeatIndex[] = [0, 1, 2, 3];

        const hands = makeUpCards({
          0: ["A", "K", "Q", "J"], // high
          1: ["9", "9", "2", "3"], // pair
          2: ["5", "5", "5", "K"], // trips
          3: ["7", "7", "7", "7"], // quads
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(3);
      });

      it("ペア > ハイカード", () => {
        const gameType: GameType = "studHi";
        const activeSeats: SeatIndex[] = [0, 1];

        const hands = makeUpCards({
          0: ["A", "K", "Q", "J"], // high
          1: ["9", "9", "2", "3"], // pair
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(1);
      });

      it("同カテゴリ（ハイカード）は大きいランクが高い方が強い（辞書式）", () => {
        const gameType: GameType = "stud8";
        const activeSeats: SeatIndex[] = [0, 1];

        // seat0: A K 9 2
        // seat1: A Q J T
        // 先頭比較：A同士 → 次のK(13) vs Q(12)で seat0 が強い
        const hands = makeUpCards({
          0: ["A", "K", "9", "2"],
          1: ["A", "Q", "J", "T"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(0);
      });

      it("同カテゴリ（ペア）は ペアランク → キッカー降順 で比較される (ペア勝負)", () => {
        const gameType: GameType = "studHi";
        const activeSeats: SeatIndex[] = [0, 1];

        // 両方ペアだが、ペアランクで比較
        // seat0: A A 3 2
        // seat1: 8 8 Q J
        // ペア：A > 8 なので seat0
        const hands = makeUpCards({
          0: ["A", "A", "3", "2"],
          1: ["8", "8", "Q", "J"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(0);
      });

      it("同カテゴリ（ペア）は ペアランク → キッカー降順 で比較される (キッカー勝負)", () => {
        const gameType: GameType = "studHi";
        const activeSeats: SeatIndex[] = [0, 1];

        // 両方ペアKだが、キッカーで比較
        // seat0: K K A 2
        // seat1: K K Q J
        // キッカー：A > Q なので seat0
        const hands = makeUpCards({
          0: ["K", "K", "A", "2"],
          1: ["K", "K", "Q", "J"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(0);
      });

      it("ツーペアが出た場合も安定して比較できる（pairs降順→kicker）", () => {
        const gameType: GameType = "studHi";
        const activeSeats: SeatIndex[] = [0, 1];

        // seat0: K K Q Q （kickerなし）
        // seat1: K K J J
        // pairs比較：2ndペア Q(12) > J(11) で seat0
        const hands = makeUpCards({
          0: ["K", "K", "Q", "Q"],
          1: ["K", "K", "J", "J"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(0);
      });

      it("同スコア（完全同一）なら seat の小さい方が選ばれる", () => {
        const gameType: GameType = "stud8";
        const activeSeats: SeatIndex[] = [5, 2];

        // upcardsが同一（スートは無視される前提）
        const hands = makeUpCards({
          5: ["A", "K", "Q", "J"],
          2: ["A", "K", "Q", "J"],
        });

        expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(2);
      });

      it("activeSeats の並び順に依存せず、強い人が選ばれる", () => {
        const gameType: GameType = "studHi";
        const hands = makeUpCards({
          0: ["A", "K", "Q", "J"], // high
          1: ["9", "9", "2", "3"], // pair
        });

        expect(pickFirstActorFromUpcards(gameType, [0, 1], hands)).toBe(1);
        expect(pickFirstActorFromUpcards(gameType, [1, 0], hands)).toBe(1);
      });
    });
  });

  describe("Razz（upcardsが“低いほど良い”基準＋カテゴリ逆転）", () => {
    it("カテゴリ優先順位が逆：ハイカード > ペア > トリップス > フォーカード", () => {
      const gameType: GameType = "razz";
      const activeSeats: SeatIndex[] = [0, 1, 2, 3];

      const hands = makeUpCards({
        0: ["2", "2", "7", "9"], // pair
        1: ["A", "3", "5", "7"], // high（最優先）
        2: ["5", "5", "5", "K"], // trips
        3: ["7", "7", "7", "7"], // quads（最弱）
      });

      expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(1);
    });

    it("同カテゴリ（ハイカード）は“大きいカードが小さい方が強い”（最大カード比較が最重要）", () => {
      const gameType: GameType = "razz";
      const activeSeats: SeatIndex[] = [0, 1];

      // seat0: 9 8 7 A（最大9）
      // seat1: 8 4 3 2（最大8） → 最大が小さい seat1 が強い
      const hands = makeUpCards({
        0: ["9", "8", "7", "A"],
        1: ["8", "4", "3", "2"],
      });

      expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(1);
    });

    it("同カテゴリ（ペア）は“ペアのランクが小さい方が強い”として比較される", () => {
      const gameType: GameType = "razz";
      const activeSeats: SeatIndex[] = [0, 1];

      // seat0: ペア2（強い）
      // seat1: ペア9（弱い）
      const hands = makeUpCards({
        0: ["2", "2", "A", "K"],
        1: ["9", "9", "3", "4"],
      });

      expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(0);
    });

    it("同スコア（完全同一）なら seat の小さい方が選ばれる", () => {
      const gameType: GameType = "razz";
      const activeSeats: SeatIndex[] = [4, 1];

      const hands = makeUpCards({
        4: ["8", "6", "4", "2"],
        1: ["8", "6", "4", "2"],
      });

      expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(1);
    });

    it("activeSeats の並び順に依存しない", () => {
      const gameType: GameType = "razz";
      const hands = makeUpCards({
        0: ["2", "2", "7", "9"], // pair
        1: ["A", "3", "5", "7"], // high（最優先）
      });

      expect(pickFirstActorFromUpcards(gameType, [0, 1], hands)).toBe(1);
      expect(pickFirstActorFromUpcards(gameType, [1, 0], hands)).toBe(1);
    });

    it("hands欠損seatがいても落ちずに比較できる（欠損は弱い扱い）", () => {
      const gameType: GameType = "razz";
      const activeSeats: SeatIndex[] = [0, 1];

      const hands = makeUpCards({
        1: ["A", "3", "5", "7"], // high
      });

      expect(pickFirstActorFromUpcards(gameType, activeSeats, hands)).toBe(1);
    });
  });
});
