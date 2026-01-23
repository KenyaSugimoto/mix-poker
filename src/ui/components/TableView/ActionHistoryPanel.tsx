import { useEffect, useRef } from "react";
import type {
  Event,
  GamePlayer,
  PlayerId,
  Street,
} from "../../../domain/types";
import { UI_STRINGS } from "../../constants/uiStrings";
import { getActionLabel, PLAYER_ACTION_TYPES } from "../../utils/actionLabel";
import { FavoriteIconButton } from "../play/FavoriteIconButton";

interface ActionHistoryPanelProps {
  eventLog: Event[];
  seatOrder: PlayerId[];
  players: GamePlayer[];
  dealIndex: number;
  dealId?: string;
  isDealFinished: boolean;
}

// ストリートの日本語ラベル
const STREET_LABELS: Record<Street, string> = UI_STRINGS.STREETS;

/**
 * プレイヤーのアクション履歴を表示するパネル
 * TableViewの左上に配置される
 */
export const ActionHistoryPanel: React.FC<ActionHistoryPanelProps> = ({
  eventLog,
  seatOrder,
  players,
  dealIndex,
  dealId,
  isDealFinished,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // プレイヤーアクションのみをフィルタリング（eventLogがない場合は空配列）
  const playerActions = (eventLog ?? []).filter((event) =>
    PLAYER_ACTION_TYPES.includes(
      event.type as (typeof PLAYER_ACTION_TYPES)[number],
    ),
  );

  // ストリートごとにグルーピング
  const actionsByStreet = playerActions.reduce(
    (acc, event) => {
      const street = event.street ?? "3rd";
      if (!acc[street]) {
        acc[street] = [];
      }
      acc[street].push(event);
      return acc;
    },
    {} as Record<Street, Event[]>,
  );

  // ストリートの順序
  const streetOrder: Street[] = ["3rd", "4th", "5th", "6th", "7th"];
  const activeStreets = streetOrder.filter(
    (s) => actionsByStreet[s]?.length > 0,
  );

  // 新しいアクションがあったら自動スクロール
  // biome-ignore lint/correctness/useExhaustiveDependencies: playerActions.lengthはeventLogから派生するため、eventLog?.lengthで十分
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [eventLog?.length]);

  // seatIndexからプレイヤー名を取得
  const getPlayerName = (seatIndex: number): string => {
    const playerId = seatOrder[seatIndex];
    if (!playerId) return UI_STRINGS.COMMON.SEAT_DEFAULT(seatIndex + 1);
    const player = players.find((p) => p.id === playerId);
    return player?.name ?? UI_STRINGS.COMMON.PLAYER_DEFAULT(seatIndex + 1);
  };

  // イベントから表示用の金額を取得
  // RAISEの場合は最終ベット額（到達したcurrentBet）を計算して返す
  const getDisplayAmount = (
    event: Event,
    allEvents: Event[],
    eventIndex: number,
  ): number | null => {
    if (!("amount" in event)) {
      return null;
    }

    // RAISEの場合、それ以前のイベントからcurrentBetを計算して最終ベット額を返す
    if (event.type === "RAISE") {
      let currentBet = 0;
      // このイベントまでのcurrentBetを計算
      for (let i = 0; i <= eventIndex; i++) {
        const e = allEvents[i];
        if (
          e.type === "BRING_IN" ||
          e.type === "COMPLETE" ||
          e.type === "BET"
        ) {
          currentBet = "amount" in e ? e.amount : 0;
        } else if (e.type === "RAISE") {
          currentBet += "amount" in e ? e.amount : 0;
        } else if (e.type === "STREET_ADVANCE") {
          currentBet = 0; // ストリート進行でリセット
        }
      }
      return currentBet;
    }

    return event.amount;
  };

  if (playerActions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-20 w-56 max-h-52 rounded-lg border border-poker-gold/30 bg-poker-green/90 backdrop-blur-sm shadow-xl">
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-xs font-bold text-poker-gold">
          {UI_STRINGS.PLAY.ACTION_HISTORY_TITLE(dealIndex + 1)}
        </h3>
        {dealId && isDealFinished && (
          <FavoriteIconButton dealId={dealId} size="sm" />
        )}
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto max-h-40 p-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {activeStreets.map((street, streetIndex) => (
          <div key={street} className={streetIndex > 0 ? "mt-2" : ""}>
            {/* ストリートヘッダー */}
            <div className="text-[10px] font-semibold text-white/70 mb-1 pb-0.5 border-b border-white/10">
              {STREET_LABELS[street]}
            </div>
            {/* そのストリートのアクション */}
            <div className="space-y-0.5">
              {actionsByStreet[street].map((event, index) => {
                const seatIndex = event.seat;
                if (seatIndex === null) return null;

                const playerName = getPlayerName(seatIndex);
                const actionLabel = getActionLabel(event.type);
                // 全イベント内でのインデックスを計算
                const globalIndex = playerActions.indexOf(event);
                const amount = getDisplayAmount(
                  event,
                  playerActions,
                  globalIndex,
                );

                return (
                  <div
                    key={event.id || `${street}-${index}`}
                    className="text-xs text-white/90 grid grid-cols-[70px_auto] gap-1 items-center"
                  >
                    <span className="font-medium text-poker-gold truncate text-right pr-1">
                      {playerName}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-white/90">{actionLabel}</span>
                      {amount !== null && (
                        <span className="text-poker-gold font-medium">
                          {amount}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
