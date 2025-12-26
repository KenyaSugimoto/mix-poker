import type { HandRank, LowHandScore } from "../../domain/types";

/**
 * HandRankを日本語ラベルに変換する
 */
const HAND_RANK_LABELS: Record<HandRank, string> = {
  HIGH_CARD: "ハイカード",
  ONE_PAIR: "ワンペア",
  TWO_PAIR: "ツーペア",
  THREE_OF_A_KIND: "スリーカード",
  STRAIGHT: "ストレート",
  FLUSH: "フラッシュ",
  FULL_HOUSE: "フルハウス",
  FOUR_OF_A_KIND: "フォーカード",
  STRAIGHT_FLUSH: "ストレートフラッシュ",
};

export const getHandRankLabel = (rank: HandRank): string =>
  HAND_RANK_LABELS[rank];

/**
 * ランク数値をカード表記に変換
 */
const rankToChar = (rank: number): string => {
  if (rank === 1) return "A";
  if (rank === 10) return "T";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
};

/**
 * LowHandScoreを表示文字列に変換（例: "7-5-3-2-A"）
 */
export const getLowHandLabel = (lowScore: LowHandScore): string => {
  // 降順にソートして表示
  const sorted = [...lowScore.ranks].sort((a, b) => b - a);
  return sorted.map(rankToChar).join("-");
};
