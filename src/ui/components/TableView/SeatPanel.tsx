import type React from "react";
import { useEffect, useState } from "react";
import type { DealState, PlayerState } from "../../../domain/types";
import { getActionLabel, getLastAction } from "../../utils/actionLabel";
import { ActiveIndicator } from "./ActiveIndicator";
import { PlayerCards } from "./PlayerCards";

interface SeatPanelProps {
  player: PlayerState;
  playerName: string;
  isCurrentActor: boolean;
  seatIndex: number;
  totalSeats: number;
  players: PlayerState[]; // Heroの位置を計算するために必要
  deal: DealState; // カード情報を取得するために必要
  isDealFinished: boolean; // ディールが終了しているかどうか
  isWinner?: boolean; // 勝者かどうか
  winningsAmount?: number | null; // 獲得額（正の値のみ）
  handRankLabel?: string | null; // High役の日本語ラベル
  lowRankLabel?: string | null; // Low役のラベル
}

/**
 * アクションが消えても一定時間表示を維持するフック
 */
const useStickyAction = (
  action: string | null,
  delay = 2000,
): string | null => {
  const [stickyAction, setStickyAction] = useState<string | null>(action);

  useEffect(() => {
    // 新しいアクションが来たら即更新
    if (action) {
      setStickyAction(action);
    } else {
      // アクションが消えた場合（ストリート変更など）、遅延させて消す
      const timer = setTimeout(() => {
        setStickyAction(null);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [action, delay]);

  return stickyAction;
};

export const SeatPanel: React.FC<SeatPanelProps> = ({
  player,
  playerName,
  isCurrentActor,
  seatIndex,
  totalSeats,
  players,
  deal,
  isDealFinished,
  isWinner = false,
  winningsAmount = null,
  handRankLabel = null,
  lowRankLabel = null,
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

  const radius = 245; // 半径(px)
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;

  // そのストリートにおける直近アクションを取得
  const lastAction = getLastAction(deal.actionsThisStreet, seatIndex);
  // アクション表示を維持する
  const displayedAction = useStickyAction(lastAction);

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    >
      <div className="mb-2">
        <PlayerCards
          hand={deal.hands[player.seat] ?? { downCards: [], upCards: [] }}
          playerKind={player.kind}
          isActive={player.active}
          isDealFinished={isDealFinished}
        />
      </div>
      <div
        className={`relative bg-card rounded-xl p-4 shadow-sm border min-w-[160px] transition-all ${
          isCurrentActor ? "ring-2 ring-primary ring-offset-2" : ""
        } ${isWinner ? "ring-2 ring-yellow-400 ring-offset-2 bg-yellow-50/10" : ""} ${
          !player.active ? "opacity-50" : ""
        }`}
      >
        {!isDealFinished && <ActiveIndicator isActive={isCurrentActor} />}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">
              {playerName}{" "}
              <span className="text-xs text-muted-foreground font-normal">
                ({player.kind === "human" ? "You" : "CPU"})
              </span>
            </div>
            {isWinner && (
              <div className="text-xs font-bold text-yellow-400">WINNER</div>
            )}
          </div>
          {isDealFinished && player.active && handRankLabel && (
            <div className="text-xs font-semibold text-blue-400">
              High: {handRankLabel}
            </div>
          )}
          {isDealFinished && player.active && lowRankLabel && (
            <div
              className={`text-xs font-semibold ${
                lowRankLabel === "ローなし" ? "text-gray-400" : "text-green-400"
              }`}
            >
              Low: {lowRankLabel}
            </div>
          )}
          {!player.active && (
            <div className="text-xs text-destructive font-semibold">FOLDED</div>
          )}
          {winningsAmount !== null &&
            winningsAmount !== undefined &&
            winningsAmount > 0 && (
              <div className="text-sm font-bold text-green-500">
                +{winningsAmount}
              </div>
            )}
          <div className="pt-2 border-t space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">{player.stack}</span>
              {displayedAction && (
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-primary">
                    {getActionLabel(displayedAction)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
