import type { DealState, EventType, SeatIndex } from "../types";

/**
 * CPUが選択可能なアクションタイプ（STREET_ADVANCE/DEAL_ENDは含まない）
 */
export type ActionType =
  | "POST_ANTE"
  | "BRING_IN"
  | "COMPLETE"
  | "BET"
  | "RAISE"
  | "CALL"
  | "CHECK"
  | "FOLD";

export interface CpuDecisionContext {
  state: DealState;
  seat: SeatIndex;
  allowedActions: EventType[];
}

export interface CpuStrategy {
  decide(ctx: CpuDecisionContext): ActionType;
}

/**
 * Lv0 CPU戦略（MVP）
 * 優先度: CHECK > CALL > BRING_IN > COMPLETE > BET > RAISE > FOLD
 */
export const cpuLv0: CpuStrategy = {
  decide({ allowedActions }) {
    // 優先度順にチェック
    if (allowedActions.includes("CHECK")) return "CHECK";
    if (allowedActions.includes("CALL")) return "CALL";
    if (allowedActions.includes("BRING_IN")) return "BRING_IN";
    if (allowedActions.includes("COMPLETE")) return "COMPLETE";
    if (allowedActions.includes("BET")) return "BET";
    if (allowedActions.includes("RAISE")) return "RAISE";
    if (allowedActions.includes("FOLD")) return "FOLD";

    // フォールバック（通常は到達しない）
    return "FOLD";
  },
};
