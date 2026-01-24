# Fixed Limit Hold'em (FLH) 要件定義書

## 1. 概要
既存のMix Pokerアプリ（Stud系のみ）に対し、Fixed Limit Hold'em (FLH) をプレイ可能にするための要件を定義する。
本ドキュメントではFLH特有のルールと、それに伴うデータ構造・ロジックへの要求事項をまとめる。

## 2. 基本ルール仕様

### ゲーム形式
- **Fixed Limit Hold'em (FLH)**
- 2枚のホールカード（伏せ札）と5枚のコミュニティカード（ボード）を使用。
- 最終的な役は、ホールカードとコミュニティカードの計7枚から任意の5枚を選択して構成する（High Handのみ）。

### ベッティング構造
- **リミット形式**: Fixed Limit
- **ベット額**:
  - **Small Bet**: Preflop, Flop で使用
  - **Big Bet**: Turn, River で使用（通常 Small Bet の2倍）
- **キャップ (Cap)**: 1ラウンドあたり最大5ベット（Bet + 4 Raises）まで。
  - 既存のStud実装（raiseCount < 4）と同様。

### 強制ベット (Blinds)
- **Ante**: なし
- **Small Blind (SB)**: Dealer Buttonの左隣（1人目）。額は通常 Small Bet の半分（端数切り捨て等のルールは要確認だが、一旦 MVPでは 0.5 * Small Bet とする）。
- **Big Blind (BB)**: SBの左隣（2人目）。額は Small Bet と同額。
- **Bring-in**: なし

## 3. ゲーム進行フロー

### 0. デイーリング開始 (Deal Start)
- Dealer Button の位置を決定（前のディールから移動）。
- SB, BB の支払い（自動、または強制アクション）。
- 各プレイヤーにホールカード2枚を裏向きで配布。

### 1. Preflop (1st Round)
- **ボード**: なし
- **アクション順**: BBの左隣 (UTG) から時計回り。
- **ベット額**: Small Bet 単位。
- **特殊ルール**: BBは、誰もレイズしていない場合、Option（Check/Raise）を選択可能。

### 2. Flop (2nd Round)
- **ボード**: 3枚のコミュニティカードが開かれる。
- **アクション順**: Dealer Buttonの左隣（SB位置、または最初に残っているプレイヤー）から時計回り。
- **ベット額**: Small Bet 単位。

### 3. Turn (3rd Round)
- **ボード**: +1枚（計4枚）のコミュニティカードが開かれる。
- **アクション順**: Flopと同じ。
- **ベット額**: Big Bet 単位。

### 4. River (4th Round)
- **ボード**: +1枚（計5枚）のコミュニティカードが開かれる。
- **アクション順**: Flopと同じ。
- **ベット額**: Big Bet 単位。

### 5. Showdown
- 残っているプレイヤーで役の強さを比較。
- 勝者がポットを獲得（High Handのみ）。
- 同着の場合は分割（Chop）。

## 4. システム要件（既存実装との差分）

### データ構造 (`DealState`) への追加・変更
1.  **Community Cards (Board)**
    -   Stud系にはなかった「共有カード」の概念が必要（StudのUpcardはあくまで個人の持ち物）。
    -   `board: Card[]` フィールドの追加。

2.  **Dealer Button / Blinds**
    -   アクション順序決定のため、`dealerBtnIndex: SeatIndex` が必要。
    -   Studの `bringInIndex` は使用しない（またはFLHでは無効化）。

3.  **Street 定義**
    -   既存: `3rd`, `4th`, `5th`, `6th`, `7th`
    -   FLH用: `preflop`, `flop`, `turn`, `river`
    -   ※ 既存型を拡張するか、マッピングするか検討が必要。

4.  **Hand・Card**
    -   `PlayerHand` の `upCards` はFLHでは常に空、`downCards` が2枚となる。

### ロジック (`Engine` / `Rules`) への追加・変更
1.  **アクション順序 (Actor Selection)**
    -   Stud: Upcardの強さ、または直前のアクション順に依存。
    -   FLH: 基本的にDealer Buttonの相対位置で固定。Preflopのみ例外（BBの次から）。

2.  **ベット額の切り替え**
    -   ストリートによってベット額（Small/Big）が切り替わるロジックの実装。

3.  **役判定 (Evaluator)**
    -   7枚（手札2 + ボード5）から5枚を選ぶHigh Hand判定。
    -   既存の `evaluateStudHi` ロジック（7枚からベスト5枚）をほぼ流用可能と思われる。

4.  **Blind処理**
    -   `DEAL_INIT` 後、最初の `BRING_IN` (Stud) の代わりに `POST_BLIND` イベント等の処理が必要。

## 5. UI要件
- プレイヤー手札（2枚）の表示エリア。
- 画面中央のコミュニティカード（Board）表示エリア。
- Dealer Button の表示。

---
**補足**:
- Omaha 8 対応を見据え、Board や Betting Structure は共通化できる設計とする。
- Omaha 8 では手札枚数（4枚）と役判定（Hand2枚+Board3枚縛り、Hi/Lo）が異なるのみで、進行はFLHと同様。
