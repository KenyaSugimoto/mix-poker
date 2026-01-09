/**
 * CPU Lv2 意思決定の統括
 *
 * ゲームタイプ別にLv2戦略を呼び分ける。
 * 全ゲームタイプでLv2戦略が実装済み。
 */

import { decideRazzLv2 } from "./decideRazzLv2";
import { decideStud8Lv2 } from "./decideStud8Lv2";
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

  // Stud8 → Lv2専用戦略
  if (state.gameType === "stud8") {
    return decideStud8Lv2(ctx);
  }

  // フォールバック（ありえないが安全のため）
  return decideStudHiLv2(ctx);
};
