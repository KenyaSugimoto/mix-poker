# Implementation Plan - Mix Game App (Phase 1: Stud Hi)

Mixゲームアプリ（まずはSeven Card Stud Hi）のMVP実装計画です。
内部設計書で定義したFeature-basedな構成に基づき、段階的に実装を進めます。

## User Review Required
> [!IMPORTANT]
> **デザインシステムの確認**: 実装開始直後に簡単なボタンやカードのUIコンポーネントを作成し、ダークモード/高級感の方向性が合致しているか確認することをお勧めします。

## Proposed Changes

### 1. Project Setup & Infrastructure
開発環境と基本的なツールチェーンを整備します。

#### [NEW] [Project Config]
- `vite.config.ts`: Alias設定 (`@/*` -> `src/*`).
- `biome.json`: Linter/Formatter設定.
- `tailwind.config.js`: カラーパレット定義 (Dark Luxury theme).
- `.gitignore`: 標準的な設定.
- `src/types/index.ts`: 共通型定義のプレースホルダー.

### 2. Core Poker Logic (Domain Layer)
UIに依存しない純粋なポーカーロジックを実装します。TDD（テスト駆動）推奨。

#### [NEW] src/lib/poker/
- `card.ts`: `Card`, `Suit`, `Rank` 型とユーティリティ (`createDeck`, `shuffle`).
- `handEvaluator.ts`: 7枚のカードから役を判定し、強さを比較するロジック（MVPでは外部ライブラリ `pokersolver` 等の利用も検討、または簡易実装）.
- `studRules.ts`: `determineBringIn`, `getLegalActions` などのルールロジック.
- `potManager.ts`: サイドポット計算ロジック（複雑なため分離）.

### 3. State Management (Application Layer)
Zustandを使用したゲーム状態管理を実装します。

#### [NEW] src/features/game/
- `store/gameStore.ts`: `GameState` を持ち、アクションをDispatchするZustandストア.
- `store/selectors.ts`: UIでのレンダリング最適化用セレクタ.
- `hooks/useGame.ts`: コンポーネントからストアを利用するためのカスタムフック.

### 4. UI Components (Presentation Layer)
Atomic Designを意識しつつ、ゲーム固有のコンポーネントを作成します。

#### [NEW] src/components/ui/ (Atoms)
- `Button.tsx`: 汎用ボタン (Primary, Secondary, Action).
- `Card.tsx`: トランプ描画 (SVG使用, FaceUp/Down).
- `Chip.tsx`: チップ描画.
- `Avatar.tsx`: プレイヤーアイコン.

#### [NEW] src/components/game/ (Organisms)
- `Table.tsx`: メインテーブルレイアウト (Racetrack).
- `Seat.tsx`: プレイヤー情報の表示コンテナ (Hand, Chips, Avatar, ActionBubble).
- `HandContainer.tsx`: Stud特有のカード並び (Overlapping).
- `ActionPanel.tsx`: アクションボタン群.
- `GameInfo.tsx`: Pot, Street表示.
- `WinAnimation.tsx`: 勝利時のエフェクト.

### 5. Integration & Game Loop
ロジックとUIを結合し、ゲーム進行を実装します。

#### [NEW] src/features/stud/
- `StudGameEngine.ts`: ストアのアクションから呼ばれる実際の進行処理 (Deal -> Betting -> Next Street).
- `CPUStrategy.ts`: 簡易CPUロジック.

### 6. App Entry & Global Styles
#### [MODIFY] src/
- `App.tsx`: ルーティングとメインレイアウト.
- `index.css`: Tailwindのカスタムスタイル, フォント設定.

## Verification Plan (検証計画)

### Automated Tests
- **Logic Tests**: `vitest` を使用して `lib/poker/*` のロジックを徹底的にテストする。
  - ハンド判定が正しいか？
  - サイドポット計算が正しいか？
  - 有効アクション判定が正しいか？

### Manual Verification
- **Visual Check**: Storybook（今回は導入しないが、ダミーデータでの表示確認を行う）でUI崩れがないか確認。
- **Game Flow**:
  1. 2人〜7人でゲーム開始できるか。
  2. アクションが順番通り回るか。
  3. チップ計算がズレないか。
  4. 勝判定とポット分配が正しいか。
  5. **Mobile View**: スマホ実機またはDevToolsでレイアウト崩れがないか。
