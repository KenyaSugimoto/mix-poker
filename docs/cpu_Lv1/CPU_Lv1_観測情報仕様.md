# CPU_Lv1_観測情報仕様.md

## 1. 目的
CPU Lv1 が「公平性」を破らないために、DealState から CPU に渡す情報を “観測可能情報（Observation）” に限定する。
本書は Observation の完全スキーマと、DealState からの生成ルール（マスキング規則）を定義する。

## 2. 公平性の原則（必須）
CPU が参照して良い情報：
- 自分の downCards + upCards
- 全員の upCards（公開情報）
- 状態情報（street/pot/currentBet/raiseCount/players.active/stack/committedThisStreet 等）

CPU が参照してはならない情報：
- 他人の downCards
- deck（残りデッキ）
- rngSeed（シャッフル復元可能性）

## 3. Observation スキーマ（完全定義）

### 3.1 型定義
```ts
export interface CpuObservation {
  // ---- Game/Deal meta ----
  dealId: string;
  gameType: GameType;
  street: Street;

  // ---- Stakes / cost context ----
  stakes: {
    ante: number;
    bringIn: number;
    smallBet: number;
    bigBet: number;
  };

  // ---- Turn / betting ----
  bringInIndex: SeatIndex;
  currentActorIndex: SeatIndex;
  pot: number;
  currentBet: number;
  raiseCount: number;

  // ---- Optional counters (debug/heuristic) ----
  checksThisStreet: number;
  pendingResponseCount: number;

  // ---- Me ----
  me: {
    seat: SeatIndex;
    kind: PlayerKind;
    active: boolean;
    stack: number;
    committedTotal: number;
    committedThisStreet: number;

    // private info allowed (self only)
    downCards: Card[];
    upCards: Card[];
  };

  // ---- Others (public only) ----
  players: Array<{
    seat: SeatIndex;
    kind: PlayerKind;
    active: boolean;
    stack: number;
    committedTotal: number;
    committedThisStreet: number;

    // public info only
    upCards: Card[];
  }>;
}
```

### 3.2 Observation に含めないフィールド（禁止）
以下は Observation に含めてはならない：
- DealState.deck
- DealState.rngSeed
- hands[*].downCards（me以外）

## 4. 生成ルール（DealState → Observation）

### 4.1 入力
- DealState state
- SeatIndex seat（CPU自身）

### 4.2 生成アルゴリズム（規則）
1. `meSeat = seat`
2. `mePlayer = state.players.find(p => p.seat === meSeat)`
3. `meHand = state.hands[meSeat]` を取得
4. `players` は `state.players` を seat順に map し、各 seat の `upCards` のみを追加
   - `upCards = state.hands[thatSeat]?.upCards ?? []`
   - downCards は **決して載せない**
5. `me` には `downCards` と `upCards` を載せる
6. `stakes` は state.ante/bringIn/smallBet/bigBet から構成
7. `dealId/gameType/street/pot/currentBet/raiseCount/...` は state からコピー
8. `deck` と `rngSeed` は **参照しても良いが Observation には絶対入れない**（できれば生成関数内でも参照しない）

## 5. マスキングの確認（テスト要件）
- Observation に `deck` が存在しないこと
- Observation に `rngSeed` が存在しないこと
- Observation.players の要素に downCards が存在しないこと
- Observation.me のみに downCards が存在すること

## 6. allowedActions の型（注意）
現状 `CpuDecisionContext.allowedActions: EventType[]` の場合、
CPU内部で `ActionType` にフィルタして扱うこと。

ActionType:
- POST_ANTE / BRING_IN / COMPLETE / BET / RAISE / CALL / CHECK / FOLD
（STREET_ADVANCE/DEAL_END などはCPU選択対象外）

推奨：`allowedActions` を ActionType[] に修正し、型で違反を防ぐ。
