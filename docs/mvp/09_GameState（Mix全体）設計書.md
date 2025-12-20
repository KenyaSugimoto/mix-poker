# 09_GameState（Mix全体）設計書.md

## 1. 目的
本書は、Mixゲーム全体（複数ディールの連結）を管理する **GameState** を定義する。  
対象は「フロント完結・CPU対戦」を前提とした **オフライン進行管理**であり、オンライン対戦は対象外とする。

---

## 2. スコープ
対象：
- Mixゲームの設定（参加者、CPU設定、ステークス、ゲーム構成）
- ディール履歴の保持
- 次ディール開始（DealState生成）
- ローテーション（ゲーム種切り替え）
- スコア（点数 / チップ）更新
- 永続化対象の定義（AppStateで保持する想定）

対象外（将来）：
- オンライン同期
- 複雑なサイドポット/オールイン（MVPでは未対応）

---

## 3. 用語・命名（再確認）
- DealState：1ディール（開始〜ポット獲得）
- GameState：Mixゲーム全体（複数ディール）
- AppState：アプリ全体（画面状態・永続化・現在のGameState等）

---

## 4. Mixゲームの概念モデル

### 4.1 ゲーム構成（Rotation）
Mixゲームは「ゲーム種（StudHi/Razz/Stud8など）」を一定の単位で切り替えながら、ディールを繰り返す。

MVPでは以下の2パターンをサポートする。

- 固定ゲーム（StudHiのみ等）
- 複数種類のゲームをローテーション（例：StudHi → Razz → Stud8 を Nディールごとに切り替え）

---

## 5. データモデル

### 5.1 Player（ゲーム全体）
- DealStateのPlayerStateとは別に、GameStateは「参加者」と「累積スコア」を管理する

```ts
export type PlayerId = string;
export type PlayerKind = "human" | "cpu";

export interface GamePlayer {
  id: PlayerId;
  name: string;
  kind: PlayerKind;
}
```

### 5.2 スコアモデル（MVP）
MVPは「点数（チップ）」で統一する。表示単位（点 / BB表記切替）は将来のUI機能とする。

```ts
export interface GameScore {
  // 参加者ごとの累積点数（ディールを跨いで増減する）
  stacks: Record<PlayerId, number>;
}
```

### 5.3 Rotation定義
- `dealPerGame`：何ディールごとにゲーム種を変えるか
- `sequence`：ゲーム種の並び

```ts
export type GameType = "studHi" | "razz" | "stud8";

export interface RotationRule {
  sequence: GameType[];
  dealPerGame: number; // 例：6
}
```

### 5.4 GameState 本体

```ts
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

  // 結果
  winnersHigh: PlayerId[]; // StudHi/Razzはここに1〜複数（チョップ）
  winnersLow?: PlayerId[]; // Stud8のみ（low成立時）
  pot: number;

  // スコア変動（差分）
  deltaStacks: Record<PlayerId, number>;
}

export interface GameState {
  gameId: string;

  players: GamePlayer[];
  score: GameScore;

  stakes: Stakes;

  // rotation
  rotation: RotationRule;
  dealIndex: number; // 0-based（ゲーム全体で何ディール目か）

  // 現在進行中のディール
  currentDeal: DealState | null;

  // 履歴（要約）: 最大200件（新しい順）
  dealHistory: DealSummary[];

  // ゲーム終了フラグ（任意）
  gameFinished: boolean;
}
```

### 【追記】DealSummary.startedAt / endedAt の定義
- `startedAt`：`startNewDeal()` により **DealState を生成して `currentDeal` にセットした時刻**（例：`Date.now()`）
- `endedAt`：ディール終了が確定し **DealSummary を `dealHistory` に追加する直前の時刻**（例：`Date.now()`）
  - 例：`DEAL_END` 適用後に `resolveShowdown` / `deltaStacks` 計算が完了したタイミング

### 【修正】履歴の保持先を一本化
- `GameState.dealHistory: DealSummary[]` は **永続化の主たる履歴**として保持する（= 要約履歴）
- AppState側に `dealSummaries` を別途持つ構成は採用しない（履歴の二重管理を避ける）

### 【追記】履歴の上限
- `dealHistory` は最大200件とし、ディール終了時に先頭追加→200件にsliceする

---

## 6. GameType の決定ロジック（ローテーション）

### 6.1 currentGameType の算出
- `dealIndex` から現在のゲーム種を決める（状態に持つより算出推奨）

```ts
export const getCurrentGameType = (rotation: RotationRule, dealIndex: number): GameType => {
  const { sequence, dealPerGame } = rotation;
  const block = Math.floor(dealIndex / dealPerGame);
  const idx = block % sequence.length;
  return sequence[idx];
};
```

---

## 7. DealState の生成（新規ディール開始）

### 7.1 生成方針
- 新ディール開始時に `DealState` を生成し `currentDeal` にセットする
- 08_カード配布設計書.md に基づき、`DEAL_INIT` 等の初期イベントで deck/hand を初期化する

### 7.2 DealState 初期値（GameStateから注入するもの）
- `gameType`（rotationから算出）
- `playerCount` / `players`（PlayerId→seatの割当）
- `stakes`（ante/bringIn/smallBet/bigBet）
- `rngSeed`（GameState側で生成）

```ts
export interface StartDealParams {
  rngSeed: string;
  seatOrder: PlayerId[]; // seatIndex=配列index
}

export const startNewDeal = (g: GameState, p: StartDealParams): GameState => {
  // 1) gameType算出
  // 2) DealState生成（seat割当）
  // 3) currentDealにセット
  // 4) dealIndexは開始時点では増やさない（終了確定時に+1）
  return g;
};
```

---

## 8. ディール終了処理（スコア更新）

### 8.1 DealState → DealSummary 変換
Deal終了時点で、以下を確定させる：
- winners（high/low）
- pot
- deltaStacks
- endedAt

### 8.2 pot分配（07に準拠）
- StudHi/Razz：winnersHigh に均等配分
- Stud8：
  - low成立：potを2分割（端数はHiへ）
  - low不成立：Hiが総取り
- 端数は ante 単位で発生し得る
- 端数配布のseat優先は、MVPでは「seat昇順」でよい（将来変更可能）

```ts
export const distributePot = (
  gameType: GameType,
  pot: number,
  winnersHigh: SeatIndex[],
  winnersLow: SeatIndex[] | null,
  seatToPlayerId: (seat: SeatIndex) => PlayerId
): Record<PlayerId, number> => {
  // 各winnerに +配分、その他は0
  // 戻り値：deltaStacks（勝者は+、敗者側の差分は別途コミット差分で計算）
  return {};
};
```

### 8.3 committed とスコア差分
MVPでは「各プレイヤーがディール中に支払った総額 = committedTotal」を使い、
- まず全員 `-committedTotal`
- 次に勝者へ pot配分を `+` で加算
として `deltaStacks` を作るのが最も単純。

```ts
export const calcDeltaStacks = (
  deal: DealState,
  potShare: Record<PlayerId, number>,
  seatToPlayerId: (seat: SeatIndex) => PlayerId
): Record<PlayerId, number> => {
  const delta: Record<PlayerId, number> = {};
  for (const ps of deal.players) {
    const pid = seatToPlayerId(ps.seat);
    delta[pid] = (delta[pid] ?? 0) - ps.committedTotal;
  }
  for (const pid of Object.keys(potShare)) {
    delta[pid] = (delta[pid] ?? 0) + potShare[pid];
  }
  return delta;
};
```

---

## 9. GameState 更新フロー（典型）

### 9.1 ディール開始
- `startNewDeal()` を呼ぶ
- DealState 内部で `DEAL_INIT → POST_ANTE* → DEAL_CARDS_3RD` を発火して3rd開始

### 9.2 ディール進行
- UI/CPUは `getAllowedActions` → action選択 → event生成 → applyEvent
- STREET_ADVANCE でカード配布イベントを自動発火（08）

### 9.3 ディール終了
- `deal.dealFinished === true` になったら
  - `resolveShowdown`（07）または fold勝利で winners 確定
  - `potShare` を計算
  - `deltaStacks` を計算
  - `score.stacks` を更新
  - `dealHistory` に `DealSummary` 追加
  - `currentDeal = null`
  - `dealIndex++`

---

## 10. Seat と PlayerId の対応
MVPでは「1ディール中は seat固定」でよい。

- `seatOrder: PlayerId[]` を Deal開始時に確定
- `DealState.players[seat]` と `GameState.players` の紐付けは seatOrder を介す

将来：
- ボタン（Bring-in / 先頭アクター）に応じた seat回転を入れる場合は
  `seatOrder` をディールごとに回転させる

---

## 11. 永続化（AppState側の責務）
- GameState全体を localStorage に保存可能にする
- ただし deck/hands を含むためサイズが増える
  - MVPでは保存して問題ない
  - 将来は「履歴はDealSummaryだけ保持」等の縮約を検討

---

## 12. テスト観点（Vitest）
- getCurrentGameType が dealPerGame に従い切り替わる
- startNewDeal で DealState が生成される（gameType/stakes/seat割当）
- deal終了時に deltaStacks が期待どおり（-committedTotal + potShare）
- Stud8 で low不成立の場合はHi総取り
- potの端数がante単位で処理される（Stud8の分割含む）

---

## 13. 次のドキュメント
- 10_AppState / 永続化設計.md（Zustand、localStorage、UI状態）
- 11_UI設計ブリーフ（画面一覧・フロー・状態・コンポーネント）
