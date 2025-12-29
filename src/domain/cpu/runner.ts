import { applyEvent } from "../engine/applyEvent";
import { getAllowedActions } from "../rules/allowedActions";
import type { DealState, Event } from "../types";
import { createEventFromAction } from "./eventFactory";
import { type ActionType, cpuLv1 } from "./policy";

/**
 * CPUターンを実行する（1アクション分）
 * @returns 適用されたイベント、またはnull（終了条件）
 */
export const runCpuTurn = (
  state: DealState,
  seat: number,
): { nextState: DealState; event: Event } | null => {
  // 終了チェック
  if (state.dealFinished) return null;

  // アクティブチェック
  const player = state.players[seat];
  if (!player || !player.active) return null;

  // 現在のアクターかチェック
  if (state.currentActorIndex !== seat) return null;

  // 許可されたアクションを取得
  const allowedActions = getAllowedActions(state);

  // CPUが選択可能なアクションのみに絞る（STREET_ADVANCE/DEAL_ENDは除外）
  const cpuAllowedActions = allowedActions.filter(
    (a): a is ActionType =>
      a !== "STREET_ADVANCE" && a !== "DEAL_END" && a !== "POST_ANTE",
  );

  if (cpuAllowedActions.length === 0) {
    // CPUがアクションできない場合はnullを返す（エンジン側で処理）
    return null;
  }

  // CPU戦略でアクションを決定
  const action = cpuLv1.decide({
    state,
    seat,
    allowedActions: cpuAllowedActions,
  });

  // イベントを生成
  const event = createEventFromAction(action, state, seat);
  if (!event) return null;

  // イベントを適用
  const nextState = applyEvent(state, event);

  return { nextState, event };
};
