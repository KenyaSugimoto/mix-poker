import type React from "react";
import { calculateChips } from "../../utils/chipCalculator";
import { Chip } from "./PotStackBadge";

// チップのサイズとレイアウト定数（BetChipsはPotStackBadgeより小さく表示）
const CHIP_SIZE = 20; // チップの直径（px）
const STACK_SPACING = 20; // スタック間の横方向の間隔（px）
const STACK_VERTICAL_OFFSET = -2; // スタック内のチップの縦方向の重なり（px）
const STACK_BASE_HEIGHT = 24; // スタックのベース高さ（px）
const STACK_HEIGHT_MULTIPLIER = 2; // スタックカウントから高さを計算する係数

// z-indexの定数
const Z_INDEX_BASE = 5; // z-indexのベース値（SeatPanelより低く）
const Z_INDEX_INCREMENT = 5; // z-indexの増分

interface BetChipsProps {
  amount: number; // committedThisStreet
  ante: number; // 最小単位
  seatAngle: number; // プレイヤーの角度（0-360度）
  className?: string;
  handRankLabel?: string | null; // High役のラベル（ショーダウン時のみ）
  lowRankLabel?: string | null; // Low役のラベル（ショーダウン時のみ）
  isWinnerHigh?: boolean; // High役でポットを取得したかどうか
  isWinnerLow?: boolean; // Low役でポットを取得したかどうか
  gameType?: "studHi" | "razz" | "stud8"; // ゲームの種類
}

export const BetChips: React.FC<BetChipsProps> = ({
  amount,
  ante,
  seatAngle,
  className,
  handRankLabel = null,
  lowRankLabel = null,
  isWinnerHigh = false,
  isWinnerLow = false,
  gameType,
}) => {
  const chipStacks = calculateChips(amount, ante);

  if (chipStacks.length === 0 || amount === 0) {
    return null;
  }

  // チップの表示位置を計算（SeatPanelとテーブル中央の中間地点）
  // radius * 0.4 程度の位置に配置
  const radius = 245 * 0.4; // SeatPanelのradiusの40%
  const x = Math.cos((seatAngle * Math.PI) / 180) * radius;
  const y = Math.sin((seatAngle * Math.PI) / 180) * radius;

  return (
    <div
      className={[
        "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20",
        className ?? "",
      ].join(" ")}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    >
      {/* 役情報（ショーダウン時のみ） */}
      {(handRankLabel || lowRankLabel) && (
        <div className="relative z-20 mb-1 bg-black/80 backdrop-blur-sm rounded px-2 py-1 shadow-md space-y-0.5">
          {handRankLabel && (
            <div
              className={`text-[10px] font-semibold ${
                isWinnerHigh ? "text-poker-gold" : "text-gray-400"
              }`}
            >
              High: {handRankLabel}
            </div>
          )}
          {lowRankLabel && (
            <div
              className={`text-[10px] font-semibold ${
                lowRankLabel === "ローなし"
                  ? "text-gray-400"
                  : // Razzの場合はwinnersHighに勝者が入っているため、isWinnerHighを使用
                    gameType === "razz"
                    ? isWinnerHigh
                      ? "text-poker-gold"
                      : "text-gray-400"
                    : isWinnerLow
                      ? "text-poker-gold"
                      : "text-gray-400"
              }`}
            >
              Low: {lowRankLabel}
            </div>
          )}
        </div>
      )}

      {/* チップスタックの表示 */}
      <div
        className="relative mx-auto"
        style={{
          width:
            chipStacks.length > 0
              ? `${(chipStacks.length - 1) * STACK_SPACING + CHIP_SIZE}px`
              : "0px",
          height: `${
            STACK_BASE_HEIGHT +
            Math.max(...chipStacks.map((s) => s.stackCount - 1), 0) *
              STACK_HEIGHT_MULTIPLIER
          }px`,
        }}
      >
        {chipStacks.map((chipStack, stackIndex) => {
          const stackX = stackIndex * STACK_SPACING; // 各スタックの横位置
          const baseZ = Z_INDEX_BASE + stackIndex * Z_INDEX_INCREMENT;

          // 各スタック内のチップを重ねて表示
          return chipStack.stackCount > 0
            ? Array.from({ length: chipStack.stackCount }).map(
                (_, chipIndex) => {
                  const stackY = chipIndex * STACK_VERTICAL_OFFSET; // 縦方向の重なり
                  const z = baseZ + chipIndex;

                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: decorative list
                      key={`${stackIndex}-${chipIndex}`}
                      className="absolute"
                      style={{
                        left: stackX,
                        top: stackY,
                        zIndex: z,
                      }}
                    >
                      <Chip spec={chipStack.spec} size={CHIP_SIZE} />
                    </div>
                  );
                },
              )
            : null;
        })}
      </div>

      {/* 金額ラベル */}
      <div className="mt-1 bg-black/70 backdrop-blur-sm rounded px-2 py-0.5 shadow-sm">
        <span className="text-[10px] font-bold text-white tabular-nums">
          {amount}
        </span>
      </div>
    </div>
  );
};
