import type { DealState, EventType, SeatIndex } from "../types";
import { decideLv2 } from "./decideLv2";

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
 * Lv2 CPU戦略
 * ルールベースでより強い意思決定を行う
 */
export const cpuLv2: CpuStrategy = {
  decide(ctx) {
    return decideLv2(ctx);
  },
};
