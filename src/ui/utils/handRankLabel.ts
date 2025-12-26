import type { HandRank } from "../../domain/types";

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
