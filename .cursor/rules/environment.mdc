---
title: 環境設定ルール（Environment Rules）
type: environment
priority: 2
description: 環境設定、ディレクトリ構造、実行コマンドに関するルール
tags: [environment, setup, commands, directory-structure]
---

# 環境設定ルール（Environment Rules）

## 📁 ディレクトリ構造

```
mix-poker/
├── src/
│   ├── domain/          # ゲームロジック（pure functions）
│   │   ├── cards/       # カード配布ロジック
│   │   ├── cpu/         # CPUプレイヤーのロジック
│   │   ├── engine/      # イベント適用エンジン
│   │   ├── rules/       # ゲームルール（actor, allowedActions, bet, street）
│   │   ├── showdown/    # ショーダウン処理
│   │   ├── types/       # 型定義
│   │   └── utils/       # ユーティリティ
│   ├── app/
│   │   └── store/       # Zustand storeと永続化
│   └── ui/
│       ├── components/ # Reactコンポーネント
│       ├── pages/       # 画面単位のコンポーネント
│       └── utils/       # UIユーティリティ
├── test/                # テストファイル（srcと同じ構造）
├── docs/                # ドキュメント
└── dist/                # ビルド出力（gitignore対象）
```

## 🛠️ 実行コマンド

### 開発サーバー起動
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### テスト実行
```bash
npm run test          # 一度だけ実行
npm run test:watch    # ウォッチモード
```

### Lint/Format
```bash
npm run lint          # Lintチェック
npm run lint:fix      # Lint自動修正
npm run format        # フォーマット
```

### プレビュー
```bash
npm run preview       # ビルド結果のプレビュー
```

## 🔧 技術スタック

### ランタイム
- **Node.js**: 最新のLTSバージョン推奨
- **npm**: package-lock.jsonを使用

### ビルドツール
- **Vite**: 7.2.4
- **TypeScript**: 5.9.3

### 主要ライブラリ
- **React**: 19.2.0
- **Zustand**: 5.0.9（状態管理）
- **Zod**: 4.2.1（バリデーション）
- **Immer**: 11.0.1（イミュータブル更新）
- **Vitest**: 4.0.15（テスト）
- **Biome**: 2.3.8（Lint/Format）
- **Tailwind CSS**: 4.1.18

## 📦 依存関係の管理

- `package.json` と `package-lock.json` を必ずコミット
- 依存関係の追加・更新時は、`npm install` 後にテストを実行して動作確認
- メジャーバージョンアップは慎重に検討（破壊的変更の可能性）

## 🗂️ ファイル命名規則

- **TypeScriptファイル**: camelCase（`appStore.ts`, `applyEvent.ts`）
- **Reactコンポーネント**: PascalCase（`SeatPanel.tsx`, `ActionPanel.tsx`）
- **テストファイル**: 対象ファイルと同じ名前 + `.test.ts`（`actor.test.ts`）

## 🚫 Git管理対象外

以下のディレクトリ/ファイルは `.gitignore` で除外されています：
- `node_modules/`
- `dist/`
- `.DS_Store`
- その他環境固有のファイル

## 🔄 環境変数

現在、環境変数は使用していませんが、将来的に必要になった場合は：
- `.env.local` を `.gitignore` に追加
- `.env.example` にテンプレートを配置
- `vite.config.ts` で環境変数の読み込み設定

## 📝 開発環境のセットアップ

1. Node.js（LTS）をインストール
2. リポジトリをクローン
3. `npm install` で依存関係をインストール
4. `npm run dev` で開発サーバーを起動

## 🔍 トラブルシューティング

### 依存関係のエラー
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScriptの型エラー
```bash
npm run build  # 型チェック実行
```

### Biomeの設定確認
```bash
npm run lint  # 設定ファイル（biome.json）を確認
```
