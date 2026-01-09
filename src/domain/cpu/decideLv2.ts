/**
 * CPU Lv2 意思決定の統括
 *
 * ゲームタイプ別にLv2戦略を呼び分ける。
 * Lv2未実装のゲームタイプはLv1にフォールバック。
 */

import { decideLv1 } from "./decideLv1";
import { decideRazzLv2 } from "./decideRazzLv2";
import { decideStudHiLv2 } from "./decideStudHiLv2";
import type { ActionType, CpuDecisionContext } from "./policy";

/**
 * Lv2 CPU の意思決定ロジック
 *
 * @param ctx - CpuDecisionContext
 * @returns ActionType
 */
export const decideLv2 = (ctx: CpuDecisionContext): ActionType => {
  const { state } = ctx;

  // Stud Hi → Lv2専用戦略
  if (state.gameType === "studHi") {
    return decideStudHiLv2(ctx);
  }

  // Razz → Lv2専用戦略
  if (state.gameType === "razz") {
    return decideRazzLv2(ctx);
  }

  // Stud8 → Lv1にフォールバック（将来Lv2実装予定）
  return decideLv1(ctx);
};
