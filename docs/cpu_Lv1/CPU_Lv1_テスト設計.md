# CPU_Lv1_テスト設計.md

## 1. 目的
Lv1 CPUの「合法性・公平性・堅実性」をユニットテストで担保する。
確率挙動（ブラフ頻度など）は不安定になり得るため、“構造テスト”中心で設計する。

## 2. テスト分類

### 2.1 合法性テスト（必須）
- どの入力でも、戻り値が `allowedActions`（ActionTypeにフィルタ後）に必ず含まれる
- allowedActions が1つの場合、そのアクションを必ず返す

### 2.2 公平性テスト（必須）
`buildObservation(state, seat)` の戻り値を検証する：

- **禁止情報が含まれていないこと**:
  - `deck` プロパティが存在しない
  - `rngSeed` プロパティが存在しない
  - `players` 配列内の他プレイヤー情報に `downCards` や `hand` (非公開カード) が含まれていない
  - `me` プロパティのみ `hand` (全カード) を持つ

- **型チェック**:
  - Requirementsで定義された `Observation` インターフェースに適合していること


### 2.3 代表シナリオ（必須）
- 3rd bring-in:
  - 強い -> COMPLETE（allowedActionsにある場合）
  - 弱い -> BRING_IN
- 4th+ currentBet=0:
  - 強い -> BET
  - 弱い -> CHECK
- 5th+ currentBet>0（big bet）:
  - 弱い & toCall重い -> FOLD（allowedActionsにある場合）
  - 中 -> CALL
  - 強い -> RAISE（ただし高頻度にはしない）

### 2.4 ゲーム別の基本挙動（必須）
StudHi:
- ペア以上のとき、一定の攻撃性（BET/RAISE）が出る
- ノーペアでbig bet追いかけを抑制（FOLD/CHECK寄り）

Razz:
- 低札ユニーク多い -> 進行（CALL/BET寄り）
- ペア/高札混入 -> big betでFOLD寄り

Stud8:
- lowもhighも薄い -> 降りる
- low成立見込み + highもある程度 -> 進行/攻撃

## 3. RNGテスト方針（再現性不要の要件に合わせる）
- rngを注入し、rngが0を返す場合は「ブラフ分岐が選ばれ得る」ことを確認
- rngが1を返す場合は「ブラフ分岐が抑制される」ことを確認
- “何%で起きるか”は統計テストにしない（CI不安定化を避ける）

## 4. 推奨テストケース例（粒度）
- `decide_returns_action_in_allowedActions()`
- `decide_single_allowedAction_returns_it()`
- `buildObservation_hides_other_downCards()`
- `buildObservation_omits_deck_and_rngSeed()`
- `buildObservation_includes_me_hand()`
- `studHi_bigbet_weak_folds_when_possible()`
- `razz_high_cards_bigbet_folds()`

- `stud8_no_low_no_high_folds_or_checks()`

## 5. 期待するテストデータの作り方（ガイド）
- DealStateを直接組むより、最小限のObservationを組む方がテストが軽い
- スコアリング関数を分離できるなら、スコアリング単体テストと decide統合テストを分ける
