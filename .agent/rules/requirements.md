---
title: プロジェクト要件・ドメイン知識（Requirements & Domain Knowledge）
type: requirements
priority: 2
description: プロジェクト固有の要件、ドメイン知識（ポーカー仕様）
tags: [requirements, domain, poker, game-rules, architecture]
---

# プロジェクト要件・ドメイン知識（Requirements & Domain Knowledge）

## 🎮 プロジェクト概要

Mix Pokerは、Stud Hi / Razz / Stud8の3種類のポーカーゲームをサポートするWebアプリケーションです。

## 🃏 サポートするゲームタイプ

### Stud Hi
- ハイハンド（最強の手）が勝者
- 7枚のカードから5枚を選んで最強の手を作る

### Razz
- ローハンド（最弱の手）が勝者
- A-2-3-4-5が最強（ストレートフラッシュは考慮しない）

### Stud8
- ハイハンドとローハンドの両方を判定
- ポットを分割（ハイハンドとローハンドで別々に勝者を決定）

## 📐 アーキテクチャ原則

### 依存方向の厳守（最重要）
```
ui → app(store/actions) → domain
```

- `domain/` は **React / Zustand / localStorage を一切知らない**
- `ui/` は **ゲームロジックを持たない**
- `app/` は UI と domain の橋渡し役

### State管理の原則
- Gameの正：`GameState`
- Deal進行の正：`DealState`
- 永続化の正：`saveAppState()` を呼んだ結果
- 同じ意味のデータを複数箇所に持たない

## 🎯 ゲーム進行の基本概念

### Streets（ストリート）
- `3rd`: 最初のストリート（3枚のカード）
- `4th`: 4枚目のカード
- `5th`: 5枚目のカード
- `6th`: 6枚目のカード
- `7th`: 最後のストリート（7枚のカード）

### Actions（アクション）
- `FOLD`: フォールド
- `CHECK`: チェック
- `CALL`: コール
- `BET`: ベット
- `RAISE`: レイズ
- `BRING_IN`: ブリングイン（Stud特有）

### Events（イベント）
- ゲームの進行はイベント駆動
- `Event` 型を定義し、`applyEvent` で状態を更新
- 詳細は `docs/mvp/04_イベント設計書.md` を参照

## 🎲 ポーカー仕様の詳細

### Bring-in（ブリングイン）
- Stud Hi / Razz / Stud8で使用
- 3rdストリートで最も弱いアップカードを持つプレイヤーが強制的にベット
- 詳細は `docs/mvp/02_ルール仕様書.md` を参照

### Betting Rounds（ベッティングラウンド）
- 各ストリートでベッティングラウンドが発生
- アクションの順序は `docs/mvp/02_ルール仕様書.md` を参照

### Showdown（ショーダウン）
- 7thストリート終了後、または全員フォールド後に発生
- ハンドの判定とポットの分配
- 詳細は `docs/mvp/05_計算仕様書.md` を参照

## 📊 データ構造

### GameState
- ゲーム全体の状態
- 複数のDealを含む
- 詳細は `docs/mvp/03_状態設計書.md` を参照

### DealState
- 1つのDeal（手札）の状態
- 現在のストリート、アクティブなプレイヤー、ポットなど
- 詳細は `docs/mvp/03_状態設計書.md` を参照

### PlayerHand
- プレイヤーの手札
- `downCards`: 裏向きのカード
- `upCards`: 表向きのカード

## 🔧 実装上の制約

### Pure Functions
- `domain/` 配下の関数は原則としてpure function
- 副作用を持たない
- テストが容易

### Event-Driven
- ゲームの進行はイベント駆動
- 状態の変更は `applyEvent` 経由のみ

### Immutability
- Zustand store内では `immer` の `produce` を使用
- 状態の直接変更を避ける

## 📚 ドキュメント参照

詳細な仕様は `docs/mvp/` ディレクトリを参照してください：

- `01_MVP定義書.md`: MVPの範囲と目標
- `02_ルール仕様書.md`: ポーカーのルール詳細
- `03_状態設計書.md`: GameState/DealStateの構造
- `04_イベント設計書.md`: イベント駆動の設計
- `05_計算仕様書.md`: ポット計算、ハンド判定の計算
- `06_CPU設計書.md`: CPUプレイヤーのロジック
- `07_役判定設計書.md`: ポーカーハンドの判定
- `08_カード配布設計書.md`: カードの配布ロジック
- `09_GameState（Mix全体）設計書.md`: ゲーム全体の状態管理
- `10_AppState 永続化設計.md`: 永続化の仕様
- `11_UI設計ブリーフ.md`: UIの設計方針
- `12_実装計画.md`: 実装の順序と計画

## 🚫 AIに任せない判断

以下の判断は **人間が決めてドキュメント化**し、AIには従わせる：

- **状態の正がどこか**: GameState/DealStateの構造は設計書に従う
- **永続化タイミング**: `docs/mvp/10_AppState 永続化設計.md` に従う
- **ルール解釈（ポーカー仕様）**: `docs/mvp/02_ルール仕様書.md` に従う
- **計算ロジック**: `docs/mvp/05_計算仕様書.md` に従う

## 🔄 仕様変更時の対応

ポーカー仕様やゲームルールを変更する場合：

1. まず `docs/mvp/` 配下の該当ドキュメントを更新
2. 必要に応じて `requirements.mdc`（このファイル）も更新
3. 実装を変更
4. テストを更新・追加
5. Issueに変更内容を記録

## 💡 ドメイン知識の蓄積

新しい知見やベストプラクティスが得られた場合：

1. このファイルに追記
2. 関連する設計書も更新
3. Issueに記録
4. 必要に応じて他のルールファイルも更新
