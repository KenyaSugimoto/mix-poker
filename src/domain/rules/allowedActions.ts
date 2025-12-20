import type { DealState, EventType } from "../types";

/**
 * 現在のプレイヤーができるアクションのリストを返す
 */
export const getAllowedActions = (state: DealState): EventType[] => {
  if (state.dealFinished) return [];

  const actions: EventType[] = [];
  const { street, currentBet, raiseCount } = state;

  // 3rdストリート特有のルール
  if (street === "3rd") {
    if (currentBet === 0) {
      // 誰もアクションしていない（アンテ後、ブリングイン前）
      actions.push("BRING_IN");
      actions.push("COMPLETE"); // ブリングインの代わりにフルサイズベット
    } else {
      // ブリングインまたはコンプリート後
      actions.push("CALL");
      actions.push("FOLD");
      if (raiseCount < 3) {
        // 一般的な上限（キャップ）
        actions.push("RAISE");
      }
    }
  } else {
    // 4th〜7thストリート
    if (currentBet === 0) {
      actions.push("CHECK");
      actions.push("BET");
    } else {
      actions.push("CALL");
      actions.push("FOLD");
      if (raiseCount < 3) {
        actions.push("RAISE");
      }
    }
  }

  return actions;
};
