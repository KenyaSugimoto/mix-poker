import type React from "react";
import type { PlayerState } from "../../../domain/types";
import { ActiveIndicator } from "./ActiveIndicator";

interface SeatPanelProps {
  player: PlayerState;
  playerName: string;
  isCurrentActor: boolean;
  seatIndex: number;
  totalSeats: number;
  players: PlayerState[]; // Heroの位置を計算するために必要
}

export const SeatPanel: React.FC<SeatPanelProps> = ({
  player,
  playerName,
  isCurrentActor,
  seatIndex,
  totalSeats,
  players,
}) => {
  // Hero（Human）は常に下部中央（6時の位置）に配置
  // 他のプレイヤーは時計回りに配置
  const isHero = player.kind === "human";

  // HeroのseatIndexを基準に角度を計算
  const heroSeatIndex = players.findIndex((p) => p.kind === "human");
  let angle: number;

  if (isHero) {
    angle = 90; // 6時の位置（90度 = 下方向）
  } else {
    // Heroを基準に相対的な位置を計算
    const relativeIndex = seatIndex - heroSeatIndex;
    // 時計回りに配置（Heroが6時なので、右回りに配置）
    // 90度から開始して時計回りに配置
    angle = 90 + (relativeIndex * 360) / totalSeats;
  }

  const radius = 280; // テーブルの半径（px）- 大きくして見切れを防ぐ
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    >
      <div
        className={`relative bg-card rounded-xl p-4 shadow-sm border min-w-[160px] transition-all ${
          isCurrentActor ? "ring-2 ring-primary ring-offset-2" : ""
        } ${!player.active ? "opacity-50" : ""}`}
      >
        <ActiveIndicator isActive={isCurrentActor} />
        <div className="space-y-2">
          <div className="font-semibold text-sm">{playerName}</div>
          <div className="text-xs text-muted-foreground">
            {player.kind === "human" ? "You" : "CPU"}
          </div>
          {!player.active && (
            <div className="text-xs text-destructive font-semibold">FOLDED</div>
          )}
          <div className="pt-2 border-t space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Stack:</span>
              <span className="font-semibold">{player.stack}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Committed:</span>
              <span className="font-semibold">
                {player.committedThisStreet}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
