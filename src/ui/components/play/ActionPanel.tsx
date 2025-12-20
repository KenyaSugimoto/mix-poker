import type React from "react";
import { useAppStore } from "../../../app/store/appStore";
import { createEventFromAction } from "../../../domain/cpu/eventFactory";
import type { ActionType } from "../../../domain/cpu/policy";
import { getAllowedActions } from "../../../domain/rules/allowedActions";
import type { DealState } from "../../../domain/types";

interface ActionPanelProps {
  deal: DealState;
  currentSeat: number;
}

export const ActionPanel: React.FC<ActionPanelProps> = () => {
  const deal = useAppStore((state) => state.game?.currentDeal);
  const dispatch = useAppStore((state) => state.dispatch);

  if (!deal) return null;

  const currentActor = deal.players[deal.currentActorIndex];
  if (!currentActor || currentActor.kind !== "human") {
    return (
      <div className="bg-card rounded-xl p-4 shadow-sm border text-center text-muted-foreground">
        Waiting for CPU...
      </div>
    );
  }

  const allowedActions = getAllowedActions(deal);
  const humanActions = allowedActions.filter(
    (a) => a !== "STREET_ADVANCE" && a !== "DEAL_END" && a !== "POST_ANTE",
  );

  const handleAction = (actionType: string) => {
    const event = createEventFromAction(
      actionType as ActionType,
      deal,
      deal.currentActorIndex,
    );
    if (event) {
      dispatch(event);
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case "BRING_IN":
        return `Bring In (${deal.bringIn})`;
      case "COMPLETE":
        return `Complete (${deal.smallBet})`;
      case "BET": {
        const betUnit =
          deal.street === "3rd" || deal.street === "4th"
            ? deal.smallBet
            : deal.bigBet;
        return `Bet (${betUnit})`;
      }
      case "RAISE": {
        const raiseUnit =
          deal.street === "3rd" || deal.street === "4th"
            ? deal.smallBet
            : deal.bigBet;
        return `Raise (${raiseUnit})`;
      }
      case "CALL": {
        const toCall = Math.max(
          0,
          deal.currentBet - currentActor.committedThisStreet,
        );
        return `Call (${toCall})`;
      }
      case "CHECK":
        return "Check";
      case "FOLD":
        return "Fold";
      default:
        return action;
    }
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border">
      <div className="text-sm font-semibold mb-3">Your Action</div>
      <div className="flex flex-wrap gap-2">
        {humanActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => handleAction(action)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getActionLabel(action)}
          </button>
        ))}
      </div>
    </div>
  );
};
