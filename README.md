# Mix Poker

ポーカーのMixゲーム（Stud系）をCPU対戦で遊べるWebアプリケーションです。

## 概要

Mix Pokerは、フロントエンド完結型のポーカーゲームアプリです。人間プレイヤーとCPUプレイヤーが対戦でき、Stud系の3種目（Stud Hi / Razz / Stud8）をプレイできます。

## 主な機能

- **CPU対戦**: 人間プレイヤー vs CPU（1〜6人）の対戦
- **複数種目対応**: Stud Hi、Razz、Stud8の3種目に対応
- **Mixゲーム**: 複数の種目を順番にプレイ可能
- **履歴保存**: ハンド履歴をlocalStorageに保存（最大200件、直近10件はフル保存）
- **ルール準拠**: 正しいポーカールールに基づいたゲーム進行

## 技術スタック

- **フレームワーク**: React 19 + TypeScript
- **ビルドツール**: Vite
- **状態管理**: Zustand
- **スタイリング**: Tailwind CSS
- **テスト**: Vitest
- **フォーマッタ**: Biome
- **その他**: Immer, Zod, pokersolver

## セットアップ

### 必要な環境

- Node.js (推奨バージョン: 18以上)
- npm または yarn

### インストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

## 開発コマンド

```bash
# テスト実行
npm test

# テストをウォッチモードで実行
npm run test:watch

# リントチェック
npm run lint

# リント自動修正
npm run lint:fix

# フォーマット
npm run format
```

## プロジェクト構造

```
src/
├── app/              # アプリケーション層（ストア、型定義）
├── domain/           # ドメイン層（ゲームロジック、ルール、エンジン）
│   ├── cards/        # カード配布
│   ├── cpu/          # CPU意思決定ロジック
│   ├── engine/       # イベント適用エンジン
│   ├── rules/        # ルール判定
│   ├── showdown/     # ショーダウン処理
│   └── types/        # ドメイン型定義
└── ui/               # UI層（コンポーネント、ページ）
    ├── components/   # 再利用可能なコンポーネント
    ├── pages/        # ページコンポーネント
    └── utils/        # UIユーティリティ

docs/                 # 設計ドキュメント
test/                 # テストファイル
```

## ドキュメント

詳細な設計ドキュメントは [`docs/mvp/`](./docs/mvp/) を参照してください。

- [MVP定義書](./docs/mvp/01_MVP定義書.md)
- [ルール仕様書](./docs/mvp/02_ルール仕様書.md)
- [状態設計書](./docs/mvp/03_状態設計書.md)
- [イベント設計書](./docs/mvp/04_イベント設計書.md)
- その他の設計書は [`docs/mvp/README.md`](./docs/mvp/README.md) を参照

## AIエージェント向けのルール設定

本プロジェクトでは、AIエージェント（Cursor, Antigravity/Gemini Code Assistなど）が適切なコーディング規約やドメイン知識に基づいて開発を行えるよう、プロジェクト独自のルールを定義しています。

- **Cursor**: `.cursor/rules/` 配下に各カテゴリ別のルールファイル（`.mdc`）が格納されています。
- **Antigravity**: `.agent/rules/general_rule.md` が設定されており、Cursorと同じルールを参照するよう構成されています。

AIエージェントを利用して開発を行う際は、最初に `.cursor/rules/general.mdc` を読み込ませることで、プロジェクト全体の指針を共有できます。

## ライセンス

このプロジェクトはプライベートプロジェクトです。
