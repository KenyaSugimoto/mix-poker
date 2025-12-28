---
title: 実装ルール（Implementation Rules）
type: implementation
priority: 2
description: コーディング規約、設計指針、ライブラリのベストプラクティス
tags: [implementation, coding-standards, typescript, react, zustand, zod, vitest, biome, tailwind]
---

# 実装ルール（Implementation Rules）

## 🎨 コーディングスタイル

### 命名規則
- **関数**: アロー関数を優先（`const funcName = () => {}`）
- **型**: PascalCase（`GameState`, `DealState`）
- **変数**: camelCase（`currentDeal`, `playerId`）
- **ファイル**: camelCase（`appStore.ts`, `applyEvent.ts`）

### コメント
- 複雑なロジックには日本語コメントを追加
- 関数の責務が明確でない場合は説明を追加
- テストケースは日本語で記述

## 📐 TypeScript

### ベストプラクティス
- `any` 禁止（`unknown` + Zod で処理）
- union type を積極的に使う（`EventType`, `Screen` など）
- 「値の集合」は enum より union を優先
- 関数はアロー関数（`const func = () => {}`）を優先
- 型定義を先に与えると、AIの出力精度が向上する

### やらないこと
- 型と実装が乖離した抽象化
- domainでの曖昧なoptional多用

### 例
```typescript
export type Screen = "SETUP" | "PLAY" | "HISTORY" | "SETTINGS";
```

## ⚛️ React

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

## 🗄️ Zustand

### ベストプラクティス
- Storeは **UIとdomainの橋渡し**
- State更新は action 経由のみ
- 永続化は **store外のユーティリティ関数**（`persistence.ts`）

```typescript
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

## ✅ Zod

### 役割
- **外部から入る不確実なデータをすべて検証する**
  - localStorage復元
  - SETUP入力
  - 将来のURLパラメータ

### ベストプラクティス
- `loadAppState()` で必ず Zod validation
- validation失敗時は **安全に初期化**

```typescript
const AppStateSchema = z.object({
  version: z.number(),
  ui: UiStateSchema,
  game: GameStateSchema.nullable(),
});
```

### やらないこと
- domain内部でZodを使う（型で十分）
- validation結果を握りつぶす

## 🧪 Vitest

### ベストプラクティス
- domainの pure function を最優先でテスト
- storeフローは次点
- UIテストはMVPでは必須ではない
- **テストケースのタイトル（`describe`, `it`）は日本語で記述する**

```typescript
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

## 🎨 Biome

### ベストプラクティス
- format / lint / check を一本化
- コードスタイルを **人が議論しない**

### 推奨
- 保存時に自動format
- CIで `biome check` を必須化（将来）

### AI駆動のコツ
- 「Biome前提」と伝えると、整形を気にせずロジックに集中できる

## 🎨 Tailwind CSS

### ベストプラクティス
- **ページはレイアウトに集中**し、見た目の粒度はコンポーネント側に寄せる
- `className` が3回以上出る塊はコンポーネント化
- 状態（active/disabled/error）は `clsx` 等で条件分岐
- レスポンシブは `sm/md/lg` の最小限で開始し、MVPは過剰に作り込まない
- 色・余白・角丸・影の"語彙"を固定し、UI全体の統一感を出す

### 推奨デザイントークン（MVPの統一ルール）
- **角丸**: `rounded-xl`（小さくする場合は `rounded-lg`）
- **影**: `shadow-sm`（強調カードのみ `shadow`）
- **余白**: `p-4` を基本、密な領域は `p-3`
- **レイアウト**: `grid` を優先（テーブルUIもgridベースでOK）
- **文字**:
  - 見出し：`text-lg font-semibold`
  - 本文：`text-sm`
  - 補足：`text-xs text-muted-foreground` 相当（色はプロジェクトで定義）

### やらないこと
- コンポーネントごとに色や余白の"ルール"が変わる実装
- inline style の多用（例外：計算値が必要な座標/サイズのみ）
- Tailwindクラスのコピペ増殖（同じパターンが増えたら即コンポーネント化）

### AI駆動のコツ
- 「既存のUI語彙（角丸/影/余白/文字サイズ）に合わせて」と明示する
- 生成物に `className` が長くなる場合は「共通コンポーネント化して」と一緒に指示する

## 🔄 Immer

### 使用箇所
- Zustand store内でのstate更新（`produce` を使用）

### ベストプラクティス
- イミュータブルな更新を簡潔に記述
- ネストしたオブジェクトの更新を安全に行う

## 📚 その他のライブラリ

### @dnd-kit
- ドラッグ&ドロップ機能に使用（将来の実装予定）

### lucide-react
- アイコンライブラリ

### pokersolver
- ポーカーハンドの判定に使用

### tailwind-merge
- Tailwindクラスのマージに使用（`clsx` と組み合わせ）

## 🏗️ アーキテクチャパターン

### Pure Function
- `domain/` 配下の関数は原則としてpure function
- 副作用を持たない
- テストが容易

### Event-Driven
- ゲームの進行はイベント駆動
- `Event` 型を定義し、`applyEvent` で状態を更新

### Immutable Updates
- Zustand store内では `immer` の `produce` を使用
- 状態の直接変更を避ける
