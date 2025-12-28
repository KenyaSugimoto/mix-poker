import { useEffect, useRef } from "react";
import type {
  Event,
  GamePlayer,
  PlayerId,
  Street,
} from "../../../domain/types";
import { getActionLabel, PLAYER_ACTION_TYPES } from "../../utils/actionLabel";

interface ActionHistoryPanelProps {
  eventLog: Event[];
  seatOrder: PlayerId[];
  players: GamePlayer[];
  dealIndex: number;
}

// ストリートの日本語ラベル
const STREET_LABELS: Record<Street, string> = {
  "3rd": "3rd",
  "4th": "4th",
  "5th": "5th",
  "6th": "6th",
  "7th": "7th",
};

/**
 * プレイヤーのアクション履歴を表示するパネル
 * TableViewの左上に配置される
 */
export const ActionHistoryPanel: React.FC<ActionHistoryPanelProps> = ({
  eventLog,
  seatOrder,
  players,
  dealIndex,
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
    if (!playerId) return `Seat ${seatIndex + 1}`;
    const player = players.find((p) => p.id === playerId);
    return player?.name ?? `Player ${seatIndex + 1}`;
  };

  // アクションから金額を取得（存在する場合）
  const getAmount = (event: Event): number | null => {
    if ("amount" in event) {
      return event.amount;
    }
    return null;
  };

  if (playerActions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-20 w-56 max-h-52 rounded-lg border border-white/20 bg-black/60 backdrop-blur-sm shadow-lg">
      <div className="px-3 py-2 border-b border-white/10">
        <h3 className="text-xs font-semibold text-white/80">
          アクション履歴 (#{dealIndex + 1})
        </h3>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto max-h-40 p-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {activeStreets.map((street, streetIndex) => (
          <div key={street} className={streetIndex > 0 ? "mt-2" : ""}>
            {/* ストリートヘッダー */}
            <div className="text-[10px] font-semibold text-blue-400/80 mb-1 pb-0.5 border-b border-white/10">
              {STREET_LABELS[street]}
            </div>
            {/* そのストリートのアクション */}
            <div className="space-y-0.5">
              {actionsByStreet[street].map((event, index) => {
                const seatIndex = event.seat;
                if (seatIndex === null) return null;

                const playerName = getPlayerName(seatIndex);
                const actionLabel = getActionLabel(event.type);
                const amount = getAmount(event);

                return (
                  <div
                    key={event.id || `${street}-${index}`}
                    className="text-xs text-white/90 grid grid-cols-[70px_auto] gap-1 items-center"
                  >
                    <span className="font-medium text-amber-400 truncate text-right pr-1">
                      {playerName}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-white/90">{actionLabel}</span>
                      {amount !== null && (
                        <span className="text-emerald-400 font-medium">
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
