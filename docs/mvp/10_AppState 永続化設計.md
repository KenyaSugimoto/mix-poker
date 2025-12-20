# 10_AppState / 永続化設計.md

## 1. 目的
本書は、アプリ全体状態（AppState）の構造と、**手動永続化（localStorage）**による保存・復元方針を定義する。  
MVPは「フロント完結」を前提とし、サーバ同期は行わない。

---

## 2. スコープ
対象：
- AppState（画面/UI状態 + 現在のGameState）
- localStorage への手動保存 / 復元
- 保存データのバージョニング（将来のマイグレーション前提）
- データ破損時のリカバリ指針

対象外（将来）：
- マルチ端末同期
- ログイン/アカウント
- 暗号化（必要になった時点で検討）

---

## 3. 設計方針

### 3.1 Single Source of Truth
- ゲーム進行の真実は `AppState.game`（= GameState）とする
- Deal進行は `DealState` に対する Event 適用のみで更新される（03〜06）

### 3.2 永続化は「頻度を抑え、壊れても復旧できる」ことを最優先
- Zustand の `persist` は使用しない
- 永続化は **重要イベント発生時のみ手動で実行**する
- localStorage の破損・容量制限・手動削除を前提とする

### 3.3 履歴は要約を正とし、フルデータは補助ストレージとして扱う
- 履歴の正は `GameState.dealHistory: DealSummary[]`
- フルデータ（Deck/Hands/Event等）は **直近分のみ保持**し、履歴とは分離する

---

## 4. AppState 構造

### 4.1 UI状態（MVP）

```ts
export type Screen =
  | "SETUP"
  | "PLAY"
  | "HISTORY"
  | "SETTINGS";

export interface UiState {
  screen: Screen;
  selectedDealId: string | null;

  // 将来拡張
  displayUnit: "points" | "bb";
}
```

---

### 4.2 補助ストレージ（フル保存・お気に入り）

```ts
export interface FullStore {
  // 直近フル保存のディールID（新しい順、最大10）
  fullDealIds: string[];

  // フル保存本体（key = dealId）
  fullDealsById: Record<string, DealState>;

  // お気に入り（最大50）
  favoriteDealIds: string[];
}
```

---

### 4.3 AppState 本体

```ts
export interface AppState {
  version: number; // 永続化データのスキーマバージョン
  ui: UiState;

  // メインデータ
  game: GameState | null;

  // 補助ストレージ
  fullStore: FullStore;

  // 復元失敗時の情報
  lastLoadError: string | null;
}
```

---

## 5. 永続化データ（localStorage）

### 5.1 保存キー / バージョン
```ts
export const STORAGE_KEY = "mix-poker:appState";
export const STORAGE_VERSION = 1;
```

### 5.2 保存対象
- `AppState` をそのまま JSON 化して保存する
- 一時的UI状態（トースト等）は State に含めない

---

## 6. 永続化方式（方式A：手動保存）

### 6.1 基本方針
- Zustand の `persist` は使用しない
- **保存は明示的に `saveAppState()` を呼んだときのみ行う**
- 保存頻度は重要イベント時に限定する（後述）

### 6.2 保存 / 復元ユーティリティ

```ts
export const saveAppState = (state: AppState) => {
  const payload = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, payload);
};

export const loadAppState = (): AppState | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as AppState;
  return parsed;
};
```

※ version/migration が必要になった時点でここに処理を追加する

---

## 7. 履歴・フル保存・お気に入りの方針

### 7.1 履歴（要約）
- `GameState.dealHistory: DealSummary[]` を履歴の正とする
- 最大200件（新しい順）
- ディール終了時に必ず1件追加し、200件に slice する

### 7.2 フル保存（直近）
- 直近10ディールのみフル保存する
- フル保存対象：
  - Deck
  - Hands
  - Event / Log 等（DealState 全体）

### 7.3 お気に入り（ルール案A）
- お気に入り登録できるのは **フル保存が存在するディールのみ**
- つまり、直近10に存在するディールのみ「お気に入りON」可能
- お気に入りは最大50件
- フル保存が削除されたディールは、お気に入り不可

---

## 8. Eviction（フル保存の追い出し）

```ts
const MAX_FULL_RECENT = 10;
const MAX_FAVORITE = 50;

const evictFullDeals = (s: AppState) => {
  const keepIds = new Set<string>(s.fullStore.fullDealIds);

  for (const id of Object.keys(s.fullStore.fullDealsById)) {
    if (!keepIds.has(id)) {
      delete s.fullStore.fullDealsById[id];
    }
  }
};
```

- `fullDealIds` は常に最大10
- `fullDealsById` は `fullDealIds` に含まれるもののみ保持する
- お気に入りは **フルが存在することが前提**（フルを延命しない）

---

## 9. 保存タイミング（保存頻度）

### 9.1 保存するタイミング
- 以下のイベント適用完了後にのみ `saveAppState()` を呼ぶ：
  - `STREET_ADVANCE`
  - `DEAL_END`（ディール終了確定処理の最後）

### 9.2 保存しないタイミング
- BET / CALL / RAISE / FOLD 等のアクション単位では保存しない
- 理由：
  - パフォーマンス安定
  - 保存サイズ増加防止
  - 中途半端な状態の保存を避ける

---

## 10. ディール終了時の更新フロー（要点）

ディール終了確定時に必ず以下を実行する：

1. `DealSummary` を生成
2. `game.dealHistory` に先頭追加 → 最大200件に slice
3. `DealState` をフル保存として `fullStore.fullDealsById` に追加
4. `fullDealIds` を更新（先頭追加 → 最大10）
5. `evictFullDeals()` を実行
6. `saveAppState()` を実行（DEAL_END保存）

※ フル → 要約移行のための再計算は不要  
（要約は終了時に既に生成されている）

---

## 11. 破損・復元失敗時の扱い

### 11.1 想定する失敗
- JSON parse 失敗
- 手動削除 / 容量超過
- 将来のバージョン不整合

### 11.2 リカバリ方針（MVP）
- 復元失敗時：
  - `lastLoadError` にメッセージを入れる
  - `game = null` として SETUP 画面へ遷移
- SETTINGS 画面から「全データ削除」を可能にする

---

## 12. テスト観点（Vitest）
- save / load で AppState が一致する
- STREET_ADVANCE / DEAL_END でのみ保存される
- dealHistory が最大200件で維持される
- fullDealIds が最大10で維持される
- フルが無いディールはお気に入り登録できない
- フル保存削除後に favorite が残らない

---

## 13. 次のドキュメント
- 11_UI設計ブリーフ.md（画面一覧・ユーザーフロー・状態・コンポーネント）
- 12_実装計画.md（フォルダ構成、実装順、テスト戦略）
