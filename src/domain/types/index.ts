// 基本型
export type GameType = "studHi" | "razz" | "stud8";
export type Street = "3rd" | "4th" | "5th" | "6th" | "7th";
export type SeatIndex = number;
export type PlayerKind = "human" | "cpu";
export type EventId = string;
export type PlayerId = string;

// Card関連
export type Suit = "c" | "d" | "h" | "s";
export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "T"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Deck = Card[];

export interface PlayerHand {
  downCards: Card[]; // 裏
  upCards: Card[]; // 表
}

// DealState関連
export interface PlayerState {
  seat: SeatIndex;
  kind: PlayerKind;
  active: boolean;
  stack: number; // 最小単位=ante
  committedTotal: number; // ディール内累計の出資額
  committedThisStreet: number; // ストリート内の出資額
}

export interface DealState {
  dealId: string;
  gameType: GameType;
  playerCount: number; // 2〜7人
  players: PlayerState[];
  ante: number;
  bringIn: number;
  smallBet: number;
  bigBet: number;
  street: Street;
  bringInIndex: SeatIndex;
  currentActorIndex: SeatIndex;
  pot: number;
  currentBet: number;
  raiseCount: number;
  pendingResponseCount: number;
  checksThisStreet: number;
  actionsThisStreet: string[];
  dealFinished: boolean;
  deck: Deck;
  rngSeed: string;
  hands: Record<SeatIndex, PlayerHand>;
}

// Event関連
export type EventType =
  | "POST_ANTE"
  | "BRING_IN"
  | "COMPLETE"
  | "BET"
  | "RAISE"
  | "CALL"
  | "FOLD"
  | "CHECK"
  | "STREET_ADVANCE"
  | "DEAL_END"
  | "DEAL_INIT"
  | "DEAL_CARDS_3RD"
  | "DEAL_CARD_4TH"
  | "DEAL_CARD_5TH"
  | "DEAL_CARD_6TH"
  | "DEAL_CARD_7TH";

export interface BaseEvent {
  id: EventId;
  type: EventType;
  seat: SeatIndex | null;
  street: Street | null;
  timestamp: number;
}

export interface PostAnteEvent extends BaseEvent {
  type: "POST_ANTE";
  seat: SeatIndex;
  street: null;
  amount: number;
}

export interface BringInEvent extends BaseEvent {
  type: "BRING_IN";
  seat: SeatIndex;
  street: "3rd";
  amount: number;
}

export interface CompleteEvent extends BaseEvent {
  type: "COMPLETE";
  seat: SeatIndex;
  street: "3rd";
  amount: number;
}

export interface BetEvent extends BaseEvent {
  type: "BET";
  seat: SeatIndex;
  street: Street;
  amount: number;
}

export interface RaiseEvent extends BaseEvent {
  type: "RAISE";
  seat: SeatIndex;
  street: Street;
  amount: number;
}

export interface CallEvent extends BaseEvent {
  type: "CALL";
  seat: SeatIndex;
  street: Street;
  amount: number;
}

export interface FoldEvent extends BaseEvent {
  type: "FOLD";
  seat: SeatIndex;
  street: Street;
}

export interface CheckEvent extends BaseEvent {
  type: "CHECK";
  seat: SeatIndex;
  street: Street; // 4th〜7thのみ
}

export interface StreetAdvanceEvent extends BaseEvent {
  type: "STREET_ADVANCE";
  seat: null;
  street: Street;
}

export interface DealEndEvent extends BaseEvent {
  type: "DEAL_END";
  seat: SeatIndex | null;
  street: Street | null;
}

export interface DealInitEvent extends BaseEvent {
  type: "DEAL_INIT";
  seat: null;
  street: null;
  rngSeed: string;
}

export interface DealCards3rdEvent extends BaseEvent {
  type: "DEAL_CARDS_3RD";
  seat: null;
  street: "3rd";
}

export interface DealCardEvent extends BaseEvent {
  type: "DEAL_CARD_4TH" | "DEAL_CARD_5TH" | "DEAL_CARD_6TH" | "DEAL_CARD_7TH";
  seat: null;
  street: "4th" | "5th" | "6th" | "7th";
}

export type Event =
  | PostAnteEvent
  | BringInEvent
  | CompleteEvent
  | BetEvent
  | RaiseEvent
  | CallEvent
  | FoldEvent
  | CheckEvent
  | StreetAdvanceEvent
  | DealEndEvent
  | DealInitEvent
  | DealCards3rdEvent
  | DealCardEvent;

// GameState関連
export interface GamePlayer {
  id: PlayerId;
  name: string;
  kind: PlayerKind;
}

export interface GameScore {
  stacks: Record<PlayerId, number>;
}

export interface RotationRule {
  sequence: GameType[];
  dealPerGame: number;
}

export interface Stakes {
  ante: number;
  bringIn: number;
  smallBet: number;
  bigBet: number;
}

export interface DealSummary {
  dealId: string;
  gameType: GameType;
  startedAt: number;
  endedAt: number;
  winnersHigh: PlayerId[];
  winnersLow?: PlayerId[];
  pot: number;
  deltaStacks: Record<PlayerId, number>;
}

export interface GameState {
  gameId: string;
  players: GamePlayer[];
  score: GameScore;
  stakes: Stakes;
  rotation: RotationRule;
  dealIndex: number;
  currentDeal: DealState | null;
  dealHistory: DealSummary[];
  gameFinished: boolean;
}
