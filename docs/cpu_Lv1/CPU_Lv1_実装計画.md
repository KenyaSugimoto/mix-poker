# CPU_Lv1_実装計画.md

## 1. 目的
CPU Lv1 を既存アーキテクチャ（applyEvent/amount計算分離/allowedActions制約）に沿って追加する。
Lv0は温存し、Lv1へ切替可能にする。

## 2. 実装方針（重要）
- 公平性担保のため Observation を導入（推奨）
- allowedActions の型が EventType[] の場合、CPU内部で ActionType にフィルタする（必須）
- RNGは再現性不要だが、テスト容易性のため注入可能にする（推奨）

## 3. 作業分解（推奨順）

### 3.1 下準備
- [ ] ActionType集合（CPUが選べる型）をユーティリティとして定義（フィルタ用）
- [ ] buildObservation(state, seat) を追加
  - [ ] me: down+up を含む
  - [ ] others: up のみを含む
  - [ ] deck/rngSeed を含めない

### 3.2 Lv1ロジック実装（モジュール分割推奨）
- [ ] スコアリング
  - [ ] calcStudHiScore(obs): number (0..100)
  - [ ] calcRazzScore(obs): number (0..100)
  - [ ] calcStud8Score(obs): number (0..100)
- [ ] 共通特徴量
  - [ ] toCall, betUnit, numActive, isBigBetStreet, pressure
- [ ] 閾値計算
  - [ ] requiredScore / foldThreshold / betThreshold / raiseThreshold / completeThreshold など
  - [ ] tightness / aggression / multiwayPenalty / bigBetFear を反映
- [ ] decideLv1(ctx, rng)
  - [ ] 3rd bring-in
  - [ ] currentBet==0
  - [ ] currentBet>0
  - [ ] allowedActionsフォールバック

### 3.3 結合
- [ ] cpuLv1 を CpuStrategy として公開
- [ ] 呼び出し側（runner等）で cpuLv0/cpuLv1 を選択できるようにする（設定は固定でOK）

### 3.4 テスト（Vitest）
- [ ] 合法性テスト
- [ ] 公平性テスト（Observation）
- [ ] 代表シナリオ（street×gameType）
- [ ] RNG注入テスト（ブラフ分岐の“選ばれ得る”ことを確認）

## 4. 受け入れチェックリスト（Done）
- [ ] CPUが CHECK/CALL 以外（FOLD/BET/RAISE/COMPLETE）を実際に返すケースがある
- [ ] 返すアクションは常に allowedActions 内
- [ ] 公平性違反が構造上防止されている（Observationに禁止情報が入っていない）
- [ ] テストが安定（確率テストなし、rng注入で分岐確認）
