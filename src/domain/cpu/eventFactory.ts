import type {
  BetEvent,
  BringInEvent,
  CallEvent,
  CheckEvent,
  CompleteEvent,
  DealState,
  Event,
  FoldEvent,
  RaiseEvent,
  SeatIndex,
} from "../types";
import { generateId } from "../utils/id";
import type { ActionType } from "./policy";

/**
 * ActionTypeとDealStateからEventを生成する
 */
export const createEventFromAction = (
  action: ActionType,
  state: DealState,
  seat: SeatIndex,
): Event | null => {
  const player = state.players[seat];
  if (!player || !player.active) return null;

  const timestamp = Date.now();
  const eventId = generateId();

  switch (action) {
    case "BRING_IN": {
      const event: BringInEvent = {
        id: eventId,
        type: "BRING_IN",
        seat,
        street: "3rd",
        timestamp,
        amount: state.bringIn,
      };
      return event;
    }

    case "COMPLETE": {
      if (state.street !== "3rd") return null;
      const event: CompleteEvent = {
        id: eventId,
        type: "COMPLETE",
        seat,
        street: "3rd",
        timestamp,
        amount: state.smallBet, // COMPLETEはsmallBetを成立させる
      };
      return event;
    }

    case "BET": {
      if (state.street === "3rd") return null; // 3rdではBET不可
      const streetBetUnit =
        state.street === "4th" ? state.smallBet : state.bigBet;
      const event: BetEvent = {
        id: eventId,
        type: "BET",
        seat,
        street: state.street,
        timestamp,
        amount: streetBetUnit,
      };
      return event;
    }

    case "RAISE": {
      const streetBetUnit =
        state.street === "3rd" || state.street === "4th"
          ? state.smallBet
          : state.bigBet;
      const event: RaiseEvent = {
        id: eventId,
        type: "RAISE",
        seat,
        street: state.street,
        timestamp,
        amount: streetBetUnit,
      };
      return event;
    }

    case "CALL": {
      const toCall = Math.max(0, state.currentBet - player.committedThisStreet);
      if (toCall === 0) return null; // toCallが0ならCALL不可
      const event: CallEvent = {
        id: eventId,
        type: "CALL",
        seat,
        street: state.street,
        timestamp,
        amount: toCall,
      };
      return event;
    }

    case "CHECK": {
      if (state.street === "3rd") return null; // 3rdではCHECK不可
      if (state.currentBet > 0) return null; // ベットがあるときはCHECK不可
      const event: CheckEvent = {
        id: eventId,
        type: "CHECK",
        seat,
        street: state.street,
        timestamp,
      };
      return event;
    }

    case "FOLD": {
      const event: FoldEvent = {
        id: eventId,
        type: "FOLD",
        seat,
        street: state.street,
        timestamp,
      };
      return event;
    }

    default:
      return null;
  }
};
