import type React from "react";
import { type ChipSpec, calculateChips } from "../../utils/chipCalculator";

// チップのサイズとレイアウト定数
const CHIP_SIZE = 26; // チップの直径（px）
const CHIP_PADDING = 3; // チップの内側の余白（px）
const CHIP_FONT_SIZE = 10; // チップのラベルフォントサイズ（px）
const CHIP_HIGHLIGHT_LEFT = 28; // ハイライトの左位置（%）
const CHIP_HIGHLIGHT_TOP = 22; // ハイライトの上位置（%）
const CHIP_HIGHLIGHT_SIZE = 18; // ハイライトのサイズ（%）

// スタックのレイアウト定数
const STACK_SPACING = 25; // スタック間の横方向の間隔（px）
const STACK_VERTICAL_OFFSET = -3; // スタック内のチップの縦方向の重なり（px）
const STACK_BASE_HEIGHT = 30; // スタックのベース高さ（px）
const STACK_HEIGHT_MULTIPLIER = 2.5; // スタックカウントから高さを計算する係数

// z-indexの定数
const Z_INDEX_BASE = 10; // z-indexのベース値
const Z_INDEX_INCREMENT = 10; // z-indexの増分

const CHIP_TONE: Record<
  ChipSpec["tone"],
  { ring: string; face: string; edge: string; text: string }
> = {
  teal: {
    ring: "from-cyan-300 to-cyan-600",
    face: "from-emerald-400 to-emerald-700",
    edge: "border-emerald-900/40",
    text: "text-white",
  },
  gold: {
    ring: "from-amber-200 to-amber-500",
    face: "from-yellow-300 to-yellow-600",
    edge: "border-amber-900/40",
    text: "text-zinc-900",
  },
  purple: {
    ring: "from-violet-200 to-violet-500",
    face: "from-fuchsia-400 to-fuchsia-700",
    edge: "border-fuchsia-950/35",
    text: "text-white",
  },
  red: {
    ring: "from-red-200 to-red-600",
    face: "from-red-400 to-red-800",
    edge: "border-red-950/35",
    text: "text-white",
  },
  blue: {
    ring: "from-sky-200 to-sky-600",
    face: "from-sky-400 to-sky-800",
    edge: "border-sky-950/35",
    text: "text-white",
  },
  green: {
    ring: "from-emerald-200 to-emerald-600",
    face: "from-emerald-400 to-emerald-800",
    edge: "border-emerald-950/35",
    text: "text-white",
  },
  black: {
    ring: "from-zinc-200 to-zinc-500",
    face: "from-zinc-600 to-zinc-950",
    edge: "border-black/40",
    text: "text-white",
  },
  brown: {
    ring: "from-amber-700 to-amber-900",
    face: "from-amber-800 to-amber-950",
    edge: "border-amber-950/40",
    text: "text-white",
  },
  orange: {
    ring: "from-orange-300 to-orange-600",
    face: "from-orange-400 to-orange-700",
    edge: "border-orange-900/40",
    text: "text-white",
  },
  white: {
    ring: "from-gray-100 to-gray-300",
    face: "from-white to-gray-200",
    edge: "border-gray-400/40",
    text: "text-gray-900",
  },
};

export const Chip: React.FC<{
  spec: ChipSpec;
  size?: number; // px
  className?: string;
  style?: React.CSSProperties;
}> = ({ spec, size = CHIP_SIZE, className, style }) => {
  const t = CHIP_TONE[spec.tone];

  return (
    <div
      className={[
        "relative select-none rounded-full border shadow-sm",
        t.edge,
        className ?? "",
      ].join(" ")}
      style={{ width: size, height: size, ...style }}
      aria-hidden
    >
      {/* outer ring */}
      <div
        className={[
          "absolute inset-0 rounded-full bg-gradient-to-br",
          t.ring,
        ].join(" ")}
      />

      {/* face */}
      <div
        className={[
          "absolute rounded-full bg-gradient-to-br",
          t.face,
          "shadow-[inset_0_2px_4px_rgba(255,255,255,0.18),inset_0_-10px_14px_rgba(0,0,0,0.25)]",
        ].join(" ")}
        style={{ inset: `${CHIP_PADDING}px` }}
      />

      {/* tiny highlight */}
      <div
        className="absolute rounded-full bg-white/25 blur-[0.5px]"
        style={{
          left: `${CHIP_HIGHLIGHT_LEFT}%`,
          top: `${CHIP_HIGHLIGHT_TOP}%`,
          width: `${CHIP_HIGHLIGHT_SIZE}%`,
          height: `${CHIP_HIGHLIGHT_SIZE}%`,
        }}
      />

      {/* label */}
      <div
        className={[
          "absolute inset-0 flex items-center justify-center",
          "font-extrabold leading-none",
          "drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]",
          t.text,
        ].join(" ")}
        style={{ fontSize: `${CHIP_FONT_SIZE}px` }}
      >
        {/* {spec.label} */}
      </div>
    </div>
  );
};

export const PotStackBadge: React.FC<{
  pot: number;
  ante: number;
  className?: string;
}> = ({ pot, ante, className }) => {
  const chipStacks = calculateChips(pot, ante);

  if (chipStacks.length === 0) {
    return null;
  }

  return (
    <div
      className={["inline-flex flex-col items-center", className ?? ""].join(
        " ",
      )}
    >
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
          const x = stackIndex * STACK_SPACING; // 各スタックの横位置
          const baseZ = Z_INDEX_BASE + stackIndex * Z_INDEX_INCREMENT;

          // 各スタック内のチップを重ねて表示
          return chipStack.stackCount > 0
            ? Array.from({ length: chipStack.stackCount }).map(
                (_, chipIndex) => {
                  const y = chipIndex * STACK_VERTICAL_OFFSET; // 縦方向の重なり
                  const z = baseZ + chipIndex;

                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: decorative list
                      key={`${stackIndex}-${chipIndex}`}
                      className="absolute"
                      style={{
                        left: x,
                        top: y,
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
    </div>
  );
};
