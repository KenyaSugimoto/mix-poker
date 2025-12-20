# 開発方針・ベストプラクティス（AI駆動開発）

## 1. 本ドキュメントの目的
本書は、AI駆動開発（ChatGPT / Copilot / Cursor 等）を前提に、  
本プロジェクトで採用する技術スタックの **使い方・責務・禁止事項** を明確化する。

- AIに「何を任せて良いか / 任せてはいけないか」を明示する
- 実装時の判断基準をドキュメントとして固定する
- MVP実装中に設計がブレるのを防ぐ

---

## 2. 全体原則（最重要）

### 2.1 依存方向の厳守
```
ui  →  app(store/actions)  →  domain
```

- `domain/` は **React / Zustand / localStorage を一切知らない**
- `ui/` は **ゲームロジックを持たない**
- AIにコード生成を依頼する際も、この依存方向を必ず守らせる

### 2.2 Stateは「正を1箇所」に持つ
- Gameの正：`GameState`
- Deal進行の正：`DealState`
- 永続化の正：`saveAppState()` を呼んだ結果

同じ意味のデータを複数箇所に持たない。

---

## 3. React + Vite

### ベストプラクティス
- 関数コンポーネントのみ使用
- `ui/pages` は **画面単位**
- `ui/components` は **再利用可能な部品のみ**
- 状態取得は **store selector 経由**

```tsx
const deal = useAppStore((s) => s.game?.currentDeal);
```

### やらないこと
- コンポーネント内でビジネスロジックを持つ
- domain関数を直接importして状態を変更する
- useEffectでゲーム進行を制御する（store側の責務）

### AIに任せやすい領域
- JSX構造
- レイアウト
- 表示条件分岐

---

## 4. TypeScript

### ベストプラクティス
- `any` 禁止（unknown + Zod で処理）
- union type を積極的に使う（EventType, Screen など）
- 「値の集合」は enum より union を優先
- 関数はアロー関数（`const func = () => {}`）を優先

```ts
export type Screen = "SETUP" | "PLAY" | "HISTORY" | "SETTINGS";
```

### やらないこと
- 型と実装が乖離した抽象化
- domainでの曖昧なoptional多用

### AI駆動のコツ
- 型定義を先に与えると、AIの出力精度が跳ね上がる
- 「この関数は pure function」と明示すると良い

---

## 5. Zustand（persist不使用）

### ベストプラクティス
- Storeは **UIとdomainの橋渡し**
- State更新は action 経由のみ
- 永続化は **store外のユーティリティ関数**

```ts
applyDealEvent(event) {
  set((state) => {
    // domain.applyEvent を呼ぶ
  });

  if (event.type === "STREET_ADVANCE" || event.type === "DEAL_END") {
    saveAppState(get());
  }
}
```

### やらないこと
- persist middleware の使用
- UIから直接 localStorage を触る
- domain関数内で store を import する

### AIに任せやすい領域
- store action の雛形
- selector定義

---

## 6. Zod（必須）

### 役割
- **外部から入る不確実なデータをすべて検証する**
  - localStorage復元
  - SETUP入力
  - 将来のURLパラメータ

### ベストプラクティス
- `loadAppState()` で必ず Zod validation
- validation失敗時は **安全に初期化**

```ts
const AppStateSchema = z.object({
  version: z.number(),
  ui: UiStateSchema,
  game: GameStateSchema.nullable(),
});
```

### やらないこと
- domain内部でZodを使う（型で十分）
- validation結果を握りつぶす

### AI駆動のコツ
- 「このデータはZodで検証する」と明示すると、AIが勝手に any を使わなくなる

---

## 7. Vitest

### ベストプラクティス
- domainの pure function を最優先でテスト
- storeフローは次点
- UIテストはMVPでは必須ではない
- **テストケースのタイトル（`describe`, `it`）は日本語で記述する**

```ts
describe("allowedActions", () => {
  it("3rd bring-in後の選択肢が正しい", () => {
    // arrange / act / assert
  });
});
```

### やらないこと
- UIとdomainを同時にテスト
- localStorageを実体で触る（必ずmock）

### AIに任せやすい領域
- テストケースの網羅列挙
- Given/When/Then構造の整理

---

## 8. Biome

### ベストプラクティス
- format / lint / check を一本化
- コードスタイルを **人が議論しない**

### 推奨
- 保存時に自動format
- CIで `biome check` を必須化（将来）

### AI駆動のコツ
- 「Biome前提」と伝えると、整形を気にせずロジックに集中できる

---

## 9. Tailwind CSS（追加）

### 役割
- UI実装の速度を上げる（MVPでの試行回数を増やす）
- デザインのブレを「規約」で抑える（AI出力の一貫性を確保）

### ベストプラクティス
- **ページはレイアウトに集中**し、見た目の粒度はコンポーネント側に寄せる
- `className` は長くなりがちなので、以下を徹底する：
  - 3回以上出る塊はコンポーネント化（例：Card, Panel, Badge）
  - 状態（active/disabled/error）は `clsx` 等で条件分岐（導入する場合のみ）
- レスポンシブは `sm/md/lg` の最小限で開始し、MVPは過剰に作り込まない
- 色・余白・角丸・影の“語彙”を固定し、UI全体の統一感を出す

### 推奨デザイントークン（MVPの統一ルール）
- 角丸：`rounded-xl`（小さくする場合は `rounded-lg`）
- 影：`shadow-sm`（強調カードのみ `shadow`）
- 余白：`p-4` を基本、密な領域は `p-3`
- レイアウト：`grid` を優先（テーブルUIもgridベースでOK）
- 文字：
  - 見出し：`text-lg font-semibold`
  - 本文：`text-sm`
  - 補足：`text-xs text-muted-foreground` 相当（色はプロジェクトで定義）

### やらないこと
- コンポーネントごとに色や余白の“ルール”が変わる実装
- inline style の多用（例外：計算値が必要な座標/サイズのみ）
- Tailwindクラスのコピペ増殖（同じパターンが増えたら即コンポーネント化）

### AI駆動のコツ
- 「既存のUI語彙（角丸/影/余白/文字サイズ）に合わせて」と明示する
- 生成物に `className` が長くなる場合は「共通コンポーネント化して」と一緒に指示する

---

## 10. AI駆動開発における運用ルール

### 10.1 AIに依頼するときのテンプレ
- どの層か（ui / store / domain）
- pure function かどうか
- 副作用の有無
- テスト対象かどうか

### 10.2 AIに任せない判断
- 状態の正がどこか
- 永続化タイミング
- ルール解釈（ポーカー仕様）

これらは **人間が決めてドキュメント化**し、AIには従わせる。

---

## 11. このドキュメントの位置づけ
- 本書は **12_実装計画.md より上位**
- 実装中に迷ったら本書を正とする
- 技術追加（Immer / Router 等）は本書に追記してから導入する

---

