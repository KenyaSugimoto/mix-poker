import React from "react";
import {
  evaluateRazz,
  evaluateStud8,
  evaluateStudHi,
} from "../../../domain/showdown/resolveShowdown";
import type { DealState, DealSummary, GameState } from "../../../domain/types";
import { UI_STRINGS } from "../../constants/uiStrings";
import { getHandRankLabel, getLowHandLabel } from "../../utils/handRankLabel";
import { getGameTypeLabel } from "../../utils/labelHelper";
import { DealInfo } from "../play/DealInfo";
import { ActionHistoryPanel } from "./ActionHistoryPanel";
import { BetChips } from "./BetChips";
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
  // 役の計算（ショーダウン時のみ：dealFinished かつ アクティブプレイヤーが2人以上）
  const handRankLabels: Record<number, string | null> = {};
  const lowRankLabels: Record<number, string | null> = {};

  // ショーダウン判定：アクティブプレイヤーが2人以上残っている場合のみ役を計算
  const activePlayerCount = deal.players.filter((p) => p.active).length;
  const isShowdown = deal.dealFinished && activePlayerCount >= 2;

  if (isShowdown) {
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
              : UI_STRINGS.COMMON.NO_LOW;
          } else {
            // StudHiはHighのみ
            const result = evaluateStudHi(cards);
            handRankLabels[seatIdx] = getHandRankLabel(result.rank);
          }
        }
      }
    }
  }

  // 勝者情報をseatIndexベースに変換（High/Low別々に管理）
  const winnersHighSeats = new Set<number>();
  const winnersLowSeats = new Set<number>();
  if (dealSummary) {
    // PlayerIdからseatIndexに変換
    dealSummary.winnersHigh.forEach((playerId) => {
      const seatIndex = deal.seatOrder.indexOf(playerId);
      if (seatIndex >= 0) {
        winnersHighSeats.add(seatIndex);
      }
    });
    dealSummary.winnersLow?.forEach((playerId) => {
      const seatIndex = deal.seatOrder.indexOf(playerId);
      if (seatIndex >= 0) {
        winnersLowSeats.add(seatIndex);
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
      className={`relative w-full h-full ${getTableSize(deal.playerCount)} bg-poker-base rounded-2xl shadow-xl border-4 border-poker-green overflow-hidden p-8`}
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
        dealId={deal.dealId}
      />
      {/* テーブル中央のポット表示（ショーダウン時は非表示） */}
      {!deal.dealFinished && (
        <div className="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          {/* Pot総額（上） */}
          <div className="mb-1">
            <div className="text-xs font-bold tabular-nums text-white drop-shadow-md">
              Pot: {deal.pot}
            </div>
          </div>

          {/* 中央のチップの集合（前のストリートまでに確定したポット額） */}
          {(() => {
            // このストリートのベット総額を計算
            const currentStreetBets = deal.players.reduce(
              (sum, p) => sum + p.committedThisStreet,
              0,
            );
            // 前のストリートまでに確定したポット額
            const confirmedPot = deal.pot - currentStreetBets;

            return (
              <>
                <PotStackBadge pot={confirmedPot} ante={deal.ante} />
                {/* 中央のチップ総額（下、ラベルなし） */}
                <div className="mt-1">
                  <div className="text-sm font-bold tabular-nums text-white drop-shadow-md">
                    {confirmedPot}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ゲーム種目表示カード */}
      <div className="absolute top-[56%] left-[44%] -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="bg-poker-green/90 backdrop-blur-sm rounded-sm px-3 py-1 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/20">
          <span className="text-[10px] text-white tracking-tight">
            <span className="font-black">
              {getGameTypeLabel(deal.gameType)}
            </span>
            <span className="font-bold ml-0.5">
              (#{(dealIndex % game.rotation.dealPerGame) + 1}/
              {game.rotation.dealPerGame})
            </span>
          </span>
        </div>
      </div>
      {/* 各プレイヤーのSeatPanel */}
      {deal.players.map((player, index) => {
        // DealStateのplayersはseat順に並んでいるが、GameStateのplayersはID順
        // ここでは簡易的にindexで対応（本来はIDでマッチングすべき）
        const gamePlayer = game.players[index];
        const playerName =
          gamePlayer?.name ?? UI_STRINGS.COMMON.PLAYER_DEFAULT(index + 1);
        const isCurrentActor = deal.currentActorIndex === index;
        const isWinnerHigh = winnersHighSeats.has(index);
        const isWinnerLow = winnersLowSeats.has(index);

        // 獲得額を取得（potShareから）
        const playerId = deal.seatOrder[index];
        const winningsAmount = dealSummary?.potShare[playerId] ?? null;

        // プレイヤーの角度を計算（BetChipsで使用）
        const isHero = player.kind === "human";
        const heroSeatIndex = deal.players.findIndex((p) => p.kind === "human");
        let angle: number;
        if (isHero) {
          angle = 90; // 6時の位置（90度 = 下方向）
        } else {
          // Heroを基準に相対的な位置を計算
          const relativeIndex = index - heroSeatIndex;
          angle = 90 + (relativeIndex * 360) / deal.playerCount;
        }

        return (
          <React.Fragment key={player.seat}>
            <SeatPanel
              player={player}
              playerName={playerName}
              isCurrentActor={isCurrentActor}
              seatIndex={index}
              totalSeats={deal.playerCount}
              players={deal.players}
              deal={deal}
              isDealFinished={deal.dealFinished}
              isWinnerHigh={isWinnerHigh}
              isWinnerLow={isWinnerLow}
              handRankLabel={handRankLabels[player.seat] ?? null}
              lowRankLabel={lowRankLabels[player.seat] ?? null}
            />
            {/* ベットチップ表示（committedThisStreet > 0の場合のみ、ショーダウン時は非表示） */}
            {!deal.dealFinished && player.committedThisStreet > 0 && (
              <BetChips
                amount={player.committedThisStreet}
                ante={deal.ante}
                seatAngle={angle}
              />
            )}
            {/* ショーダウン時：獲得したチップの集合を表示 */}
            {deal.dealFinished && winningsAmount && winningsAmount > 0 && (
              <BetChips
                amount={winningsAmount}
                ante={deal.ante}
                seatAngle={angle}
                handRankLabel={handRankLabels[player.seat] ?? null}
                lowRankLabel={lowRankLabels[player.seat] ?? null}
                isWinnerHigh={isWinnerHigh}
                isWinnerLow={isWinnerLow}
                gameType={deal.gameType}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
