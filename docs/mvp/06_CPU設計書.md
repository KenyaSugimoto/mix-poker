# 06_CPU設計書.md

## 1. 目的
本書は、CPUプレイヤーが `DealState` をもとに **合法なアクションを選択する仕組み**を定義する。  
MVPでは「強さ」よりも **正しさ・拡張性・テスト容易性**を優先する。

---

## 2. 基本方針

### 2.1 CPUは State を直接書き換えない
- CPUは **Eventを返すだけ**
- State更新は必ず `applyEvent` 経由で行う

### 2.2 CPUは allowedActions を唯一の制約とする
- CPUは `getAllowedActions(state, seat)` の結果からのみ選択する
- ルール違反は **CPUロジックではなく allowedActions 側で防ぐ**

### 2.3 段階的レベル設計
- Lv0：完全ルールベース（ランダム寄り）
- Lv1：簡易ヒューリスティック（将来）
- GTO / 強AIは MVP 対象外

---

## 3. CPUインターフェース設計

### 3.1 基本インターフェース

```ts
export interface CpuDecisionContext {
  state: DealState;
  seat: SeatIndex;
  allowedActions: ActionType[];
}

export interface CpuStrategy {
  decide(ctx: CpuDecisionContext): ActionType;
}
```

- CPUは **ActionType を1つ返す**
- amount 計算は **エンジン側（Event生成時）**の責務

---

## 4. ActionType 一覧（前提）

```ts
export type ActionType =
  | "POST_ANTE"
  | "BRING_IN"
  | "COMPLETE"
  | "BET"
  | "RAISE"
  | "CALL"
  | "CHECK"
  | "FOLD";
```

※ STREET_ADVANCE / DEAL_END は CPU が直接選ばない

---

## 5. Lv0 CPU（MVP）

### 5.1 コンセプト
- **常に合法**
- **状況に応じて極端な行動は避ける**
- 勝とうとしない（＝進行確認用）

### 5.2 行動優先度（共通）

CPUは allowedActions の中から、以下の優先度で選択する。

1. CHECK（可能なら最優先）
2. CALL
3. BRING_IN
4. COMPLETE
5. BET
6. RAISE
7. FOLD（最後の手段）

※ 「安い行動ほど優先」という思想

---

## 6. Lv0 行動ロジック（擬似コード）

```ts
export const cpuLv0: CpuStrategy = {
  decide({ allowedActions }) {
    if (allowedActions.includes("CHECK")) return "CHECK";
    if (allowedActions.includes("CALL")) return "CALL";
    if (allowedActions.includes("BRING_IN")) return "BRING_IN";
    if (allowedActions.includes("COMPLETE")) return "COMPLETE";
    if (allowedActions.includes("BET")) return "BET";
    if (allowedActions.includes("RAISE")) return "RAISE";
    return "FOLD";
  },
};
```

---

## 7. 3rd Street における CPU の振る舞い

### 7.1 bring-in 対象者（初手）
- allowedActions は以下のいずれか：
  - BRING_IN
  - COMPLETE
- Lv0 では **BRING_IN を優先**
  - （最安アクション）

### 7.2 bring-in 後の他プレイヤー
- allowedActions：
  - CALL / COMPLETE / FOLD
- Lv0 では **CALL を優先**

### 7.3 bring-in が一周した場合
- bring-in 対象者にアクションは回らない
- CPU は関与しない（エンジンが自動で STREET_ADVANCE）

---

## 8. 4th 以降の CPU の振る舞い

### 8.1 check フェーズ（currentBet === 0）
- allowedActions：
  - CHECK / BET
- Lv0 では **CHECK を優先**
  - 全員CHECK → ストリート終了

### 8.2 攻撃フェーズ（currentBet > 0）
- allowedActions：
  - CALL / RAISE / FOLD
- Lv0 では **CALL を優先**

---

## 9. amount 計算の責務分離（重要）

CPUは **金額を一切計算しない**。

- CPU：ActionType を返す
- エンジン：
  - ActionType + DealState から Event を生成
  - 05_計算仕様書に従って amount を算出

例：

```ts
const action = cpu.decide({ state, seat, allowedActions });
const event = createEventFromAction(action, state, seat);
applyEvent(state, event);
```

---

## 10. 将来拡張（Lv1 以降の方向性）

### 10.1 Lv1 の例（非MVP）
- toCall が bigBet のときは FOLD しやすくする
- CHECK ができないときだけ CALL
- RAISE は低頻度（例：10%）

### 10.2 情報追加後
- アップカード
- ダウンカード
- 役の強さ
- ストリート進行
- プレイヤー人数

を context に足すことで自然に拡張可能。

---

## 11. テスト観点（Vitest）

- CPU は常に allowedActions 内の ActionType を返す
- CHECK が可能なときは必ず CHECK を返す
- CALL が可能で CHECK が不可なときは CALL を返す
- allowedActions が1つのとき、そのアクションを返す
- 3rd bring-in 一周時に CPU が呼ばれないこと

---

## 12. 次のドキュメント
- 07_役判定設計書.md
- 08_GameState（Mix全体）設計書.md
