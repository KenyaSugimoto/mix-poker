import type React from "react";
import {
  evaluateRazz,
  evaluateStud8,
  evaluateStudHi,
} from "../../../domain/showdown/resolveShowdown";
import type { DealState, DealSummary, GameState } from "../../../domain/types";
import { getHandRankLabel, getLowHandLabel } from "../../utils/handRankLabel";
import { getGameTypeLabel } from "../../utils/labelHelper";
import { DealInfo } from "../play/DealInfo";
import { ActionHistoryPanel } from "./ActionHistoryPanel";
import { PotStackBadge } from "./PotStackBadge";
import { SeatPanel } from "./SeatPanel";

interface TableViewProps {
  deal: DealState;
  game: GameState;
  dealSummary: DealSummary | null; // 終了したディールの場合の結果情報
  dealIndex: number; // ディール番号（DealInfo表示用）
}

export const TableView: React.FC<TableViewProps> = ({
  deal,
  game,
  dealSummary,
  dealIndex,
}) => {
  // 役の計算（dealFinished時のみ）
  const handRankLabels: Record<number, string | null> = {};
  const lowRankLabels: Record<number, string | null> = {};

  if (deal.dealFinished) {
    for (const seat of Object.keys(deal.hands)) {
      const seatIdx = Number(seat);
      const player = deal.players.find((p) => p.seat === seatIdx);
      if (player?.active) {
        const hand = deal.hands[seatIdx];
        const cards = [...hand.downCards, ...hand.upCards];
        if (cards.length >= 5) {
          if (deal.gameType === "razz") {
            // RazzはLowのみ
            const lowResult = evaluateRazz(cards);
            lowRankLabels[seatIdx] = getLowHandLabel(lowResult);
          } else if (deal.gameType === "stud8") {
            // Stud8はHigh/Low両方
            const result = evaluateStud8(cards);
            handRankLabels[seatIdx] = getHandRankLabel(result.high.rank);
            lowRankLabels[seatIdx] = result.low
              ? getLowHandLabel(result.low)
              : "ローなし";
          } else {
            // StudHiはHighのみ
            const result = evaluateStudHi(cards);
            handRankLabels[seatIdx] = getHandRankLabel(result.rank);
          }
        }
      }
    }
  }

  // 勝者情報をseatIndexベースに変換
  const winnerSeats = new Set<number>();
  if (dealSummary) {
    // PlayerIdからseatIndexに変換
    dealSummary.winnersHigh.forEach((playerId) => {
      const seatIndex = deal.seatOrder.indexOf(playerId);
      if (seatIndex >= 0) {
        winnerSeats.add(seatIndex);
      }
    });
    dealSummary.winnersLow?.forEach((playerId) => {
      const seatIndex = deal.seatOrder.indexOf(playerId);
      if (seatIndex >= 0) {
        winnerSeats.add(seatIndex);
      }
    });
  }

  // プレイヤー数に応じてテーブルサイズを調整
  const getTableSize = (playerCount: number) => {
    if (playerCount <= 3) return "max-w-[1200px] max-h-[800px] min-h-[600px]";
    if (playerCount <= 5) return "max-w-[1400px] max-h-[900px] min-h-[700px]";
    return "max-w-[1600px] max-h-[1000px] min-h-[800px]"; // 6-7人
  };

  return (
    <div
      className={`relative w-full h-full ${getTableSize(deal.playerCount)} bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-xl border-4 border-green-700 overflow-hidden p-8`}
    >
      {/* DealInfo（左上） */}
      <div className="absolute top-4 left-4 z-20">
        <DealInfo deal={deal} dealIndex={dealIndex} />
      </div>
      {/* アクション履歴パネル（右上） */}
      <ActionHistoryPanel
        eventLog={deal.eventLog}
        seatOrder={deal.seatOrder}
        players={game.players}
        dealIndex={dealIndex}
      />
      {/* テーブル中央のポット表示 */}
      <div className="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <PotStackBadge pot={deal.pot} ante={deal.ante} />
        {/* ポット額（コンパクト） */}
        <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 shadow-md backdrop-blur-sm">
          <div className="text-sm font-bold tabular-nums text-white">
            {deal.pot}
          </div>
        </div>
      </div>

      {/* ゲーム種目表示カード */}
      <div className="absolute top-[56%] left-[44%] -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="bg-amber-400/95 backdrop-blur-sm rounded-sm px-2 py-0.5 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-amber-600/60">
          <span className="text-[10px] font-black text-amber-950 tracking-tight">
            {getGameTypeLabel(deal.gameType)} (#
            {(dealIndex % game.rotation.dealPerGame) + 1}/
            {game.rotation.dealPerGame})
          </span>
        </div>
      </div>
      {/* 各プレイヤーのSeatPanel */}
      {deal.players.map((player, index) => {
        // DealStateのplayersはseat順に並んでいるが、GameStateのplayersはID順
        // ここでは簡易的にindexで対応（本来はIDでマッチングすべき）
        const gamePlayer = game.players[index];
        const playerName = gamePlayer?.name ?? `Player ${index + 1}`;
        const isCurrentActor = deal.currentActorIndex === index;
        const isWinner = winnerSeats.has(index);

        // 獲得額を取得（potShareから）
        const playerId = deal.seatOrder[index];
        const winningsAmount = dealSummary?.potShare[playerId] ?? null;

        return (
          <SeatPanel
            key={player.seat}
            player={player}
            playerName={playerName}
            isCurrentActor={isCurrentActor}
            seatIndex={index}
            totalSeats={deal.playerCount}
            players={deal.players}
            deal={deal}
            isDealFinished={deal.dealFinished}
            isWinner={isWinner}
            winningsAmount={winningsAmount}
            handRankLabel={handRankLabels[player.seat] ?? null}
            lowRankLabel={lowRankLabels[player.seat] ?? null}
          />
        );
      })}
    </div>
  );
};
