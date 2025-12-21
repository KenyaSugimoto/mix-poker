import { describe, expect, it } from "vitest";
import {
  createDeck,
  dealCard7th,
  dealCards3rd,
  dealCardUp,
  getAllCardsForSeat,
  shuffleDeck,
} from "../../../src/domain/cards/dealing";
import type { Card, SeatIndex } from "../../../src/domain/types";

describe("dealing", () => {
  describe("createDeck", () => {
    it("52枚のデッキを生成すること", () => {
      const deck = createDeck();
      expect(deck).toHaveLength(52);
    });

    it("重複がないこと", () => {
      const deck = createDeck();
      const cardStrings = deck.map((c) => `${c.suit}${c.rank}`);
      const uniqueCards = new Set(cardStrings);
      expect(uniqueCards.size).toBe(52);
    });

    it("全てのスートとランクが含まれること", () => {
      const deck = createDeck();
      const suits = new Set(deck.map((c) => c.suit));
      const ranks = new Set(deck.map((c) => c.rank));

      expect(suits.size).toBe(4);
      expect(suits.has("c")).toBe(true);
      expect(suits.has("d")).toBe(true);
      expect(suits.has("h")).toBe(true);
      expect(suits.has("s")).toBe(true);

      expect(ranks.size).toBe(13);
      const expectedRanks = [
        "A",
        "K",
        "Q",
        "J",
        "T",
        "9",
        "8",
        "7",
        "6",
        "5",
        "4",
        "3",
        "2",
      ];
      expectedRanks.forEach((rank) => {
        expect(ranks.has(rank as Card["rank"])).toBe(true);
      });
    });
  });

  describe("shuffleDeck", () => {
    it("seedにより再現可能であること", () => {
      const deck1 = createDeck();
      const deck2 = createDeck();
      const seed = "test-seed-123";

      const shuffled1 = shuffleDeck(deck1, seed);
      const shuffled2 = shuffleDeck(deck2, seed);

      expect(shuffled1).toEqual(shuffled2);
    });

    it("異なるseedで異なる結果になること", () => {
      const deck1 = createDeck();
      const deck2 = createDeck();

      const shuffled1 = shuffleDeck(deck1, "seed1");
      const shuffled2 = shuffleDeck(deck2, "seed2");

      expect(shuffled1).not.toEqual(shuffled2);
    });

    it("カードの枚数が変わらないこと", () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck, "test-seed");
      expect(shuffled).toHaveLength(52);
    });

    it("全てのカードが含まれること", () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck, "test-seed");

      const originalCards = new Set(deck.map((c) => `${c.suit}${c.rank}`));
      const shuffledCards = new Set(shuffled.map((c) => `${c.suit}${c.rank}`));

      expect(originalCards).toEqual(shuffledCards);
    });
  });

  describe("dealCards3rd", () => {
    it("各active seatにdown2+up1が配られること", () => {
      const deck = createDeck();
      const activeSeats: SeatIndex[] = [0, 1, 2];
      const hands: Record<SeatIndex, { downCards: Card[]; upCards: Card[] }> = {
        0: { downCards: [], upCards: [] },
        1: { downCards: [], upCards: [] },
        2: { downCards: [], upCards: [] },
      };

      const result = dealCards3rd(deck, activeSeats, hands);

      // 各seatにdown2+up1が配られている
      expect(result.hands[0].downCards).toHaveLength(2);
      expect(result.hands[0].upCards).toHaveLength(1);
      expect(result.hands[1].downCards).toHaveLength(2);
      expect(result.hands[1].upCards).toHaveLength(1);
      expect(result.hands[2].downCards).toHaveLength(2);
      expect(result.hands[2].upCards).toHaveLength(1);

      // デッキから9枚消費されている（3人×3枚）
      expect(result.deck).toHaveLength(deck.length - 9);
    });

    it("fold済みseatには配られないこと", () => {
      const deck = createDeck();
      const activeSeats: SeatIndex[] = [0, 2]; // seat 1はfold済み
      const hands: Record<SeatIndex, { downCards: Card[]; upCards: Card[] }> = {
        0: { downCards: [], upCards: [] },
        1: { downCards: [], upCards: [] }, // fold済み
        2: { downCards: [], upCards: [] },
      };

      const result = dealCards3rd(deck, activeSeats, hands);

      expect(result.hands[0].downCards).toHaveLength(2);
      expect(result.hands[0].upCards).toHaveLength(1);
      expect(result.hands[1].downCards).toHaveLength(0); // fold済みなので配られない
      expect(result.hands[1].upCards).toHaveLength(0);
      expect(result.hands[2].downCards).toHaveLength(2);
      expect(result.hands[2].upCards).toHaveLength(1);
    });
  });

  describe("dealCardUp", () => {
    it("各active seatにup1枚が配られること", () => {
      const deck = createDeck();
      const activeSeats: SeatIndex[] = [0, 1];
      const hands: Record<SeatIndex, { downCards: Card[]; upCards: Card[] }> = {
        0: { downCards: [], upCards: [] },
        1: { downCards: [], upCards: [] },
      };

      const result = dealCardUp(deck, activeSeats, hands);

      expect(result.hands[0].upCards).toHaveLength(1);
      expect(result.hands[1].upCards).toHaveLength(1);
      expect(result.deck).toHaveLength(deck.length - 2);
    });

    it("既存のupCardsに追加されること", () => {
      const deck = createDeck();
      const activeSeats: SeatIndex[] = [0];
      const hands: Record<SeatIndex, { downCards: Card[]; upCards: Card[] }> = {
        0: {
          downCards: [],
          upCards: [{ suit: "c", rank: "A" }], // 既存のカード
        },
      };

      const result = dealCardUp(deck, activeSeats, hands);

      expect(result.hands[0].upCards).toHaveLength(2); // 既存1枚 + 新規1枚
    });
  });

  describe("dealCard7th", () => {
    it("各active seatにdown1枚が配られること", () => {
      const deck = createDeck();
      const activeSeats: SeatIndex[] = [0, 1];
      const hands: Record<SeatIndex, { downCards: Card[]; upCards: Card[] }> = {
        0: { downCards: [], upCards: [] },
        1: { downCards: [], upCards: [] },
      };

      const result = dealCard7th(deck, activeSeats, hands);

      expect(result.hands[0].downCards).toHaveLength(1);
      expect(result.hands[1].downCards).toHaveLength(1);
      expect(result.deck).toHaveLength(deck.length - 2);
    });

    it("既存のdownCardsに追加されること", () => {
      const deck = createDeck();
      const activeSeats: SeatIndex[] = [0];
      const hands: Record<SeatIndex, { downCards: Card[]; upCards: Card[] }> = {
        0: {
          downCards: [
            { suit: "c", rank: "A" },
            { suit: "d", rank: "K" },
          ], // 既存2枚
          upCards: [],
        },
      };

      const result = dealCard7th(deck, activeSeats, hands);

      expect(result.hands[0].downCards).toHaveLength(3); // 既存2枚 + 新規1枚
    });
  });

  describe("getAllCardsForSeat", () => {
    it("downCardsとupCardsを結合して返すこと", () => {
      const hands: Record<SeatIndex, { downCards: Card[]; upCards: Card[] }> = {
        0: {
          downCards: [
            { suit: "c", rank: "A" },
            { suit: "d", rank: "K" },
          ],
          upCards: [
            { suit: "h", rank: "Q" },
            { suit: "s", rank: "J" },
          ],
        },
      };

      const allCards = getAllCardsForSeat(hands, 0);
      expect(allCards).toHaveLength(4);
      expect(allCards[0]).toEqual({ suit: "c", rank: "A" });
      expect(allCards[1]).toEqual({ suit: "d", rank: "K" });
      expect(allCards[2]).toEqual({ suit: "h", rank: "Q" });
      expect(allCards[3]).toEqual({ suit: "s", rank: "J" });
    });

    it("handが存在しない場合は空配列を返すこと", () => {
      const hands: Record<SeatIndex, { downCards: Card[]; upCards: Card[] }> =
        {};

      const allCards = getAllCardsForSeat(hands, 0);
      expect(allCards).toEqual([]);
    });
  });
});
