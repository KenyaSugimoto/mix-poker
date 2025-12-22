import type { DealState, EventType } from "../types";

/**
 * 現在のプレイヤーができるアクションのリストを返す
 */
export const getAllowedActions = (state: DealState): EventType[] => {
  if (state.dealFinished) return [];

  const actions: EventType[] = [];
  const { street, currentBet, raiseCount, bringIn, smallBet } = state;
  const currentPlayer = state.players[state.currentActorIndex];

  // 3rdストリート特有のルール
  if (street === "3rd") {
    if (currentBet === 0) {
      // 誰もアクションしていない（アンテ後、ブリングイン前）
      actions.push("BRING_IN");
      actions.push("COMPLETE"); // ブリングインの代わりにフルサイズベット
    } else if (currentBet === bringIn) {
      // bring-in後（complete未発生）
      // 許可：fold / call(bring-in) / complete(smallBet)
      actions.push("CALL");
      actions.push("FOLD");
      // COMPLETEはcommittedThisStreet === 0の場合のみ許可
      if (currentPlayer && currentPlayer.committedThisStreet === 0) {
        actions.push("COMPLETE");
      }
      // RAISEは許可しない（complete後のみ許可）
    } else {
      // complete後（currentBet >= smallBet）
      // 許可：fold / call / raise（cap未到達時）
      actions.push("CALL");
      actions.push("FOLD");
      if (raiseCount < 3) {
        // 一般的な上限（キャップ）
        actions.push("RAISE");
      }
      // COMPLETEは許可しない
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
