# Fixed Limit Hold'em (FLH) 詳細設計書

## 1. 状態設計 (State Design)

既存のデータ構造を拡張し、Hold'em系ゲーム（FLH, Omaha）に対応させます。
Stud系と共存させるため、共通フィールドはそのままに、固有フィールドを追加・拡張します。

### 1.1 `GameType` の拡張
```typescript
export type GameType = "studHi" | "razz" | "stud8" | "flh"; // "flh" を追加
```

### 1.2 `Street` の拡張
Stud系のストリートとHold'em系のストリートを区別するため、Union型を拡張します。
```typescript
export type Street = 
  // Stud
  | "3rd" | "4th" | "5th" | "6th" | "7th"
  // Flop Games
  | "preflop" | "flop" | "turn" | "river";
```

### 1.3 `DealState` の拡張
Board（コミュニティカード）やDealer Buttonなど、Flopゲーム固有の情報を追加します。
Stud系ゲームではこれらのフィールドは使用されませんが（値は空配列やnull等）、型定義上は共存させます。

```typescript
export interface DealState {
  // ...既存フィールド
  
  // --- Flop Game Extensions ---
  board: Card[];          // コミュニティカード (Preflop: [], Flop: 3枚, Turn: 4枚, River: 5枚)
  dealerBtnIndex: SeatIndex | null; // ディーラーボタンの位置 (Stud系では null)
  sbIndex: SeatIndex | null;        // Small Blindの位置 (計算で求めても良いが、キャッシュしておくと便利)
  bbIndex: SeatIndex | null;        // Big Blindの位置
  
  // 既存の bringInIndex は Stud系でのみ使用
  // 既存の ante は FLH でも設定上あるかもしれないが、通常は0
}
```

### 1.4 `Stakes` の拡張
Blind額を定義に追加します。

```typescript
export interface Stakes {
  ante: number;
  bringIn: number;
  smallBet: number;
  bigBet: number;
  // --- New Fields ---
  smallBlind: number; // 通常 smallBet / 2
  bigBlind: number;   // 通常 smallBet
}
```

---

## 2. イベント設計 (Event Design)

Hold'em系の進行に必要なイベントを追加定義します。

### 2.1 新規イベント

#### `POST_BLIND`
ブラインド支払いを表すイベント。強制アクションとして扱います。
```typescript
export interface PostBlindEvent extends BaseEvent {
  type: "POST_BLIND";
  seat: SeatIndex;
  street: "preflop"; // Preflopでのみ発生
  amount: number;
  isNodal: boolean; // SBかBBか、あるいはStraddleか（MVPではSB/BBのみ）
}
```
※ `isNodal` は MVPでは不要かもしれないが、SB/BBの区別に使える。ここでは単純に `blindType: "SB" | "BB"` でも可。

#### `DEAL_BOARD`
コミュニティカードの配布イベント。
```typescript
export interface DealBoardEvent extends BaseEvent {
  type: "DEAL_BOARD";
  seat: null;
  street: "flop" | "turn" | "river";
  cards: Card[]; // Flopなら3枚、他は1枚
}
```

### 2.2 既存イベントの挙動変更
- **`DEAL_INIT`**:
    - `dealCards3rd` (Hole Cards) 相当の処理が必要（Studは3枚、Hold'emは2枚）。
    - **案**: `DEAL_CARDS_PREFLOP` を追加し、各プレイヤーに2枚配る。

- **`STREET_ADVANCE`**:
    - `preflop` -> `flop` -> `turn` -> `river` -> `null` (Flow終了) の遷移を実装。

---

## 3. ゲーム進行ロジック (Engine Logic)

### 3.1 ディール開始フロー (`startNewDeal`)
1. **ストリート初期化**: `preflop` に設定。
2. **Dealer Button決定**:
    - 初回: ランダム or Seat 0。
    - 2回目以降: 時計回りに移動 (`(prevBtn + 1) % playerCount`)。
3. **ブラインド決定**:
    - Heads-up (2人): Button = SB, 他方 = BB。
    - 3人以上: Buttonの次 = SB, その次 = BB。
    - `sbIndex`, `bbIndex` をStateに保存。

### 3.2 アクション順序判定 (`getNextActor`)
- **Preflop**:
    - BBの左隣 (UTG) から開始。
    - `currentBet > 0` の攻撃フェーズなので、BBまで一周する。
    - **BB Option**: 他のプレイヤーがCallのみでBBまで回ってきた場合、BBはCheck（既に同額出しているので）やRaiseが可能。
- **Postflop (Flop, Turn, River)**:
    - SB（またはButtonの左隣で最初にActiveなプレイヤー）から開始。
    - Check/Betのラウンド。

### 3.3 ベット額・Raise額判定 (`allowedActions` / `handleBetting`)
- **Preflop / Flop**:
    - ベット額単位 = `smallBet`
    - Raise額単位 = `smallBet`
- **Turn / River**:
    - ベット額単位 = `bigBet`
    - Raise額単位 = `bigBet`

### 3.4 役判定 (`resolveShowdown`)
- **Hold'em High**:
    - 各プレイヤーのHole Cards(2枚) + Board(5枚) = 計7枚。
    - この7枚から最強の5枚を選ぶ。
    - 既存の `evaluateStudHi` 関数は「任意の枚数からベスト5枚を選ぶ」ロジックになっているため、**そのまま流用可能**。
    - 変更点: 引数として渡すカード配列を `hand.downCards + deal.board` に結合して渡すだけ。

---

## 4. UI実装への影響

### 4.1 テーブル表示
- **Board**: 中央ポット付近に `BoardView` コンポーネントを追加。
- **Hole Cards**: プレイヤーの手元に2枚表示（自分のみ表、他人は裏）。
- **Dealer Button**: プレイヤーパネル付近に `D` マークを表示。

### 4.2 アクション表示
- **Blind表示**: "SB", "BB" などのバッジあるいはベット額表示による識別。

---

## 5. 今後の拡張性 (Omaha 8)
- この設計で、Omaha 8対応時は以下を変更するだけで済む：
    - 手札枚数: 4枚
    - 役判定ロジック: Hand2枚 + Board3枚 の制約付き評価関数を追加。
    - Low判定: 8-or-better (Stud8と同じロジック)。
- Board構造やStreet進行はFLHと完全共通化できる。

