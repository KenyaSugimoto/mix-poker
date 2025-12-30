/**
 * CPU Lv1 のパラメータ定義
 * 将来的にAIの性格（Aggressive/Tight）を変えるための拡張ポイント
 */
export interface CpuParamsLv1 {
  /** 0..1 大きいほど堅い（降りやすい） */
  tightness: number;
  /** 0..1 大きいほど攻撃的（BET/RAISEしやすい） */
  aggression: number;
  /** 0..1 純ブラフ頻度（かなり低く） */
  bluffFreq: number;
  /** 0..1 セミブラフ頻度 */
  semiBluffFreq: number;
  /** 人数が増えるほど要求強度を上げる係数 */
  multiwayPenalty: number;
  /** 5th+で慎重になる係数 */
  bigBetFear: number;
  /** レイズ頻度を調整する係数 (例: 0.5ならレイズ条件を満たしても50%の確率でコールに留まる) */
  raiseChanceAdjust: number;
}

/**
 * デフォルトパラメータ（堅実寄り）
 */
export const DEFAULT_PARAMS_LV1: CpuParamsLv1 = {
  tightness: 0.2, // 0.75 -> 0.2: Requires less score to act
  aggression: 0.6, // 0.35 -> 0.6: More likely to raise
  bluffFreq: 0.05, // 0.01 -> 0.05: Slightly more random bluffs
  semiBluffFreq: 0.15, // 0.03 -> 0.15: More semi-bluffs
  multiwayPenalty: 0.1, // 0.2 -> 0.1: Less scared of multiway
  bigBetFear: 0.2, // 0.3 -> 0.2: Less scared of big bets
  raiseChanceAdjust: 0.5,
};

/**
 * ストリート別の行動閾値
 */
export interface StreetThresholds {
  /** 3rd bring-in担当がCOMPLETEする最低score */
  completeThreshold: number;
  /** currentBet==0でBETする最低score */
  betThreshold: number;
  /** currentBet>0でRAISEする最低score */
  raiseThreshold: number;
  /** currentBet>0でFOLDを検討する上限score（これ未満なら降り候補） */
  foldThreshold: number;
}

/**
 * ストリート別閾値テーブル
 * baseRequired=50 前提
 */
export const STREET_THRESHOLDS: Record<
  "3rd" | "4th" | "5th" | "6th" | "7th",
  StreetThresholds
> = {
  "3rd": {
    completeThreshold: 60, // 70 -> 60: One Pair likely competes
    betThreshold: 0,
    raiseThreshold: 0,
    foldThreshold: 40,
  },
  "4th": {
    completeThreshold: 0,
    betThreshold: 58, // 62 -> 58: Weak pair can bet
    raiseThreshold: 75,
    foldThreshold: 42,
  },
  "5th": {
    completeThreshold: 0,
    betThreshold: 68,
    raiseThreshold: 82,
    foldThreshold: 48,
  },
  "6th": {
    completeThreshold: 0,
    betThreshold: 70,
    raiseThreshold: 84,
    foldThreshold: 50,
  },
  "7th": {
    completeThreshold: 0,
    betThreshold: 72,
    raiseThreshold: 86,
    foldThreshold: 52,
  },
};

/**
 * HandRank から madeScore への変換テーブル
 */
export const HAND_RANK_SCORES: Record<string, number> = {
  STRAIGHT_FLUSH: 98,
  FOUR_OF_A_KIND: 95,
  FULL_HOUSE: 92,
  FLUSH: 88,
  STRAIGHT: 84,
  THREE_OF_A_KIND: 78,
  TWO_PAIR: 74,
  ONE_PAIR: 64,
  HIGH_CARD: 50,
};
