declare module 'pokersolver' {
  export class Hand {
    static solve(cards: string[]): Hand;
    static winners(hands: Hand[]): Hand[];

    cardPool: string[];
    cards: string[];
    name: string; // e.g., "Two Pair"
    rank: number;
    descr: string;

    toString(): string;
  }
}
