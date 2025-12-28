import { type Draft, produce } from "immer";
import {
  createDeck,
  dealCard7th,
  dealCards3rd,
  dealCardUp,
  shuffleDeck,
} from "../cards/dealing";
import {
  computeBringInIndex,
  getNextActor,
  pickFirstActorFromUpcards,
} from "../rules/actor";
import type {
  BetEvent,
  BringInEvent,
  CallEvent,
  CheckEvent,
  CompleteEvent,
  DealCardEvent,
  DealCards3rdEvent,
  DealInitEvent,
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
    // イベントログに追加（eventLogがない場合は初期化）
    if (!draft.eventLog) {
      draft.eventLog = [];
    }
    draft.eventLog.push(event);

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
      case "DEAL_INIT":
        handleDealInit(draft, event);
        break;
      case "DEAL_CARDS_3RD":
        handleDealCards3rd(draft, event);
        break;
      case "DEAL_CARD_4TH":
      case "DEAL_CARD_5TH":
      case "DEAL_CARD_6TH":
        handleDealCardUp(draft, event);
        break;
      case "DEAL_CARD_7TH":
        handleDealCard7th(draft, event);
        break;
    }

    // アクションの記録 (EventIdなどを入れる想定だが、MVPでは簡易文字列でも可)
    if (
      event.type !== "STREET_ADVANCE" &&
      event.type !== "DEAL_END" &&
      event.type !== "DEAL_INIT" &&
      event.type !== "DEAL_CARDS_3RD" &&
      event.type !== "DEAL_CARD_4TH" &&
      event.type !== "DEAL_CARD_5TH" &&
      event.type !== "DEAL_CARD_6TH" &&
      event.type !== "DEAL_CARD_7TH"
    ) {
      draft.actionsThisStreet.push(`${event.seat}:${event.type}`);
    }

    // 次のアクターの更新（STREET_ADVANCEなどの特殊な場合を除き）
    if (
      !draft.dealFinished &&
      event.type !== "STREET_ADVANCE" &&
      event.type !== "DEAL_INIT" &&
      event.type !== "DEAL_CARDS_3RD" &&
      event.type !== "DEAL_CARD_4TH" &&
      event.type !== "DEAL_CARD_5TH" &&
      event.type !== "DEAL_CARD_6TH" &&
      event.type !== "DEAL_CARD_7TH"
    ) {
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

  // raiseCountの更新
  if (event.type === "RAISE") {
    draft.raiseCount += 1;
  } else {
    // BRING_IN, COMPLETE, BETはraiseCountを0にリセット
    draft.raiseCount = 0;
  }

  // 他のプレイヤーが反応する必要がある人数をリセット（自分以外のアクティブなプレイヤー数）
  draft.pendingResponseCount = draft.players.filter((p) => p.active).length - 1;
  // 攻撃アクションが発生したのでchecksThisStreetをリセット
  draft.checksThisStreet = 0;
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

  // 攻撃フェーズ（currentBet > 0）の場合のみpendingResponseCountを減らす
  if (draft.currentBet > 0) {
    draft.pendingResponseCount -= 1;
  }
  // checkフェーズ（currentBet === 0）の場合はchecksThisStreetは増やさない
  // 注意: dealFinishedはcheckStreetEndCondition経由で設定される
  // applyEvent単体ではdealFinishedを設定しない（終了判定の一本化）
};

const handleCheck = (draft: Draft<DealState>, _event: CheckEvent) => {
  // CHECKはcheckフェーズ（currentBet === 0）でのみ発生するため、
  // pendingResponseCountは変更しない
  draft.checksThisStreet += 1;
};

const handleStreetAdvance = (
  draft: Draft<DealState>,
  event: StreetAdvanceEvent,
) => {
  // event.streetは終了したストリートなので、次のストリートを設定
  const nextStreet = getNextStreet(event.street);
  if (nextStreet) {
    draft.street = nextStreet;
  }
  draft.currentBet = 0;
  draft.raiseCount = 0;
  draft.checksThisStreet = 0;
  draft.actionsThisStreet = [];
  draft.pendingResponseCount = 0;

  // ストリート開始時は全プレイヤーのそのストリートでのコミットを0にする
  for (const p of draft.players) {
    p.committedThisStreet = 0;
  }

  // 最初のアクターはカード配布後に決定されるので、ここでは設定しない
};

const handleDealInit = (draft: Draft<DealState>, event: DealInitEvent) => {
  draft.rngSeed = event.rngSeed;
  const deck = createDeck();
  draft.deck = shuffleDeck(deck, event.rngSeed);
  // handsを初期化（全seatにempty handを用意）
  draft.hands = {};
  for (let i = 0; i < draft.playerCount; i++) {
    draft.hands[i] = { downCards: [], upCards: [] };
  }
};

const handleDealCards3rd = (
  draft: Draft<DealState>,
  _event: DealCards3rdEvent,
) => {
  const activeSeats = draft.players
    .filter((p) => p.active)
    .map((p) => p.seat)
    .sort((a, b) => a - b);

  const result = dealCards3rd(draft.deck, activeSeats, draft.hands);
  draft.deck = result.deck;
  draft.hands = result.hands;

  // カード配布後にbring-in対象者を決定
  draft.bringInIndex = computeBringInIndex(draft);
  // bring-inの最初のアクターはbringInIndex
  draft.currentActorIndex = draft.bringInIndex;
};

const handleDealCardUp = (draft: Draft<DealState>, _event: DealCardEvent) => {
  const activeSeats = draft.players
    .filter((p) => p.active)
    .map((p) => p.seat)
    .sort((a, b) => a - b);

  const result = dealCardUp(draft.deck, activeSeats, draft.hands);
  draft.deck = result.deck;
  draft.hands = result.hands;

  // カード配布後に先頭アクターを再計算
  draft.currentActorIndex = pickFirstActorFromUpcards(
    draft.gameType,
    activeSeats,
    draft.hands,
  );
};

const handleDealCard7th = (draft: Draft<DealState>, _event: DealCardEvent) => {
  const activeSeats = draft.players
    .filter((p) => p.active)
    .map((p) => p.seat)
    .sort((a, b) => a - b);

  const result = dealCard7th(draft.deck, activeSeats, draft.hands);
  draft.deck = result.deck;
  draft.hands = result.hands;
};

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
