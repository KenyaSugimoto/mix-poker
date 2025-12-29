# 内部設計書 (Internal Design Document)

## 1. アーキテクチャ概要
- **パターン**: Flux Architecture (via Zustand) + Domain Driven Design (Lightweight)
- **方針**:
  - ゲームロジック (Domain) と ビュー (UI) の完全分離。
  - 将来のMixゲーム対応を見据え、ゲーム進行エンジンを抽象化する。

## 2. ディレクトリ構成案
Feature-basedな構成を採用し、ゲーム種目ごとの拡張性を高める。

```text
src/
├── assets/          # Images, Sounds
├── components/      # UI Components (Presentational)
│   ├── ui/          # Generic UI (Button, Card, Chip) - Atom/Molecule
│   └── game/        # Game Specific (Table, Seat, ActionPanel) - Organism
├── features/        # Game Features
│   ├── game/        # Core Game Logic Setup
│   │   ├── hooks/   # React integration
│   │   └── store/   # Zustand Store
│   └── stud/        # Stud Specific Logic
├── lib/             # Utilities
│   ├── poker/       # Poker Domain (Card, Deck, HandEvaluator)
│   └── styles/      # Tailwind utils
└── types/           # TypeScript Definitions
```

## 3. データモデル設計 (Domain Models)

### 3.1 コアエンティティ (`types/poker.ts`)
```typescript
type Suit = 's' | 'h' | 'd' | 'c';
type Rank = '2' | '3' | ... | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique id for list rendering
}

interface Player {
  id: string;
  name: string;
  chips: number; // スタック量
  isHuman: boolean;
  isActive: boolean; // Foldしたかどうか
  hand: Card[]; // 現在の手札
  lastAction: string | null; // UI表示用 ("Bet $10", "Fold" etc.)
}
```

### 3.2 ゲームステート (`types/gameState.ts`)
Zustandストアで管理するメインの状態オブジェクト。

```typescript
type GameStatus = 'idle' | 'running' | 'showdown' | 'finished';
type Street = 'ante' | '3rd' | '4th' | '5th' | '6th' | '7th'; // Stud specific

interface GameState {
  // Global Info
  status: GameStatus;
  gameType: 'stud_hi';

  // Table Info
  players: Player[];
  dealerPosition: number; // Studでは配り始め位置 or Bring-in管理用
  activePlayerIndex: number | null; // 現在アクション待ちのプレイヤー

  // Pot & Betting
  pot: number;
  currentStreet: Street;
  streetBets: number; // 現在のストリートでのベット額 (Call額の基準)
  minRaise: number;   // 最小レイズ額

  // Actions
  lastAction: { playerIndex: number; type: ActionType; amount: number } | null;

  // History (Optional for Undo/Logs)
  log: string[];
}
```

## 4. クラス設計 / ロジック分割

### 4.1 Game Engine Interface
Mixゲーム対応のため、共通インターフェースを意識する。（今回は実装せずとも設計として定義）

```typescript
interface IGameEngine {
  initialize(players: Player[]): GameState;
  nextStreet(state: GameState): GameState;
  handleAction(state: GameState, action: Action): GameState;
  evaluateHands(players: Player[]): Winner[];
}
```

### 4.2 Stud Logic Module (`features/stud/logic.ts`)
純粋関数として実装し、テスタビリティを確保する。
- `dealInitialCards(deck, players)`
- `determineBringIn(players)`: 3rdストリート開始時のアクションプレイヤー決定(一番低いアップカード)。
- `getLegalActions(state, playerIndex)`: 現在の状態から可能なアクションを返す (要件3.1のロジック)。
- `calculatePotDistribution(players)`: ショウダウン時の分配。

## 5. データフロー (Action Handling)
1. UserがUIでボタンをClick。
2. `useGameStore.actions.performAction({ type: 'fold' })` をDispatch。
3. `performAction` 内部で:
   - バリデーション (自分のターンか？そのアクションは有効か？)。
   - State更新 (Chips減算, Pot加算, Action履歴追加)。
   - `nextTurn()` を呼び出し、次のプレイヤーへ移動。
     - 次がCPUなら、`CPUStrategy` を呼び出して少し遅延後にAction実行。
     - 全員のアクション完了なら `nextStreet()` へ。

## 6. CPUロジック設計
- **BasicStrategy**:
  - `think(state, myIndex): Action`
  - ルールベースで判定:
    - `HandEvaluator` で現在のハンド強さを数値化 (0.0 - 1.0)。
    - 閾値判定: `strength > 0.8` -> Raise, `strength < 0.2` -> Fold (unless checkable)。
