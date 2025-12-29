import { applyEvent } from "../engine/applyEvent";
import { getAllowedActions } from "../rules/allowedActions";
import type { DealState, Event } from "../types";
import { createEventFromAction } from "./eventFactory";
import { type ActionType, cpuLv0, cpuLv1 } from "./policy";

/** CPU戦略レベル */
export type CpuLevel = "lv0" | "lv1";

/**
 * CPUターンを実行する（1アクション分）
 * @param state 現在のDealState
 * @param seat CPUのシートインデックス
 * @param cpuLevel CPU戦略レベル（デフォルト: lv1）
 * @returns 適用されたイベント、またはnull（終了条件）
 */
export const runCpuTurn = (
  state: DealState,
  seat: number,
  cpuLevel: CpuLevel = "lv1",
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

  // CPU戦略を選択
  const strategy = cpuLevel === "lv0" ? cpuLv0 : cpuLv1;

  // CPU戦略でアクションを決定
  const action = strategy.decide({
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
