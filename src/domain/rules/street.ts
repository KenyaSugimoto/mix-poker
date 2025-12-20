import type { DealEndEvent, DealState, StreetAdvanceEvent } from "../types";
import { generateId } from "../utils/id";

/**
 * ストリート終了条件をチェックし、必要に応じてイベントを返す
 */
export const checkStreetEndCondition = (
  state: DealState,
): StreetAdvanceEvent | DealEndEvent | null => {
  // ディール終了済みなら何もしない
  if (state.dealFinished) return null;

  const activeCount = state.players.filter((p) => p.active).length;

  // 全員fold（activeが1人）
  if (activeCount <= 1) {
    const winnerSeat = state.players.findIndex((p) => p.active);
    const event: DealEndEvent = {
      id: generateId(),
      type: "DEAL_END",
      seat: winnerSeat >= 0 ? winnerSeat : null,
      street: state.street,
      timestamp: Date.now(),
    };
    return event;
  }

  // 7thストリート終了時はDEAL_END
  if (state.street === "7th") {
    // 攻撃フェーズ終了
    if (state.currentBet > 0 && state.pendingResponseCount === 0) {
      const event: DealEndEvent = {
        id: generateId(),
        type: "DEAL_END",
        seat: null, // ショーダウンで決定
        street: "7th",
        timestamp: Date.now(),
      };
      return event;
    }
    // checkフェーズ終了
    if (state.currentBet === 0 && state.checksThisStreet === activeCount) {
      const event: DealEndEvent = {
        id: generateId(),
        type: "DEAL_END",
        seat: null, // ショーダウンで決定
        street: "7th",
        timestamp: Date.now(),
      };
      return event;
    }
    return null;
  }

  // 攻撃フェーズ終了（currentBet > 0 かつ pendingResponseCount === 0）
  if (state.currentBet > 0 && state.pendingResponseCount === 0) {
    const nextStreet = getNextStreet(state.street);
    if (!nextStreet) return null; // 7thの場合は上で処理済み

    const event: StreetAdvanceEvent = {
      id: generateId(),
      type: "STREET_ADVANCE",
      seat: null,
      street: state.street, // 終了したストリート
      timestamp: Date.now(),
    };
    return event;
  }

  // checkフェーズ終了（currentBet === 0 かつ checksThisStreet === activeCount）
  if (state.currentBet === 0 && state.checksThisStreet === activeCount) {
    const nextStreet = getNextStreet(state.street);
    if (!nextStreet) return null; // 7thの場合は上で処理済み

    const event: StreetAdvanceEvent = {
      id: generateId(),
      type: "STREET_ADVANCE",
      seat: null,
      street: state.street, // 終了したストリート
      timestamp: Date.now(),
    };
    return event;
  }

  return null;
};

/**
 * 次のストリートを返す（7thの場合はnull）
 */
const getNextStreet = (
  current: DealState["street"],
): DealState["street"] | null => {
  switch (current) {
    case "3rd":
      return "4th";
    case "4th":
      return "5th";
    case "5th":
      return "6th";
    case "6th":
      return "7th";
    case "7th":
      return null;
  }
};
