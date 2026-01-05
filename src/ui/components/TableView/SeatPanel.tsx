import { Cpu, User } from "lucide-react";
import type React from "react";
import type { DealState, PlayerState } from "../../../domain/types";
import { getActionLabel, getLastAction } from "../../utils/actionLabel";
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
  isWinnerHigh?: boolean; // High役でポットを取得したかどうか
  isWinnerLow?: boolean; // Low役でポットを取得したかどうか
  handRankLabel?: string | null; // High役の日本語ラベル
  lowRankLabel?: string | null; // Low役のラベル
}

export const SeatPanel: React.FC<SeatPanelProps> = ({
  player,
  playerName,
  isCurrentActor,
  seatIndex,
  totalSeats,
  players,
  deal,
  isDealFinished,
  isWinnerHigh = false,
  isWinnerLow = false,
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

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    >
      <div>
        <PlayerCards
          hand={deal.hands[player.seat] ?? { downCards: [], upCards: [] }}
          playerKind={player.kind}
          isActive={player.active}
          isDealFinished={isDealFinished}
        />
      </div>
      <div
        className={`relative bg-card rounded-xl p-3 shadow-sm border min-w-[160px] transition-all -mt-7 z-10 ${
          isWinnerHigh || isWinnerLow ? "border-2 border-poker-gold" : ""
        } ${!player.active ? "opacity-50" : ""}`}
      >
        {isCurrentActor && !isDealFinished && (
          <div className="absolute inset-0 rounded-xl ring-2 ring-poker-gold ring-offset-2 ring-offset-background animate-pulse pointer-events-none z-10" />
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-semibold text-sm">
              {playerName}
              {player.kind === "human" ? (
                <User className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Cpu className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            {/* 直近のアクション（プレイヤー名の右隣に表示） */}
            {lastAction && (
              <span className="text-[10px] font-semibold text-primary">
                {getActionLabel(lastAction)}
              </span>
            )}
          </div>
          {!player.active && (
            <div className="text-xs text-destructive font-semibold">FOLD</div>
          )}
          <div className="pt-1 border-t space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold">{player.stack}</span>
              {/* 役の情報（ショーダウン時のみ、スタックの右側に表示） */}
              {isDealFinished && player.active && (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                  {handRankLabel && (
                    <span
                      className={
                        isWinnerHigh ? "text-poker-gold" : "text-gray-400"
                      }
                    >
                      H: {handRankLabel}
                    </span>
                  )}
                  {lowRankLabel && (
                    <span
                      className={
                        lowRankLabel === "ローなし"
                          ? "text-gray-400"
                          : // Razzの場合はwinnersHighに勝者が入っているため、isWinnerHighを使用
                            deal.gameType === "razz"
                            ? isWinnerHigh
                              ? "text-poker-gold"
                              : "text-gray-400"
                            : isWinnerLow
                              ? "text-poker-gold"
                              : "text-gray-400"
                      }
                    >
                      L: {lowRankLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
