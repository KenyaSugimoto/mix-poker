import type {
  Card,
  DealState,
  HandRank,
  LowHandScore,
  SeatIndex,
} from "../types";

export interface HighHandResult {
  rank: HandRank;
  kickers: number[]; // 役の強さを比較するためのキッカー配列（降順）
}

export interface Stud8Result {
  high: HighHandResult;
  low: LowHandScore | null;
}

export interface ShowdownResult {
  winnersHigh: SeatIndex[];
  winnersLow?: SeatIndex[];
}

/**
 * ランクを数値に変換（A=1, K=13, Q=12, J=11, T=10, 9=9, ..., 2=2）
 */
/**
 * ランクを数値に変換（Stud8 Low / Razz 用 - A=1, K=13）
 */
const rankToNumberLow = (rank: Card["rank"]): number => {
  const map: Record<Card["rank"], number> = {
    A: 1,
    K: 13,
    Q: 12,
    J: 11,
    T: 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
  };
  return map[rank];
};

/**
 * ランクを数値に変換（Stud Hi / Stud8 Hi 用 - A=14, K=13）
 */
const rankToNumberHigh = (rank: Card["rank"]): number => {
  const map: Record<Card["rank"], number> = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    T: 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
  };
  return map[rank];
};

/**
 * カード配列をランクでグループ化
 */
export const groupByRank = (
  cards: Card[],
  rankConverter = rankToNumberLow,
): Map<number, Card[]> => {
  const groups = new Map<number, Card[]>();
  for (const card of cards) {
    const rank = rankConverter(card.rank);
    const existing = groups.get(rank) || [];
    groups.set(rank, [...existing, card]);
  }
  return groups;
};

/**
 * スートでグループ化
 */
const groupBySuit = (cards: Card[]): Map<Card["suit"], Card[]> => {
  const groups = new Map<Card["suit"], Card[]>();
  for (const card of cards) {
    const existing = groups.get(card.suit) || [];
    groups.set(card.suit, [...existing, card]);
  }
  return groups;
};

/**
 * ストレート判定（A-2-3-4-5も含む）
 * @returns ストレートの最高ランク（A-lowの場合は5、通常の場合は最高ランク、A-K-Q-J-Tの場合は14）
 */
const isStraight = (
  ranks: number[],
): { isStraight: boolean; highestRank: number | null } => {
  if (ranks.length < 5) return { isStraight: false, highestRank: null };
  const sorted = [...ranks].sort((a, b) => a - b);
  const unique = [...new Set(sorted)];

  // A-K-Q-J-T（ブロードウェイストレート）をチェック
  if (
    unique.includes(1) && // A
    unique.includes(13) && // K
    unique.includes(12) && // Q
    unique.includes(11) && // J
    unique.includes(10) // T
  ) {
    return { isStraight: true, highestRank: 14 }; // A=14として扱う
  }

  // A-2-3-4-5（A-lowストレート）をチェック
  if (
    unique.includes(1) &&
    unique.includes(2) &&
    unique.includes(3) &&
    unique.includes(4) &&
    unique.includes(5)
  ) {
    return { isStraight: true, highestRank: 5 };
  }

  // 通常のストレート
  for (let i = 0; i <= unique.length - 5; i++) {
    let consecutive = true;
    for (let j = 1; j < 5; j++) {
      if (unique[i + j] !== unique[i] + j) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      return { isStraight: true, highestRank: unique[i + 4] };
    }
  }

  return { isStraight: false, highestRank: null };
};

/**
 * 7枚から最良の5枚を選んでHighHandResultを返す
 */
export const evaluateStudHi = (cards: Card[]): HighHandResult => {
  // 5枚未満でもペア判定などは行うため、早期リターンは削除


  const rankGroups = groupByRank(cards, rankToNumberHigh);
  const suitGroups = groupBySuit(cards);

  // ランクの出現回数でソート（多い順）
  const rankCounts = Array.from(rankGroups.entries())
    .map(([rank, cards]) => ({ rank, count: cards.length, cards }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  // フラッシュ判定
  let flushSuit: Card["suit"] | null = null;
  for (const [suit, suitCards] of suitGroups.entries()) {
    if (suitCards.length >= 5) {
      flushSuit = suit;
      break;
    }
  }

  // ストレートフラッシュ判定（フラッシュがある場合のみ）
  if (flushSuit) {
    const flushCards = suitGroups.get(flushSuit);
    if (flushCards) {
      const flushRanks = flushCards.map((c) => rankToNumberLow(c.rank));
      const straightResult = isStraight(flushRanks);
      if (straightResult.isStraight && straightResult.highestRank !== null) {
        return {
          rank: "STRAIGHT_FLUSH",
          kickers: [straightResult.highestRank],
        };
      }
    }
  }

  // ストレート判定（全カードのランクから）
  const allRanks = cards.map((c) => rankToNumberLow(c.rank));
  const straightResult = isStraight(allRanks);

  // フォーカード判定
  if (rankCounts[0].count === 4) {
    const fourRank = rankCounts[0].rank;
    const kicker = rankCounts[1]?.rank || 0;
    return {
      rank: "FOUR_OF_A_KIND",
      kickers: [fourRank, kicker],
    };
  }

  // フルハウス判定
  if (rankCounts[0].count === 3 && rankCounts[1]?.count === 2) {
    return {
      rank: "FULL_HOUSE",
      kickers: [rankCounts[0].rank, rankCounts[1].rank],
    };
  }

  // フラッシュ判定
  if (flushSuit) {
    const flushCards = suitGroups.get(flushSuit);
    if (flushCards) {
      const flushRanks = flushCards
        .map((c) => rankToNumberHigh(c.rank))
        .sort((a, b) => b - a)
        .slice(0, 5);
      return {
        rank: "FLUSH",
        kickers: flushRanks,
      };
    }
  }

  // ストレート判定
  if (straightResult.isStraight && straightResult.highestRank !== null) {
    return {
      rank: "STRAIGHT",
      kickers: [straightResult.highestRank],
    };
  }

  // スリーカード判定
  if (rankCounts[0].count === 3) {
    const threeRank = rankCounts[0].rank;
    const kickers = rankCounts
      .slice(1)
      .map((r) => r.rank)
      .slice(0, 2)
      .sort((a, b) => b - a);
    return {
      rank: "THREE_OF_A_KIND",
      kickers: [threeRank, ...kickers],
    };
  }

  // ツーペア判定
  if (rankCounts[0].count === 2 && rankCounts[1]?.count === 2) {
    const pair1 = rankCounts[0].rank;
    const pair2 = rankCounts[1].rank;
    const kicker = rankCounts[2]?.rank || 0;
    return {
      rank: "TWO_PAIR",
      kickers: [Math.max(pair1, pair2), Math.min(pair1, pair2), kicker],
    };
  }

  // ワンペア判定
  if (rankCounts[0].count === 2) {
    const pairRank = rankCounts[0].rank;
    const kickers = rankCounts
      .slice(1)
      .map((r) => r.rank)
      .slice(0, 3)
      .sort((a, b) => b - a);
    return {
      rank: "ONE_PAIR",
      kickers: [pairRank, ...kickers],
    };
  }

  // ハイカード
  const kickers = rankCounts
    .map((r) => r.rank)
    .slice(0, 5)
    .sort((a, b) => b - a);
  return {
    rank: "HIGH_CARD",
    kickers,
  };
};

/**
 * Razz用のLow評価（最も弱い役が勝ち）
 */
export const evaluateRazz = (cards: Card[]): LowHandScore => {
  // 7枚から最良のLow 5枚を選ぶ
  // 重複ランクは弱くなる（ペアは避ける）
  // フラッシュ・ストレートは無視

  const rankGroups = groupByRank(cards);
  const rankCounts = Array.from(rankGroups.entries())
    .map(([rank, cards]) => ({ rank, count: cards.length }))
    .sort((a, b) => {
      // まず出現回数が少ない順（ペアを避ける）
      if (a.count !== b.count) return a.count - b.count;
      // 次にランクが低い順
      return a.rank - b.rank;
    });

  // 5枚選ぶ（重複ランクは1枚ずつ）
  const selectedRanks: number[] = [];
  for (const rc of rankCounts) {
    if (selectedRanks.length >= 5) break;
    // 重複ランクは1枚だけ使う
    if (!selectedRanks.includes(rc.rank)) {
      selectedRanks.push(rc.rank);
    }
  }

  // 昇順にソート（A=1が最強）
  selectedRanks.sort((a, b) => a - b);

  return {
    ranks: selectedRanks.slice(0, 5),
  };
};

/**
 * Stud8用の評価（Hi/Low両方）
 */
export const evaluateStud8 = (cards: Card[]): Stud8Result => {
  const high = evaluateStudHi(cards);

  // Low判定（8-or-better）
  const rankGroups = groupByRank(cards);
  const rankCounts = Array.from(rankGroups.entries())
    .map(([rank, cards]) => ({ rank, count: cards.length }))
    .sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;
      return a.rank - b.rank;
    });

  // 8以下で重複なしの5枚を選ぶ
  const lowRanks: number[] = [];
  for (const rc of rankCounts) {
    if (lowRanks.length >= 5) break;
    // 8以下で、重複なし
    if (rc.rank <= 8 && !lowRanks.includes(rc.rank)) {
      lowRanks.push(rc.rank);
    }
  }

  // 5枚揃わない場合はLow不成立
  if (lowRanks.length < 5) {
    return {
      high,
      low: null,
    };
  }

  lowRanks.sort((a, b) => a - b);
  return {
    high,
    low: {
      ranks: lowRanks.slice(0, 5),
    },
  };
};

/**
 * HighHandResultを比較（-1: aが強い, 1: bが強い, 0: 同値）
 */
const compareHigh = (a: HighHandResult, b: HighHandResult): number => {
  const rankOrder: HandRank[] = [
    "HIGH_CARD",
    "ONE_PAIR",
    "TWO_PAIR",
    "THREE_OF_A_KIND",
    "STRAIGHT",
    "FLUSH",
    "FULL_HOUSE",
    "FOUR_OF_A_KIND",
    "STRAIGHT_FLUSH",
  ];

  const aRankIndex = rankOrder.indexOf(a.rank);
  const bRankIndex = rankOrder.indexOf(b.rank);

  if (aRankIndex !== bRankIndex) {
    return aRankIndex - bRankIndex;
  }

  // 同じ役の場合はキッカーで比較
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const aKicker = a.kickers[i] || 0;
    const bKicker = b.kickers[i] || 0;
    if (aKicker !== bKicker) {
      return aKicker - bKicker;
    }
  }

  return 0;
};

/**
 * LowHandScoreを比較（-1: aが強い（低い）, 1: bが強い（低い）, 0: 同値）
 */
const compareLow = (a: LowHandScore, b: LowHandScore): number => {
  // 後ろ（高い数字）から比較し、数字が小さい方が強い
  const aRanks = [...a.ranks].reverse();
  const bRanks = [...b.ranks].reverse();

  for (let i = 0; i < Math.max(aRanks.length, bRanks.length); i++) {
    const aRank = aRanks[i] ?? 0;
    const bRank = bRanks[i] ?? 0;
    if (aRank !== bRank) {
      return aRank - bRank; // 小さい方が強い
    }
  }

  return 0;
};

/**
 * ショーダウンを解決し、勝者を決定する
 */
export const resolveShowdown = (
  state: DealState,
  hands: Record<SeatIndex, Card[]>,
): ShowdownResult => {
  const activeSeats = state.players
    .map((p, idx) => (p.active ? idx : -1))
    .filter((idx) => idx >= 0);

  if (activeSeats.length === 0) {
    return { winnersHigh: [] };
  }

  // 全員foldの場合（1人だけ残っている）
  if (activeSeats.length === 1) {
    return { winnersHigh: activeSeats };
  }

  const gameType = state.gameType;

  if (gameType === "studHi") {
    // Stud Hi: 最強のHighHandが勝者
    const evaluations = activeSeats.map((seat) => ({
      seat,
      result: evaluateStudHi(hands[seat] || []),
    }));

    // 最強を探す
    let winners: SeatIndex[] = [evaluations[0].seat];
    let bestResult = evaluations[0].result;

    for (let i = 1; i < evaluations.length; i++) {
      const comp = compareHigh(evaluations[i].result, bestResult);
      if (comp > 0) {
        // 新しい最強
        winners = [evaluations[i].seat];
        bestResult = evaluations[i].result;
      } else if (comp === 0) {
        // 同値（チョップ）
        winners.push(evaluations[i].seat);
      }
    }

    return { winnersHigh: winners };
  }

  if (gameType === "razz") {
    // Razz: 最も弱いLowHandが勝者
    const evaluations = activeSeats.map((seat) => ({
      seat,
      result: evaluateRazz(hands[seat] || []),
    }));

    // 最弱を探す（LowHandScoreが小さい方が強い）
    let winners: SeatIndex[] = [evaluations[0].seat];
    let bestResult = evaluations[0].result;

    for (let i = 1; i < evaluations.length; i++) {
      const comp = compareLow(evaluations[i].result, bestResult);
      if (comp < 0) {
        // 新しい最弱（より強いLow）
        winners = [evaluations[i].seat];
        bestResult = evaluations[i].result;
      } else if (comp === 0) {
        // 同値（チョップ）
        winners.push(evaluations[i].seat);
      }
    }

    return { winnersHigh: winners };
  }

  if (gameType === "stud8") {
    // Stud8: HiとLowを独立に決定
    const evaluations = activeSeats.map((seat) => ({
      seat,
      result: evaluateStud8(hands[seat] || []),
    }));

    // Hi勝者を決定
    let winnersHigh: SeatIndex[] = [evaluations[0].seat];
    let bestHigh = evaluations[0].result.high;

    for (let i = 1; i < evaluations.length; i++) {
      const comp = compareHigh(evaluations[i].result.high, bestHigh);
      if (comp > 0) {
        winnersHigh = [evaluations[i].seat];
        bestHigh = evaluations[i].result.high;
      } else if (comp === 0) {
        winnersHigh.push(evaluations[i].seat);
      }
    }

    // Low勝者を決定（Lowが成立している場合のみ）
    const lowEvaluations = evaluations.filter((e) => e.result.low !== null);
    let winnersLow: SeatIndex[] = [];

    if (lowEvaluations.length > 0) {
      const firstLow = lowEvaluations[0].result.low;
      if (firstLow !== null) {
        winnersLow = [lowEvaluations[0].seat];
        let bestLow = firstLow;

        for (let i = 1; i < lowEvaluations.length; i++) {
          const currentLow = lowEvaluations[i].result.low;
          if (currentLow !== null) {
            const comp = compareLow(currentLow, bestLow);
            if (comp < 0) {
              winnersLow = [lowEvaluations[i].seat];
              bestLow = currentLow;
            } else if (comp === 0) {
              winnersLow.push(lowEvaluations[i].seat);
            }
          }
        }
      }
    }

    return {
      winnersHigh,
      winnersLow: winnersLow.length > 0 ? winnersLow : undefined,
    };
  }

  // フォールバック
  return { winnersHigh: activeSeats };
};
