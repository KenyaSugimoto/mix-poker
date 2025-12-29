# CPU_Lv1_スコアリング仕様_詳細.md

## 1. 目的
CPU Lv1 の意思決定に用いるスコアリング（0..100）を、ゲーム別に具体式として固定する。
また、行動選択に用いる閾値（complete/bet/raise/fold）を表形式で固定し、AIエージェントが迷わず実装できる状態にする。

## 2. 共通仕様

### 2.1 カード値の数値化
### 2.1 カード値の数値化
実装時は `src/domain/showdown/resolveShowdown.ts` の以下の関数を利用して数値化を行うこと。

- StudHiの高評価: `rankToNumberHigh` (A=14, K=13 ... 2=2)
- Razz/Stud8 Low評価: `rankToNumberLow` (A=1, 2=2 ... K=13)


### 2.2 “既知カード”の定義
- meKnown = me.downCards + me.upCards（最大7枚）
- oppUp = 全員の upCards（公開情報）

### 2.3 重要：軽量であること
- 5枚役の厳密判定が既に存在する場合は流用可。
- 存在しない場合、本書のヒューリスティック（ペア/トリップス/ドロー判定）だけでも成立する。
- 今回は “強さの方向性（堅実寄り）” が重要であり、精度は過度に追わない。

## 3. 共通の状況補正（requiredScore を作る）

### 3.1 特徴量
- toCall = currentBet - me.committedThisStreet
- isBigBetStreet = street in {5th,6th,7th}
- numActive = active人数
- pressure = raiseCount（0..）

### 3.2 betUnit の定義
- 3rd/4th: betUnit = smallBet
- 5th/6th/7th: betUnit = bigBet
注: bring-in は 3rd の特殊だが、toCall と閾値側で吸収する

### 3.3 requiredScore（0..100）
ベースの必要点に状況補正を加える。

```
requiredBase = 50
required = requiredBase
required += (params.tightness * 10)

multiway = max(0, numActive - 2)
required += (params.multiwayPenalty * 10 * multiway)

if isBigBetStreet:
  required += (params.bigBetFear * 15)

required += (pressure * 5)
```

※ params は今回固定値で良い。将来easy/normal/hardで差し替える。

### 3.4 コスト重さ判定（toCallWeight）
```
toCallWeight = toCall / betUnit
```

目安：
- toCallWeight <= 0.5 : 安い
- 0.5 < toCallWeight <= 1.0 : 標準
- 1.0 < toCallWeight : 重い（堅実なら降りやすい）

## 4. 行動閾値（固定表）

### 4.1 しきい値の意味
- completeThreshold: 3rd bring-in担当が COMPLETE する最低handScore
- betThreshold: currentBet==0 で BET する最低handScore
- raiseThreshold: currentBet>0 で RAISE する最低handScore
- foldThreshold: currentBet>0 で FOLD を検討する上限handScore（これ未満なら降り候補）

### 4.2 しきい値（ストリート別）
※ baseRequired=50 前提。requiredに補正が入るため、ここは “行動のベース” として扱う。

| Street | completeThreshold | betThreshold | raiseThreshold | foldThreshold |
|---|---:|---:|---:|---:|
| 3rd | 70 | - | - | 40 |
| 4th | - | 62 | 75 | 42 |
| 5th | - | 68 | 82 | 48 |
| 6th | - | 70 | 84 | 50 |
| 7th | - | 72 | 86 | 52 |

運用ルール：
- 実際の判定では `required` を加味して最終閾値を調整する：
  - bet: (handScore >= betThreshold + (required-50))
  - raise: (handScore >= raiseThreshold + (required-50))
  - fold: (handScore < foldThreshold + (required-50)) AND (toCallWeight が重い)
- COMPLETE は 3rd 特有のため required を強く効かせない（堅実寄りの暴発を防ぐ）

## 5. StudHi スコアリング（0..100）

### 5.1 役（made）点
既知カード（meKnown）から “最低限の役判定” を行う。

- PairCount: 同ランクの最大個数（2=ペア,3=トリップス,4=クワッズ）
- TwoPair: ペアが2つ以上

madeScore (HandRank -> Score mappings):
- `STRAIGHT_FLUSH`: 98
- `FOUR_OF_A_KIND`: 95
- `FULL_HOUSE`: 92
- `FLUSH`: 88
- `STRAIGHT`: 84
- `THREE_OF_A_KIND`: 78
- `TWO_PAIR`: 74
- `ONE_PAIR`: 64
- `HIGH_CARD`: 50

※ 実装では `src/domain/showdown/resolveShowdown.ts` の `evaluateStudHi` を利用し、返り値の `rank` (HandRank) を上記スコアに変換する。


### 5.2 ドロー点（drawScore）
madeが弱いときの補助点。

- 4-flush（同スート4枚以上）: +10
- 4-straight（連番に近い4枚）: +8
- backdoor（3枚同スート 等）: +3（任意。入れなくても可）

### 5.3 ライブ度（livePenalty）
自分のドローアウトが相手upで見えているほど減点（軽量に）。

- flushDraw のスートについて、相手upに同スートが多いほど減点: -min(6, countOppSameSuit)
- straightDraw について、必要なランクが相手upに多いほど減点: -min(6, countOppNeededRanks)

### 5.4 相手アップの脅威（boardThreatPenalty）
- 相手upがペアに見える（同ランク2枚以上up）: -8
- 相手upにA/K/Qなど高札が複数: -4（任意・軽量）

### 5.5 最終スコア
```
score = madeScore + drawScore - livePenalty - boardThreatPenalty
score = clamp(0, 100, score)
```

## 6. Razz スコアリング（0..100）

### 6.1 lowQuality（低いほど良い）を 0..100 に変換
既知カードから “低札の作りやすさ” を点数化する。

手順：
1) 既知カードのランクを low数値化（A=1..K=13）
2) ユニークな低札（<=8）の枚数: lowUniqueCount
3) ペアの数: pairCount（同ランク重複の数）
4) 高札混入度: highCount（>=9 の枚数）
5) worstRank: 既知カードの中で最大のlow数値（高いほど悪い）

### 6.2 基本点
```
base = 50
base += lowUniqueCount * 10      // 最大 +50（5枚揃えば強い）
base -= pairCount * 12           // ペアは強い罰
base -= highCount * 8            // 9以上は罰
base -= max(0, worstRank - 8) * 2 // 8を超える分を罰
```

### 6.3 相手アップが低いときの警戒（oppLowThreatPenalty）
相手upに A..5 が多いほど警戒（競争が厳しい）:
```
oppLowThreat = count(oppUp ranks <=5)
base -= min(10, oppLowThreat * 2)
```

### 6.4 最終スコア
```
score = clamp(0, 100, base)
```

最低要件：
- big bet（5th+）で highCount>0 や pairCount>0 のとき、スコアが十分落ちること（堅実フォールドにつながる）

## 7. Stud8 スコアリング（0..100）

Stud8 は High と Low の両面があるため、以下で合成する。

### 7.1 LowPotentialScore（0..100）
Razzと同様に lowUniqueCount / pair / highCount を使うが、
- “8-or-better の成立見込み”が重要なので、9以上の罰を強くする

```
lowBase = 40
lowBase += lowUniqueCount * 12
lowBase -= pairCount * 12
lowBase -= highCount * 10
lowBase -= max(0, worstRank - 8) * 3
lowScore = clamp(0,100,lowBase)
```

### 7.2 HighStrengthScore（0..100）
StudHiの madeScore を中心に、drawを少し加味する。

```
highScore = studHiScore (ただし boardThreatPenalty は半分にして良い)
```

### 7.3 scoopPotential（合成）
両面が高いほど加点。

```
score = 0.55 * highScore + 0.45 * lowScore
if highScore >= 70 and lowScore >= 70:
  score += 6   // scoop寄り加点
score = clamp(0,100,score)
```

最低要件：
- lowScore が極端に低く、highScore も低い場合に、全体scoreが十分低くなること

## 8. ブラフ/セミブラフ仕様（低頻度）

### 8.1 セミブラフ（推奨・低頻度）
条件（すべて満たす場合のみ検討）：
- currentBet == 0（BETできる局面）
- numActive <= 3（マルチウェイではやらない）
- isBigBetStreet == false（5th+では抑制）
- drawScore >= 8（4-flush/4-straight等）

上記条件を満たし、
- rng() < params.semiBluffFreq の場合、BETを許容（allowedActionsにBETがあること）

### 8.2 純ブラフ（さらに低頻度）
条件：
- currentBet == 0
- numActive == 2（ヘッズアップ）
- boardThreatPenalty が小さい（相手upが弱そう）

rng() < params.bluffFreq の場合のみBETを許容

※ currentBet>0 でのブラフRAISEは原則しない（堅実寄り）

## 9. 最終意思決定（擬似フロー）
1) allowedActions を ActionType にフィルタした legal[] を作る
2) Observation を生成
3) gameType別に handScore を計算
4) required を計算
5) street別閾値表から baseThreshold を取り、(required-50) を加えて最終閾値にする
6) situation（currentBet==0 / >0 / 3rd bring-in）ごとの規則で候補を選ぶ
7) legal[] にない候補は落とし、フォールバックで合法手を返す

## 10. パラメータ設定（デフォルト値）
将来的にAIの性格（Aggressive/Tight）を変えるためのパラメータ定義。当面は以下を固定値として使用する。

| Parameter | Default | Description |
|---|---:|---|
| `tightness` | 1.0 | requiredScoreへの基本補正係数 (higher = tighter) |
| `multiwayPenalty` | 1.5 | Active人数が多いときの参加忌避係数 |
| `bigBetFear` | 1.0 | BigBetストリートでの参加忌避係数 |
| `semiBluffFreq` | 0.05 | セミブラフを行う確率 (5%) |
| `bluffFreq` | 0.01 | 純粋なブラフを行う確率 (1%) |

