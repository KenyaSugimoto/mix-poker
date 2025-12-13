# 開発ロードマップ (Development Roadmap)

本ドキュメントでは、Mixゲームアプリの長期的な開発計画（Phase 2以降）について記述する。
なお、Phase 1 (MVP) の詳細は `01_requirements_template.md` を参照のこと。

## Phase 1: MVP (Stud Hi) - 現在のフェーズ
- **目的**: アーキテクチャ検証、基本デザインシステムの確立、ゲームループの実装。
- **対応ゲーム**: Seven Card Stud (High)
- **機能**: CPU対戦、localStorage保存、レスポンシブUI。

---

## Phase 2: Stud系ゲームの拡充 (Stud Family)
- **目的**: Stud Hiの基盤を活用し、RazzとStud Hi/Loを追加して「Stud 3種」を完成させる。
- **技術的課題**:
  - Low hand判定 (A-5 Lowball / 8-or-better) の実装。
  - Hi/Lo Split Potロジックの実装。
- **実装機能**:
  1.  **Razz (Limit)**: A-5 Lowball判定。
  2.  **Seven Card Stud Hi/Lo (Limit)**: 8-or-better判定、Split Pot。
  3.  **Game Selector**: ゲーム種目を選択して開始できる機能（まだMixではなく選択式）。

---

## Phase 3: HORSEへの拡張 (The "Big Goal")
- **目的**: フロップゲーム(Hold'em/Omaha)を追加し、Mixゲームの代表格「HORSE」を完成させる。
- **技術的課題**:
  - ブラインドゲーム(Hold'em/Omaha)とアンティゲーム(Stud系)の混在対応。
  - ゲーム切り替えロジック (6ハンドごとのローテーション)。
- **実装機能**:
  1.  **Texas Hold'em (Limit)**: ブラインド制の導入。
  2.  **Omaha Hi/Lo (Limit)**: 4枚ハンド、Split Pot判定。
  3.  **Mix Game Engine**: 6ハンドごとにゲームを自動で切り替えるHORSEモードの実装。

---

## Phase 4: 10Game Mix & その他バリアント
- **目的**: よりディープなMixゲーム愛好家に向けた機能拡張。
- **対応ゲーム追加**:
  - **Draw Games**: 2-7 Triple Draw, Badugi (手札交換ロジックの実装)。
  - **No Limit / Pot Limit**: ベッティングロジックの拡張（現在はFixed Limitのみ）。
  - **Dealer's Choice**: プレイヤーがゲームを選択できるモード。
- **機能拡張**:
  - 詳細なハンド履歴ビューア。

---

## Phase 5: UX & AI強化
- **目的**: アプリとしての完成度向上。
- **機能**:
  - **スタッツ機能**: VPIP, PFRなどの統計情報表示。
  - **賢いAI**: 確率計算に基づいたCPUロジック、相手のアクション傾向への適応。
  - **PWA化**: ホーム画面への追加、オフライン動作の最適化（既にWeb技術だが、ネイティブアプリ使用感の強化）。
  - **アニメーション強化**: チップ移動、カード配布のリアルな物理挙動風アニメーション。

---

## Phase 6: オンライン対戦 (Long Term)
- **目的**: 友人や他プレイヤーとのリアルタイム対戦。
- **技術スタック追加**: バックエンド (Go/Node.jsなど), WebSocket, DB。
- **機能**:
  - ユーザーアカウント・認証。
  - ロビー機能、テーブル作成。
  - リアルタイム同期。
  - チャット機能。

---

## 技術的なマイルストーン (Architectural Goals)
- **Abstract Game Engine**: 新しいルールを追加する際、既存コード（UIやチップ管理）をほぼ変更せずに済むような強固なインターフェース設計をPhase 2完了までに確立する。
- **State Recreation**: どのフェーズのどのゲーム状態からでも、完全にリプレイ可能なログ設計を行う。
