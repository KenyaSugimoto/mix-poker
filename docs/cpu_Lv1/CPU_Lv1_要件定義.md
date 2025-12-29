# CPU_Lv1_要件定義.md

## 1. 目的
本書は、既存の Lv0 CPU（CHECK/CALL優先）を拡張し、MVP範囲内で「堅実に降りる」方向の **Lv1 CPU戦略**を定義する。
Lv1は“強AI”ではなく、**軽量ヒューリスティック**で合法なアクションを選択する。

## 2. スコープ
### 2.1 対象
- 対象ゲーム: StudHi / Razz / Stud8
- 対象ストリート: 3rd / 4th / 5th / 6th / 7th
- CPUの出力: ActionType（POST_ANTE/BRING_IN/COMPLETE/BET/RAISE/CALL/CHECK/FOLD）

### 2.2 非対象（今回やらない）
- 厳密な勝率計算、モンテカルロ大量試行、レンジ推定、相手適応
- UI改修（ただし、将来の難易度追加に備えたパラメータ枠は内部に用意する）
- amount（金額）計算（既存どおりエンジン側の責務）

## 3. 重要方針
### 3.1 公平性（必須）
CPUは以下を参照してはならない：
- 他プレイヤーの downCards
- deck（残りデッキ）
- rngSeed（シャッフル復元に利用され得る情報）

CPUが参照して良い情報は以下のみ：
- 自分の downCards + upCards
- 全員の upCards（公開情報）
- DealStateの進行情報（street/pot/currentBet/raiseCount/playersのstack/committedThisStreet/active など）

> 実装上は「観測可能情報（Observation）」を組み立ててCPUに渡すことで、構造的に参照不可能にすることを推奨。

### 3.2 合法性（必須）
- CPUは `allowedActions` の中からのみ選択する。
- `allowedActions` は CPUが選択可能な ActionType の集合であること（STREET_ADVANCE / DEAL_END 等は除外される前提）。

> 現状 `CpuDecisionContext.allowedActions: EventType[]` となっている場合、型として広すぎるため、
> - A) `ActionType[]` に修正する
> - B) あるいは `allowedActions` をCPU前に ActionType にフィルタする
> のいずれかを必須対応とする。

### 3.3 戦略指向（必須）
- 方針: (a) 堅実に降りる（破産しない）寄り
- big bet（5th+）やマルチウェイ（多人数）では要求ハンド強度を上げ、無理コールを減らす

### 3.4 混合戦略（任意だが今回採用）
- ブラフ/セミブラフは **かなり低頻度**で許容する
- 再現性（seed固定）は不要（Math.random等で良い）
- ただしテスト容易性のため `rng()` を差し替え可能にすることを推奨

## 4. 入出力（既存I/Fを尊重）
### 4.1 既存インターフェース（現状）
- CpuDecisionContext:
  - state: DealState
  - seat: SeatIndex
  - allowedActions: EventType[]（要改善余地あり）
- decide(ctx): ActionType を返す

### 4.2 内部I/F（Observation）
公平性を担保するため、DealStateを直接渡すのではなく、以下の `Observation` を生成してCPUに渡すことを必須とする。

```typescript
// CPUが観測して良い情報のみに絞った構造体
export interface Observation {
  gameType: GameType;
  street: Street;
  pot: number;
  currentBet: number;
  raiseCount: number;
  
  // プレイヤー情報（自分含む全員の公開情報）
  players: {
    seat: SeatIndex;
    active: boolean;
    stack: number;
    committedThisStreet: number;
    upCards: Card[]; // 全員の表向きカード
    actionHistory: ActionType[]; // このストリートでのアクション履歴（任意）
  }[];

  // 自分の非公開情報
  me: {
    seat: SeatIndex;
    hand: Card[]; // downCards + upCards (全ての既知カード)
  };
}
```

### 4.3 入出力定義
- **Input**:
  - `observation`: Observation
  - `allowedActions`: ActionType[] (EventType[]ではなく、CPU用にフィルタ済みのActionType配列)
- **Output**:
  - `ActionType`: 選択されたアクション

> 実装上の注意: `CpuDecisionContext` の `allowedActions` は `ActionType[]` に修正すること。


## 5. 受け入れ条件（Done定義）
### 5.1 機能
- CPUが CHECK/CALL 以外に以下を状況に応じて使用する：
  - BRING_IN / COMPLETE（3rd）
  - BET（4th+ currentBet=0）
  - RAISE（4th+ currentBet>0、強い局面のみ）
  - FOLD（高コスト + 弱い局面で発生）

### 5.2 正しさ
- 常に allowedActions 内のアクションを返す
- 公平性違反（他人downCards / deck / rngSeed 参照）が構造上・テスト上の双方で防止されている

### 5.3 安定性
- 多数回の自動進行（例: 数百〜千ディール相当）で例外・停止が発生しない（回帰テスト観点）

## 6. 依存ドキュメント・コード
- docs/mvp/06_CPU設計書.md（既存Lv0と責務分離）
- docs/mvp/05_計算仕様書.md（amount計算はエンジン責務）
- `src/domain/showdown/resolveShowdown.ts` (役判定・ランク変換ロジックの参照先)
