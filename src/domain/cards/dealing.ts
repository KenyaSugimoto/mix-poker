import type { Card, Deck, PlayerHand, SeatIndex } from "../types";

/**
 * 52枚のデッキを生成する
 */
export const createDeck = (): Deck => {
  const suits: Card["suit"][] = ["c", "d", "h", "s"];
  const ranks: Card["rank"][] = [
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

  const deck: Deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

/**
 * seed付き疑似乱数生成器（簡易版）
 */
const seededRandom = (seed: string): (() => number) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  let value = Math.abs(hash);

  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

/**
 * Fisher-Yates shuffle（seed付き）
 */
export const shuffleDeck = (deck: Deck, seed: string): Deck => {
  const shuffled = [...deck];
  const random = seededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/**
 * デッキから1枚取り出す（破壊的）
 */
const drawCard = (deck: Deck): Card | null => {
  return deck.shift() ?? null;
};

/**
 * 3rd Streetのカード配布（down 2 + up 1）
 */
export const dealCards3rd = (
  deck: Deck,
  activeSeats: SeatIndex[],
  hands: Record<SeatIndex, PlayerHand>,
): { deck: Deck; hands: Record<SeatIndex, PlayerHand> } => {
  const newDeck = [...deck];
  const newHands = { ...hands };

  for (const seat of activeSeats) {
    if (!newHands[seat]) {
      newHands[seat] = { downCards: [], upCards: [] };
    }

    // down 2枚
    for (let i = 0; i < 2; i++) {
      const card = drawCard(newDeck);
      if (card) {
        newHands[seat].downCards.push(card);
      }
    }

    // up 1枚
    const upCard = drawCard(newDeck);
    if (upCard) {
      newHands[seat].upCards.push(upCard);
    }
  }

  return { deck: newDeck, hands: newHands };
};

/**
 * 4th〜6th Streetのカード配布（up 1枚）
 */
export const dealCardUp = (
  deck: Deck,
  activeSeats: SeatIndex[],
  hands: Record<SeatIndex, PlayerHand>,
): { deck: Deck; hands: Record<SeatIndex, PlayerHand> } => {
  const newDeck = [...deck];
  const newHands = { ...hands };

  for (const seat of activeSeats) {
    if (!newHands[seat]) {
      newHands[seat] = { downCards: [], upCards: [] };
    }

    const card = drawCard(newDeck);
    if (card) {
      newHands[seat].upCards.push(card);
    }
  }

  return { deck: newDeck, hands: newHands };
};

/**
 * 7th Streetのカード配布（down 1枚）
 */
export const dealCard7th = (
  deck: Deck,
  activeSeats: SeatIndex[],
  hands: Record<SeatIndex, PlayerHand>,
): { deck: Deck; hands: Record<SeatIndex, PlayerHand> } => {
  const newDeck = [...deck];
  const newHands = { ...hands };

  for (const seat of activeSeats) {
    if (!newHands[seat]) {
      newHands[seat] = { downCards: [], upCards: [] };
    }

    const card = drawCard(newDeck);
    if (card) {
      newHands[seat].downCards.push(card);
    }
  }

  return { deck: newDeck, hands: newHands };
};

/**
 * 全カードを取得（役判定用）
 */
export const getAllCardsForSeat = (
  hands: Record<SeatIndex, PlayerHand>,
  seat: SeatIndex,
): Card[] => {
  const hand = hands[seat];
  if (!hand) return [];
  return [...hand.downCards, ...hand.upCards];
};
