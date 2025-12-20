import { type Draft, produce } from "immer";
import { getNextActor } from "../rules/actor";
import type {
  BetEvent,
  BringInEvent,
  CallEvent,
  CheckEvent,
  CompleteEvent,
  DealState,
  Event,
  FoldEvent,
  PostAnteEvent,
  RaiseEvent,
  StreetAdvanceEvent,
} from "../types";

/**
 * DealState に対して Event を適用し、新しい DealState を返す（内部で immer 使用）
 */
export const applyEvent = (state: DealState, event: Event): DealState => {
  return produce(state, (draft) => {
    switch (event.type) {
      case "POST_ANTE":
        handlePostAnte(draft, event);
        break;
      case "BRING_IN":
      case "COMPLETE":
      case "BET":
      case "RAISE":
        handleBetting(draft, event);
        break;
      case "CALL":
        handleCall(draft, event);
        break;
      case "FOLD":
        handleFold(draft, event);
        break;
      case "CHECK":
        handleCheck(draft, event);
        break;
      case "STREET_ADVANCE":
        handleStreetAdvance(draft, event);
        break;
      case "DEAL_END":
        draft.dealFinished = true;
        break;
    }

    // アクションの記録 (EventIdなどを入れる想定だが、MVPでは簡易文字列でも可)
    if (event.type !== "STREET_ADVANCE" && event.type !== "DEAL_END") {
      draft.actionsThisStreet.push(`${event.seat}:${event.type}`);
    }

    // 次のアクターの更新（STREET_ADVANCEなどの特殊な場合を除き）
    if (!draft.dealFinished && event.type !== "STREET_ADVANCE") {
      const next = getNextActor(draft);
      if (next !== null) {
        draft.currentActorIndex = next;
      }
    }
  });
};

const handlePostAnte = (draft: Draft<DealState>, event: PostAnteEvent) => {
  const player = draft.players[event.seat];
  const amount = Math.min(player.stack, event.amount);
  player.stack -= amount;
  player.committedTotal += amount;
  draft.pot += amount;
};

const handleBetting = (
  draft: Draft<DealState>,
  event: BetEvent | RaiseEvent | CompleteEvent | BringInEvent,
) => {
  const player = draft.players[event.seat];
  const added = event.amount - player.committedThisStreet;
  const actualAdded = Math.min(player.stack, added);

  player.stack -= actualAdded;
  player.committedTotal += actualAdded;
  player.committedThisStreet += actualAdded;
  draft.pot += actualAdded;

  draft.currentBet = event.amount;
  if (event.type === "RAISE" || event.type === "COMPLETE") {
    draft.raiseCount += 1;
  }

  // 他のプレイヤーが反応する必要がある人数をリセット（自分以外のアクティブなプレイヤー数）
  draft.pendingResponseCount = draft.players.filter((p) => p.active).length - 1;
};

const handleCall = (draft: Draft<DealState>, event: CallEvent) => {
  const player = draft.players[event.seat];
  const added = draft.currentBet - player.committedThisStreet;
  const actualAdded = Math.min(player.stack, added);

  player.stack -= actualAdded;
  player.committedTotal += actualAdded;
  player.committedThisStreet += actualAdded;
  draft.pot += actualAdded;

  draft.pendingResponseCount -= 1;
};

const handleFold = (draft: Draft<DealState>, event: FoldEvent) => {
  draft.players[event.seat].active = false;
  draft.pendingResponseCount -= 1;

  // 1人しか残っていないかチェック
  const activeCount = draft.players.filter((p) => p.active).length;
  if (activeCount <= 1) {
    draft.dealFinished = true;
  }
};

const handleCheck = (draft: Draft<DealState>, _event: CheckEvent) => {
  draft.checksThisStreet += 1;
  draft.pendingResponseCount -= 1;
};

const handleStreetAdvance = (
  draft: Draft<DealState>,
  event: StreetAdvanceEvent,
) => {
  draft.street = event.street;
  draft.currentBet = 0;
  draft.raiseCount = 0;
  draft.checksThisStreet = 0;
  draft.actionsThisStreet = [];

  // ストリート開始時は全プレイヤーのそのストリートでのコミットを0にする
  for (const p of draft.players) {
    p.committedThisStreet = 0;
  }

  // 最初のアクターを決定（3rdはブリングイン、他はルールに基づく）
  // MVPではとりあえず 0 に戻すか、状況に合わせて調整
  draft.currentActorIndex = 0;
  draft.pendingResponseCount = draft.players.filter((p) => p.active).length;
};
