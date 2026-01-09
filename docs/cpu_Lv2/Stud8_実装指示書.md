# Stud8 CPU戦略 Lv2 実装指示書（ルールベース / 強め）
Version: 1.0  
Target: 7 Card Stud Hi-Lo Eight-or-better（Stud8）  
目的: ルールベースで「強い」CPU（Lv2）を実装する。3rdの参加/スチール、dead cards反映、4th〜6thの構図（Hi-Hi / Hi-Lo / Lo-Lo）分岐、Scoop最大化とQuarter回避、7thのオーバーフォールド回避を重視する。  
制約: CPUは `allowedActions` の範囲でアクション種別を返す。金額計算はエンジン側。  

---

## 0. 前提（入力・見える情報）

### 0.1 入力
- `state: DealState`
- `seat: SeatIndex`
- `allowedActions: EventType[]`

### 0.2 見えるカード
- 自分: `state.hands[seat].downCards + upCards`
- 相手: `upCards` のみ
- dead cards: **自分以外の全プレイヤーの upCards（fold済み含む）**
  - Lowのdead（A〜8）は影響が大きいので必ず参照

---

## 1. 中間表現（VisibleContext）— StudHi / Razzと共通でOK
Stud8でも `buildVisibleContext()` は共通実装でよい。

```ts
export interface VisibleContext {
  street: Street;
  me: { seat: number; up: Card[]; down: Card[] };
  opponents: { seat: number; active: boolean; up: Card[]; downCount: number }[];
  aliveSeats: number[];
  headsUp: boolean;
  deadUpCards: Card[];
  deadRankCount: Record<Rank, number>;
  deadSuitCount: Record<Suit, number>;
  bringInSeat: number;
}
```

---

## 2. Stud8専用：評価軸（Hi / Lo / Scoop）

### 2.1 2つの“資格”を分けて扱う（重要）
- **Lo資格（Low Qualify）**: 8以下の5枚ローが作れる見込みがあるか
- **Hi資格（High Contend）**: ペア以上・強ドロー等でハイを取りにいけるか

### 2.2 “Scoop可能性”を実装で扱える形に落とす
Stud8の強さは「Scoop狙い」と「Quarter回避」に集約される。Lv2では以下の3段階に分類する。

- `SCOOP`：HiもLoも取りにいける（A2x, A3x + ペア等）
- `FREEROLL`：自分が片方（多くはLo）を強く持ち、もう片方も勝てる可能性がある
- `SPLIT`：片方しか現実的に狙えない（Lo-only / Hi-only）

### 2.3 dead cards の扱い（Lowは重く、Highは中）
- Low狙い: A〜8のdead枚数が増えるほど評価を大きく下げる
  - A〜5: 1枚deadごとに重い（例：-2点）
  - 6〜8: 1枚deadごとに中（例：-1点）
- High狙い: 自分のペアランクやフラ/ストレの鍵がdeadなら下げる（StudHiに準ずる）

---

## 3. Stud8専用：基本関数（実装AIが作るべき最小セット）

### 3.1 Low用 rankValue（A=1）
```ts
export const LOW_VALUE: Record<Rank, number> = {
  "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13,
};
```

### 3.2 3rd品質分類（Stud8用）
3rdの自分3枚（down2+up1）を以下で分類する。※“HiとLoの両睨み”を強く評価する。

- `Scoop3_Monster`：
  - A2x（x<=8）かつ 3枚すべて別ランク
  - A3x（x<=8）かつ 3枚別ランク
  - 低いペア＋低札（例：33A / 44A / 55A など）※Hi/Lo両面
- `Low3_Good`：
  - 8以下3枚別ランク（= 3-low）
  - Aを含む 8以下2枚 + 9以下1枚（A持ち優遇）
- `High3_Good`：
  - 99+ のペア（Stud8でもハイが強い）
  - 隠れハイペア（down-downが99+）
  - 強い3フラ/3ストレ（ただしLo札が2枚以上なら加点）
- `Marginal`：
  - 片方のみ薄い（Lo札が2枚だけ、または弱いペアのみ等）
- `Trash`：
  - LoもHiも薄く、deadも悪い

### 3.3 Opponent意図推定（Door card）
- door = 相手 `up[0]`（3rd）
- `door <= 8`：Lo志向（ただし“8以下3枚”である確率は高くない）
- `door >= 9`：Hi志向 or Steal志向

---

## 4. 3rdストリート（最重要：参加・スチール・対コンプリート）

### 4.1 3rdの基本思想（Lv2）
- **Scoop3_Monster は最優先で攻撃（COMPLETE/3bet可）**
- Lo-only同士のエクイティ差は小さいので、**Lo3_Good は降りすぎない**
- Hi-onlyは “人数を減らす” 価値が高い（Scoopされると死ぬ）ので、強いときだけ戦う
- スチールは行うが、**Lo志向のドアが残っていると成功しにくい**ため条件化する

### 4.2 3rd：Bring-in担当（BRING_IN / COMPLETE）
- Scoop3_Monster / Low3_Good / High3_Good → **COMPLETE**
- Marginal → 盤面次第（後ろが弱いならCOMPLETE、強いLoドアが多いならBRING_IN）
- Trash → **BRING_IN**

### 4.3 3rd：通常オープン（まだcompleteされていない局面）
#### 4.3.1 スチール条件（COMPLETE）
- 自分のドアが **8以下**（Loを見せている）  
  かつ
- 後ろに “明確に強いLoドア（A/2/3）” がいない  
  かつ
- 後ろに 8以下ドアが少ない（<=1人）  
→ ハンド中身がMarginalでも **COMPLETE（スチール）**

※ Loドアでスチールすると「相手がHiで守りにくい」ので価値が高いが、A/2/3が残っていると反撃されやすい。

#### 4.3.2 ハンド品質別
- Scoop3_Monster → **COMPLETE（優先）**
- Low3_Good → 競合Loドアが多くても **COMPLETE寄り**（降りすぎ防止）
- High3_Good → 相手にLoドアが多い場合は **参加を絞る**（Scoopリスク）
- Marginal → スチール条件を満たすときのみCOMPLETE、基本FOLD
- Trash → FOLD

### 4.4 3rd：相手COMPLETEに直面（CALL/RAISE/FOLD）
相手ドアで相手レンジを分類する。

- 相手ドア <= 8 → “Lo寄り”
- 相手ドア >= 9 → “Hi/Steal寄り”

**応答ルール**
- 自分が Scoop3_Monster：
  - 相手ドア <= 8 でも **CALL/RAISE**（deadが良ければRAISE）
- 自分が Low3_Good：
  - 相手ドア <= 8 → **CALL**（降りすぎ防止）
  - 相手ドア >= 9 → **CALL**（相手がSteal寄りなら守る）
- 自分が High3_Good：
  - 相手ドア <= 8 → 原則FOLD（Scoopされる危険が高い）
  - 相手ドア >= 9 → CALL（または自分が99+等ならRAISE）
- Marginal/Trash → 基本FOLD（ただし相手が露骨スチールで自分ドアが良いならCALL）

### 4.5 3rd：3bet返し（相手再レイズ）
- 継続してよいのは以下のみ（強め損切りでLv2らしくする）
  - Scoop3_Monster → CALL
  - 99+ など強いHiペアで、相手ドアがHi寄り（>=9） → CALL
  - Low3_Good でも deadが非常に良く、相手がSteal濃厚 → CALL（頻度低）
- それ以外 → FOLD

---

## 5. 4th〜6th（構図判定→目標→アクション）

### 5.1 構図（MatchupType）を毎ストリート推定する
各プレイヤーについて「Lo志向 / Hi志向 / Scoop志向」を推定し、現在の主要対戦相手（最もアクティブに戦っている相手）との構図を分類する。

- `HI_HI`：両者がハイ寄り
- `HI_LO`：一方がハイ、もう一方がロー寄り
- `LO_LO`：両者がロー寄り
- `SCOOP_RACE`：どちらもScoop狙いの可能性（A2系が見える等）

※ 主要対戦相手の選び方（簡易）：
- activeの相手のうち、upが最も強く見える（Loなら低い、Hiならペア/高札）相手を選ぶ

### 5.2 自分の現在地（Role）を3分類
- `SCOOPING`：HiもLoも現実的
- `LO_ONLY`：Loは現実的、Hiは薄い
- `HI_ONLY`：Hiは現実的、Loは薄い
- `AIR`：どちらも薄い（継続は相手の汚さ次第）

### 5.3 4th（small bet）：降りすぎない
**4th-1: 自分がBET可能**
- SCOOPING → **BET**
- HI_ONLY vs LO相手（HI_LO構図） → **BET**（相手を降ろしやすい / deny equity）
- LO_ONLY → 相手がHiでボード強いならCHECK寄り、相手が汚いならBET
- AIR → CHECK

**4th-2: 相手BETに直面**
- 原則CALL（4thは降りすぎない）
- 例外FOLD（明確に不利でスクープされやすい）：
  - 自分が HI_ONLY で、相手がLo完成に向かって強く見える（A2xが露骨）かつ
  - deadがLoに有利（相手側のA〜5が生きている）  
  → FOLD許可（頻度は低め）

### 5.4 5th/6th（big bet）：目標を固定し分岐を強く
5th以降は「コール＝高コスト」なので、Lv2では“スクープされる側の不利継続”を切る。

#### 5th/6th-1: 自分がBET可能（基本）
- SCOOPING → **BET/RAISE**（ノースロープレイ）
- HI_ONLY（対LO） → **BET**（相手のLo未完成のうちは圧。相手がLo完成しそうでも打つ）
- LO_ONLY（対HI） → 原則CALL寄り。BETは
  - 相手Hiが弱そう（ペア気配なし/ブリック）で、Loがほぼ確定する時のみ
- LO_LO → 自分のLoの“生き具合”が相手より良い（deadが有利/相手がブリック）ならBET

#### 5th/6th-2: 相手BETに直面（CALL/FOLDの核）
**CALL優先条件（いずれか）**
- 自分がSCOOPING（片方だけでも取り切る見込みが高い）
- 自分がLO_ONLYだが、相手のLoが汚い（ブリック/ペア/9以上混入）または deadが相手不利
- 自分がHI_ONLYだが、相手のLoが未完成っぽい＆自分が強いハイ（TwoPair+相当見込み）

**FOLD条件（強め損切り）**
- 自分がHI_ONLYで、相手がLo確定級（ボードで8以下が揃い過ぎ）かつ 自分ハイも中程度以下
  - → “相手にLoを取られ、Hiも競れない”＝スクープ/3/4取られが濃厚なので切る
- 自分がLO_ONLYで、相手がHi確定級（オープンペア/Tripsの気配）かつ 自分Loがdeadで枯れている
  - → “Quarter（ローを分ける）すら怪しい”ので切る

> Lv2の重要仕様：
> - 「Lo-onlyで相手Hi強＆Lo枯れ」の継続を強く切る  
> - 「Hi-onlyで相手Lo強＆自分Hi弱」の継続を強く切る  
> これが“強いStud8 CPU”の体感に直結する。

---

## 6. 7th（ブラフ抑制・オーバーフォールド回避・Quarter回避）

### 6.1 7th：ベット方針（相手がチェック）
- SCOOPING：
  - 原則BET（バリュー）
- LO_ONLY：
  - Loが確定・強い（8ロー相当以上）ならBET（バリュー）
  - ただし相手がHi強そうなら「ベットしてもコールされて半分」→ それでも基本BET（取りこぼし回避）
- HI_ONLY：
  - 相手がLo強そうならOOPはCHECK寄り（相手のLoがベットしてきたら判断）
  - HUや相手が汚い場合は薄いBETを許可

### 6.2 7th：相手BETに直面（CALL/FOLD）
Stud8は“片方だけでも取れればコールが正当化されやすい”。Lv2ではオーバーフォールドを避ける。

**CALL推奨（2つ以上でCALL、HUなら1つでCALL）**
1) 相手ボードがLoに見えても、dead状況からLoが割れている/汚れている可能性が高い  
2) 自分が少なくとも片方（Hi or Lo）を取る見込みがある  
3) 相手がLo-onlyっぽいのに、こちらのHiが少しでもあり得る（ペア見込み等）  
4) 相手がHi-onlyっぽいのに、こちらのLoが少しでもあり得る（8以下の枚数が足りている）

**FOLD推奨**
- 相手がSCOOP濃厚（ボードがA2系で綺麗）かつ 自分が両方薄い（AIR）  
- または 自分が明確に“どちらも取れない”と推定できる場合

### 6.3 ブラフ方針（重要：原則禁止、例外のみ）
- LO_ONLYが外した（Lo未完成）状態での純ブラフは原則しない
- 例外的に許可する条件（すべて満たす場合のみ）：
  - 相手のupにSDVが見えない（ペア/高札がなく、Hiが弱そう）
  - 自分のボードが“Loを狙っていたが外した”ように見える（自然な失敗ドロー）
  - HU or 相手がタイト傾向（※本実装では個体差が無いならHU限定で良い）
→ このときのみBETを許可

---

## 7. dead cards の具体反映（Low中心）
### 7.1 Low deadスコア（簡易）
- deadAto5 = deadRankCount[A..5] 合計
- dead6to8 = deadRankCount[6..8] 合計
- `lowDeadPenalty = 2*deadAto5 + 1*dead6to8`

これを
- 3rdのLow3_Good / Scoop3_Monster の強さ調整
- 5th/6thの継続判断（LO_ONLYのCALL/FOLD）
に必ず使う。

---

## 8. allowedActions フォールバック（共通）
- RAISEが無い → CALL
- BETが無い → CHECK
- CALLが無い → CHECK（あれば）/ それも無ければ FOLD
- BRING_IN局面は BRING_IN / COMPLETE の二択

---

## 9. 実装タスク（AIへの具体指示）

### 9.1 必須
- `buildVisibleContext(state, seat)`（共通）
- `lowValue(rank)`（A=1）
- `classify3rdStud8(me3)` → {Scoop3_Monster, Low3_Good, High3_Good, Marginal, Trash}
- `countLowDead(deadRankCount)` → deadAto5, dead6to8, penalty
- `inferIntentFromDoor(rank)` → "LO" | "HI"
- `inferRoleNow(meCards)` → "SCOOPING" | "LO_ONLY" | "HI_ONLY" | "AIR"
- `pickAction(allowed, prefs)`（共通）

### 9.2 推奨（強くなる）
- `getLastAggressorSeat(eventLog, street)` を作り、主導権の推定に使う
- “主要対戦相手”の選定（最も強いボード）を実装

### 9.3 テスト（最低限）
- 3rd:
  - Scoop3_Monster → COMPLETE/RAISE
  - Low3_Good vs Loドアcomplete → CALL（降りすぎ防止）
  - High3_Good vs Loドアcomplete → FOLD寄り（Scoop回避）
- 5th/6th:
  - HI_ONLYで相手Lo綺麗＆自分ハイ弱 → FOLD
  - LO_ONLYでLo dead重＆相手Hi強 → FOLD
- 7th:
  - 片方取れそうならCALLが増える（オーバーフォールド回避）

---
