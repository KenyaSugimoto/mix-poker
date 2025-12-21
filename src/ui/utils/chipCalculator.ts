/**
 * チップの仕様を定義
 */
export type ChipSpec = {
  label: string;
  tone:
    | "teal"
    | "gold"
    | "purple"
    | "red"
    | "blue"
    | "green"
    | "black"
    | "brown"
    | "orange"
    | "white";
};

// チップ額面の定義（大きい順）
const CHIP_DENOMINATIONS = [
  { value: 5000, label: "5K", tone: "brown" as const },
  { value: 1000, label: "1K", tone: "orange" as const },
  { value: 500, label: "500", tone: "purple" as const },
  { value: 100, label: "100", tone: "black" as const },
  { value: 25, label: "25", tone: "green" as const },
  { value: 10, label: "10", tone: "blue" as const },
  { value: 5, label: "5", tone: "red" as const },
  { value: 1, label: "1", tone: "white" as const },
];

// スタックカウントの定数
const MAX_STACK_COUNT = 3; // 最大スタック枚数
const MIN_STACK_COUNT = 2; // 最小スタック枚数
const HIGH_STACK_THRESHOLD = 10; // 高スタックの閾値（枚数）
const MEDIUM_STACK_THRESHOLD = 3; // 中スタックの閾値（枚数）

// チップ選択の定数
const MAX_CHIP_TYPES = 3; // 最大表示チップ種類数

/**
 * ポット額から適切なチップの組み合わせを計算（最大3種類）
 * Anteを最小単位として、Ante未満のチップは使わない
 * 各チップ種類ごとに2〜3枚重ねて表示
 */
export const calculateChips = (
  pot: number,
  ante: number,
): Array<{ spec: ChipSpec; stackCount: number }> => {
  if (pot === 0) {
    return [];
  }

  // Ante未満の額面を除外
  const availableDenoms = CHIP_DENOMINATIONS.filter(
    (denom) => denom.value >= ante,
  );

  if (availableDenoms.length === 0) {
    // Anteが大きすぎる場合は、Ante額面のチップを表示
    return [
      {
        spec: { label: String(ante), tone: "blue" },
        stackCount: MIN_STACK_COUNT,
      },
    ];
  }

  const used: Array<{ value: number; count: number; spec: ChipSpec }> = [];
  let remaining = pot;

  // 大きい額面から順に使用して、主要な額面を特定
  for (const denom of availableDenoms) {
    if (remaining >= denom.value) {
      const count = Math.floor(remaining / denom.value);
      // 使用した額面を記録（最大3種類まで）
      if (used.length < MAX_CHIP_TYPES && count > 0) {
        used.push({
          value: denom.value,
          count,
          spec: { label: denom.label, tone: denom.tone },
        });
        remaining -= count * denom.value;
      }
    }
    if (remaining === 0) break;
  }

  // 残りがある場合、最小の額面で補完（ただし最大3種類まで）
  if (remaining > 0 && used.length < MAX_CHIP_TYPES) {
    for (const denom of availableDenoms.slice().reverse()) {
      if (
        remaining >= denom.value &&
        !used.some((u) => u.value === denom.value)
      ) {
        const count = Math.floor(remaining / denom.value);
        used.push({
          value: denom.value,
          count,
          spec: { label: denom.label, tone: denom.tone },
        });
        remaining -= count * denom.value;
        break;
      }
    }
  }

  // 各チップ種類ごとに2〜3枚重ねて表示
  // 多い額面から順に表示
  return used
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_CHIP_TYPES)
    .map((item) => ({
      spec: item.spec,
      // 枚数に応じて2〜3枚のスタックを表示（多いほど多く表示）
      stackCount:
        item.count >= HIGH_STACK_THRESHOLD
          ? MAX_STACK_COUNT
          : item.count >= MEDIUM_STACK_THRESHOLD
            ? MIN_STACK_COUNT
            : MIN_STACK_COUNT,
    }));
};
