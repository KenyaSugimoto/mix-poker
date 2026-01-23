import type React from "react";
import { useAppStore } from "../../app/store/appStore";
import type { GameState } from "../../domain/types";
import { ActionPanel } from "../components/play/ActionPanel";
import { HamburgerMenu } from "../components/play/HamburgerMenu";
import { GameTypeChangeOverlay } from "../components/TableView/GameTypeChangeOverlay";
import { TableView } from "../components/TableView/TableView";
import { UI_STRINGS } from "../constants/uiStrings";

const StartDealButton: React.FC<{ game: GameState }> = ({ game }) => {
  const startDeal = useAppStore((state) => state.startDeal);
  return (
    <button
      type="button"
      onClick={() => {
        startDeal({
          rngSeed: Math.random().toString(),
          seatOrder: game.players.map((p) => p.id),
        });
      }}
      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 text-sm whitespace-nowrap"
    >
      {UI_STRINGS.PLAY.START_NEW_DEAL}
    </button>
  );
};

export const PlayPage: React.FC = () => {
  const game = useAppStore((state) => state.game);
  const fullStore = useAppStore((state) => state.fullStore);
  const setScreen = useAppStore((state) => state.setScreen);
  const resetGame = useAppStore((state) => state.resetGame);

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-card rounded-xl p-8 text-center shadow-sm border">
          <p className="text-muted-foreground mb-4">
            {UI_STRINGS.PLAY.NO_GAME}
          </p>
          <button
            type="button"
            onClick={() => setScreen("SETUP")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
          >
            {UI_STRINGS.PLAY.GO_TO_SETUP}
          </button>
        </div>
      </div>
    );
  }

  // currentDealがない場合、最新の終了したディールを取得
  const displayDeal =
    game.currentDeal ||
    (() => {
      if (game.dealHistory.length === 0) return null;
      const lastDealId = game.dealHistory[0].dealId;
      return fullStore.fullDealsById[lastDealId] || null;
    })();

  // ディールが全く存在しない場合（初回起動時など）
  if (!displayDeal) {
    return (
      <div className="h-full w-full flex flex-col p-6 space-y-6 overflow-hidden">
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="bg-card rounded-xl p-8 text-center shadow-sm border">
            <p className="text-muted-foreground mb-4">
              {UI_STRINGS.PLAY.NO_DEAL}
            </p>
            <StartDealButton game={game} />
          </div>
        </div>
      </div>
    );
  }

  const isDealFinished = !game.currentDeal;
  // 終了したディールの場合、対応するDealSummaryを取得
  const dealSummary =
    isDealFinished && game.dealHistory.length > 0
      ? game.dealHistory.find((s) => s.dealId === displayDeal.dealId) || null
      : null;

  // 前回のゲーム種目を取得（dealHistoryの最初のエントリ = 直前のディール）
  const previousGameType =
    game.dealHistory.length > 0 ? game.dealHistory[0].gameType : null;

  return (
    <div className="h-full w-full flex flex-col p-4 overflow-hidden">
      {/* ゲーム種目変更通知オーバーレイ */}
      {game.currentDeal && (
        <GameTypeChangeOverlay
          currentGameType={game.currentDeal.gameType}
          previousGameType={previousGameType}
          isDealActive={!isDealFinished}
        />
      )}

      {/* ハンバーガーメニュー */}
      <div className="flex-shrink-0 flex justify-end mb-2">
        <HamburgerMenu
          onHistoryClick={() => setScreen("HISTORY")}
          onSettingsClick={() => setScreen("SETTINGS")}
          onExitGameClick={resetGame}
        />
      </div>
      {/* 2行レイアウト: 1行目TableView、2行目ActionPanel */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        {/* 1行目: TableView */}
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          <TableView
            deal={displayDeal}
            game={game}
            dealSummary={dealSummary}
            dealIndex={isDealFinished ? game.dealIndex - 1 : game.dealIndex}
          />
        </div>
        {/* 2行目: ActionPanel/StartDealButton */}
        <div className="flex-shrink-0 flex gap-3">
          <div className="flex-shrink-0">
            {isDealFinished ? (
              // TODO: 将来的にはボタンで手動実行ではなく、数秒後に自動的に新しいディールが開始されるようにする
              <StartDealButton game={game} />
            ) : (
              <ActionPanel
                deal={displayDeal}
                currentSeat={displayDeal.currentActorIndex}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
