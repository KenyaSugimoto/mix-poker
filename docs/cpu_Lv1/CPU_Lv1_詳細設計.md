# CPU_Lv1_詳細設計.md

## 1. 概要
Lv1 CPUは「観測可能情報」から自分のハンド状況を軽量スコア化し、状況（コスト・人数・圧力）で要求強度を調整して ActionType を選択する。

- 勝率推定はしない（ヒューリスティック）
- 方針は堅実（フォールドが増える方向）
- ブラフ/セミブラフは低頻度で導入

## 2. データ設計

### 2.1 CPUパラメータ（将来拡張用、今回は固定値で運用）
例：

```ts
export interface CpuParamsLv1 {
  tightness: number;        // 0..1 大きいほど堅い（降りやすい）
  aggression: number;       // 0..1 大きいほどBET/RAISEしやすい
  bluffFreq: number;        // 0..1 純ブラフ（かなり低く）
  semiBluffFreq: number;    // 0..1 セミブラフ（純ブラフよりは高くても可）
  multiwayPenalty: number;  // 0..? 人数が増えるほど要求強度を上げる係数
  bigBetFear: number;       // 0..? 5th+で慎重になる係数
}
```

推奨デフォルト（堅実寄り）：
- tightness=0.75
- aggression=0.35
- bluffFreq=0.01
- semiBluffFreq=0.03
- multiwayPenalty=0.20
- bigBetFear=0.30

### 2.2 Observation（公平性担保のため必須推奨）
DealState から CPUが参照可能な情報のみを抽出した構造体を作る。

- 含めないもの（禁止）:
  - deck
  - rngSeed
  - 他人の downCards

例：

```ts
export interface CpuObservation {
  gameType: GameType;
  street: Street;

  pot: number;
  currentBet: number;
  raiseCount: number;

  bringInIndex: SeatIndex;
  currentActorIndex: SeatIndex;

  stakes: {
    ante: number;
    bringIn: number;
    smallBet: number;
    bigBet: number;
  };

  me: {
    seat: SeatIndex;
    stack: number;
    committedThisStreet: number;
    committedTotal: number;
    downCards: Card[];
    upCards: Card[];
  };

  players: Array<{
    seat: SeatIndex;
    active: boolean;
    stack: number;
    committedThisStreet: number;
    committedTotal: number;
    upCards: Card[]; // 公開情報のみ
  }>;
}
```

## 3. 共通計算（特徴量）

### 3.1 toCall
```ts
toCall = currentBet - me.committedThisStreet
```

### 3.2 betUnit（コストの基準単位）
- 3rd/4th: smallBet を基準（ただし 3rd bring-in は bringIn も考慮）
- 5th/6th/7th: bigBet を基準

### 3.3 人数・圧力
- numActive = active人数
- pressure:
  - currentBet > 0 なら攻撃フェーズ
  - raiseCount が大きいほど圧力増

### 3.4 要求強度（requiredScore）
`handScore`（0..100）に対して、状況で必要点を上げる。

概念例：
```ts
required = baseRequired
required += multiwayPenalty * (numActive - 2) * 10
required += bigBetFear * (isBigBetStreet ? 10 : 0)
required += pressureFactor * raiseCount * 5
required += tightness * 10
```

※ 数式は例。実装は調整可能だが、考え方として「人数・bigbet・レイズ回数で要求を上げる」を必須とする。

## 4. ゲーム別スコア（handScore 0..100）

### 4.1 StudHi（上方向が強い）
入力: 自分の knownCards（down+up）＋ 相手upCards（公開）

評価要素（例）：
- made hand（最重要）
  - ONE_PAIR: 中
  - TWO_PAIR / TRIPS: 強
  - STRAIGHT / FLUSH / FH / QUADS / SF: かなり強
- draw（補助）
  - 4-flush, 4-straight を加点
- live度（任意だが軽量に）
  - 自分のドローアウトが相手upで“死んでいる”ほど減点
- boardThreat（相手公開が強そう）で減点
  - 相手upにペアが見える / 強い高札が並ぶ 等

最低要件：
- big bet（5th+）で「ペアなし・弱いドローのみ」の追いかけを減らす（堅実寄り）

### 4.2 Razz（低いほど強い → 0..100に正規化）
入力: 自分knownCards（down+up）＋ 相手upCards（公開）

評価要素：
- 低札（A..8）ユニーク枚数が多いほど加点
- ペア（同ランク重複）は強く減点
- 高札（9..K）が混ざるほど減点
- 相手アップが低い（A..5等）ほど警戒して減点（競争が厳しい）

最低要件：
- 5th+で高札寄りならフォールドしやすくする（big bet fear と合成）

### 4.3 Stud8（High/Lowの二軸）
入力: 自分knownCards（down+up）＋ 相手upCards（公開）

評価要素（推奨）：
- lowPotential（8-or-better成立見込み）
  - A..8 のユニーク枚数、ペア罰、9+混入罰
- highStrength（StudHi相当のmade/draw）
- scoopPotential（両面が一定以上なら加点）

最低要件：
- lowもhighも薄いならコールを減らす

## 5. 行動選択（Decision Policy）

### 5.1 例外規則（最優先）
1) allowedActions が1つならそれを返す
2) allowedActions に存在しない手は選ばない（常にフィルタ）

### 5.2 3rd bring-in担当（BRING_IN / COMPLETE）
- if "COMPLETE" in allowedActions and handScore >= completeThreshold -> COMPLETE
- else if "BRING_IN" in allowedActions -> BRING_IN
- else -> allowedActions内フォールバック

### 5.3 currentBet == 0（CHECK / BET）
- if "BET" in allowedActions and handScore >= betThreshold -> BET
- else if "CHECK" in allowedActions -> CHECK
- else -> allowedActions内フォールバック
- セミブラフ:
  - drawあり、numActiveが少ない、bigBetでない、など条件を満たしたとき
  - rng() < semiBluffFreq の場合はBETを許容（ただし allowedActions にBETがあること）

### 5.4 currentBet > 0（CALL / RAISE / FOLD）
- if "FOLD" in allowedActions and handScore < foldThreshold and toCall が重い -> FOLD
- else if "RAISE" in allowedActions and handScore >= raiseThreshold and rng() < aggressionAdjusted -> RAISE
- else if "CALL" in allowedActions -> CALL
- else -> allowedActions内フォールバック
- 純ブラフ:
  - 原則禁止に近い（堅実寄り）
  - 例外的に「相手の弱いアップが見える + 自分に最低限のバックドア」等の条件で rng()<bluffFreq のときのみRAISE/BETを許容

> 注: “堅実寄り”のため、ブラフは「BET（無ベットからの攻撃）」中心、RAISEブラフはさらに抑制する。

## 6. allowedActions 型の取り扱い（重要）
現状 `CpuDecisionContext.allowedActions: EventType[]` である場合、
- CPU内部では ActionType にフィルタリングした配列 `legal: ActionType[]` を作り、
- 以降の判定は `legal` のみを参照する。

ActionType集合：
- POST_ANTE / BRING_IN / COMPLETE / BET / RAISE / CALL / CHECK / FOLD

## 7. RNG（再現性不要の扱い）
- 既定の rng は `Math.random`
- テストのために `rng` を注入可能にする（例：strategy生成時に渡す、または decide第2引数など）

## 8. ログ（任意だが推奨）
デバッグ容易性のため、内部で理由コードを生成可能にする。
- 例: "FOLD:weak_bigbet", "BET:value", "BET:semi_bluff" など
UI表示は不要。ログ出力有無は実装都合で良い。
