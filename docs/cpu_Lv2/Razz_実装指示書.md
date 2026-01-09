# Razz CPU戦略 Lv2 実装指示書（ルールベース / 強め）
Version: 1.0  
Target: 7 Card Stud Low（Razz）  
目的: ルールベースで「強い」CPU（Lv2）を実装する。特に 3rd のスチール/リスチール、dead cardsの反映、5th以降のフォールド最適化、7thのオーバーフォールド回避を重視する。  
制約: CPUは `allowedActions` の範囲でアクション種別を返す。金額計算はエンジン側。  

---

## 0. 前提（入力・見える情報）

### 0.1 入力（既存CPUインターフェース想定）
- `state: DealState`
- `seat: SeatIndex`
- `allowedActions: EventType[]`

### 0.2 見えるカード情報
- 自分: `state.hands[seat].downCards + upCards` が見える
- 相手: `upCards` のみ見える
- dead cards（公開情報で確定して見えているカード）
  - **自分以外の全プレイヤーの upCards（fold済み含む）**を dead とする  
  - downCards は見えないので dead に含めない

---

## 1. 中間表現（VisibleContext）— Stud Hiと共通でOK

### 1.1 型（推奨）
```ts
export type LiveGrade = "GOOD" | "OK" | "BAD";

export interface VisiblePlayer {
  seat: number;
  active: boolean;
  up: Card[];
  downCount: number;
}

export interface VisibleContext {
  street: Street;
  me: { seat: number; up: Card[]; down: Card[] };
  opponents: VisiblePlayer[];
  aliveSeats: number[];
  headsUp: boolean;

  deadUpCards: Card[];
  deadRankCount: Record<Rank, number>; // 相手upのrank枚数
  deadSuitCount: Record<Suit, number>;

  bringInSeat: number;
}
```

### 1.2 buildVisibleContext（Stud版と同一でOK）
- `deadUpCards = opponents.flatMap(o => o.up)`
- `headsUp = aliveSeats.length === 2`

---

## 2. Razz専用：Low評価の基礎定義

### 2.1 Lowのランク値（Aが最強のロー＝1）
```ts
export const LOW_VALUE: Record<Rank, number> = {
  "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13,
};
export const lowValue = (r: Rank): number => LOW_VALUE[r];
```

### 2.2 「良いロー」の比較
- Razzは **5枚のロー（ペアは悪い）**を作るゲーム。
- 実装では、以下の2種類のスコアを使い分ける。

#### (A) BoardPotentialScore（ボード＋自分ダウンでの到達可能性）
- 4th〜6thの「エクイティリーダー」判断に使う  
- 厳密な最良5枚計算は不要。  
- **“今見えている低カードの質”**と**“ペア汚染の有無”**を評価する。

#### (B) ShowdownLowScore（7thでの完成ロー比較）
- 役判定設計書に low 判定（`LowHandScore { ranks: number[] }`）があるならそれを使用する（最優先）。
- 既存が無い場合のみ簡易実装を用意（後述）。

---

## 3. Razz専用：dead cardsの重み付け（Lv2の核）

### 3.1 重要カード（Key Low Cards）
- A/2/3/4/5 は特に重要（“車輪”周辺）
- 6/7/8 も重要だが優先度は下げる
- 9以上は「ブリック」「スチール材料」など別用途

### 3.2 dead の評価ルール（概算でOK、ただし一貫性が重要）
- **欲しい低カードが dead に出ているほどマイナス**
  - A〜5: 1枚deadごとに重く（例：-2.0点）
  - 6〜8: 1枚deadごとに中（例：-1.0点）
- **自分のペアを誘発するランクが dead に出ているほどプラス**  
  - 例：自分が 4 を複数持っている/持ちやすい状況で、相手upに 4 が多い → 将来の“被り”リスク低下

> Lv2では「低カードのdeadを必ず参照し、3rd参加判断・5th以降継続判断に反映」すること。

---

## 4. 3rdストリート（Lv2の最重要：ドアカード×競合×手札質×dead）

### 4.1 3rdの分類（実装がブレないよう固定）
- Door = `me.up[0]`（3rdの唯一のup）
- “低いドアが強い”ゲーム（Aが最強）
- 競合 = “後ろに 8以下のドアがいる人数” を基本指標にする

### 4.2 3rdのハンド品質判定（最小だが強い）
以下は `me.down + me.up` の3枚で判定。

#### 強い3枚（Monster3）
- 例：A23 / A24 / 234 / A25 など
- 条件（簡易）：
  - 3枚すべて 5以下 かつ 全部別ランク（ノーペア）

#### 標準参加（Good3）
- ルールの軸：「8以下3種3枚」
- 条件：
  - 3枚すべて 8以下 かつ 全部別ランク（ノーペア）

#### 条件付き（Okay3）
- 3枚のうち 2枚が 8以下（別ランク）で、残りが 9以下程度
- または 8以下3枚だがペア含み（被り）で弱体化

#### 弱い（Bad3）
- 3枚で9以上が混ざる、ペアがある、A/2/3が少ない、deadが悪い 等

### 4.3 3rd：競合数カウント（BehindCompetitors）
- “後ろ”の定義：**今後アクションするプレイヤー**
- seat順の扱い：
  - 基本はエンジン側の進行に依存するため、簡易に「未行動 = committedThisStreet==0 かつ active」等で推定するか、
  - もしくは「全員のドア比較」で近似しても良い（Lv2では推奨しないが許容）
- 最低限の実装指示：
  - 3rd時点で `opponents` の door（up[0]）を取り、**自分より“強い（＝より低い）ドア”がいる人数**を競合とする  
  - ただし「後ろ」概念は精度に効くので、可能なら eventLog からアクション順を復元する（付録参照）

### 4.4 3rd：意思決定ルール（Complete/Call/Fold + 対3bet）

#### 3rd-1: 自分がBring-in担当（BRING_IN or COMPLETE）
- Monster3 / Good3 / Okay3 → **COMPLETE**
- Bad3 → **BRING_IN**（最小で様子見。相手がcompleteしてきたら基本FOLD）

#### 3rd-2: 通常オープン（まだcompleteされていない局面）
**A. Doorが 9以上（= 高いドアで弱い）**
- 自分より“低いドア”が相手にいる → **FOLD**
- 全員が自分より“高いドア”（＝相手の方が悪い） → **COMPLETE（Any2スチール）**
  - ただし、deadで相手の低カードが極端に死んでいる（A〜5が多く死んでいる）場合はスチール成功率が上がるので、より積極的にCOMPLETE

**B. Doorが 8以下（= 良いドア）**
- 競合（低いドアの相手）が 2人以上：
  - Good3以上 → **COMPLETE**
  - Okay3以下 → **FOLD**
- 競合が 1人：
  - “8以下が2枚以上（別ランク）” → **COMPLETE**
  - それ以外 → **FOLD**
- 競合が 0人（全員9以上）：
  - ハンド中身に関わらず **COMPLETE（スチール）**
  - ただし“ドアが8以下で競合0”は超有利なので、以降ストリートも強く継続（後述）

#### 3rd-3: 相手のCOMPLETEに直面（CALL/RAISE/FOLD）
- 基本思想：Razzは「良いドア×良い3枚」で戦う。弱いドアでの守備は“相手がスチール濃厚”のときだけ。
- まず相手がスチールっぽいか判定：
  - 相手ドアが 9以上 かつ 自分ドアがそれより低い（= 相手がAny2スチールの典型）→ “StealLikely”
  - 相手ドアが 8以下 → “TightLikely” （本物レンジ寄り）

**応答ルール**
- TightLikely（相手ドア8以下）：
  - Good3以上 → **CALL**
  - Monster3 かつ 自分ドアが相手より低い → **RAISE（3bet）**
  - Okay3以下 → **FOLD**
- StealLikely（相手ドア9以上）：
  - Okay3以上 → **CALL（広めに守る）**
  - Monster3 / Good3 かつ deadが良い（A〜5が生きている）→ **RAISE**
  - Bad3 → **FOLD**

#### 3rd-4: 3bet返し（相手が再レイズしてきた）
- Lv2では戦争を限定する（ミスを減らして強く見える）
- **CALLで続行してよい条件**：
  - Monster3（5以下3枚ノーペア）  
  - または Good3 かつ 自分ドアが相手ドアより低い（優位）  
- それ以外は **FOLD**

#### 3rd-5: HUトラップ（任意。実装優先度は低め）
- headsUp かつ 自分が超強い（Monster3）かつ 自分が“アクション最後”でポットを膨らませる必要が薄い場合：
  - COMPLETEせず **CALL** に留める選択を許可（ただし頻度は低くてよい）

---

## 5. 4th〜6th（主導権：Equity Leader / Brick / Pair汚染 / dead）

### 5.1 “Brick（ブリック）”定義
- 9以上を引く、または自分の既存ランクと被ってペア汚染するカードを引く、など  
（厳密でなくてよい。判断が一貫していることが重要）

### 5.2 ボード強弱の簡易指標（BoardLowQuality）
4th以降の自分の見えているカード（downも含めて良い）から、以下を数える：

- `lowCount8 = # { cards with value <= 8 }`
- `pairPenalty = 同ランクの重複数`（例：同rankが2枚なら+1、3枚なら+2…）
- `highCount = # { cards with value >= 9 }`

これを使って “良い/普通/悪い” を分類する。

### 5.3 Equity Leaderの原則（簡易で強い）
以下のとき、自分が主導権を取りやすい（BET/RAISE）：
- 自分のupボード（公開カード）が相手より明確に良い（低い）
  - 例：自分 up が (A,3,5) っぽく、相手 up が (8,9,T) っぽい
- 相手upがペアっぽい（同rankがupで重なる） or 相手にブリックが混ざっている
- deadにより相手の有効牌（A〜5）が多く死んでいる

### 5.4 4th：意思決定（CHECK/BET/CALL/RAISE/FOLD）
**4th-1: 自分がベット可能**
- 自分ボードが良い（lowCount8が増えた、ペア汚染なし）→ **BET**
- 相手ボードが悪化（ブリック/ペア/高牌）→ **BET**
- 自分がブリック + 相手が改善（相手upがA2系に寄る）→ **CHECK** 寄り

**4th-2: 相手BETに直面**
- 原則 **CALL**（4thは降りすぎない）
- ただし例外FOLDを許可（Lv2の現実的損切り）：
  - 自分が **連続ブリック**（この時点で高牌が2枚以上）かつ
  - 相手のupが **A/2/3中心で改善** かつ
  - deadが悪い（A〜5が多く死んでいる）  
  → **FOLD**

**4th-3: RAISE条件**
- 自分が明確にEquity Leader（自分upが相手upより強いローに向かう）かつ
- 相手がスチールっぽい/ブリック混入
→ **RAISE**（ただし乱用しない）

### 5.5 5th/6th：意思決定（Big Betなので分岐を強く）
**5th/6th-1: 自分がベット可能**
- 自分がEquity Leader → **BET**（ノースロープレイ）
- 相手のupがペア/ブリック多め → **BET**
- 自分がブリック + 相手が改善 + dead悪い → **CHECK**（可能なら）

**5th/6th-2: 相手BETに直面（CALL/FOLDが最重要）**
- CALLしてよい条件（いずれか満たせばCALL）：
  1) 自分の“低牌の枚数”が十分（例：<=8が4枚以上）で、ペア汚染が軽い  
  2) 相手upがブリック/ペアで弱い（相手の完成率が低い）  
  3) deadが相手不利（A〜5が死んでいる）  
- FOLD条件（いずれか強く該当でFOLD）：
  - 自分が 5th/6thで **ブリック連発**（>=9が2枚以上、かつ低牌が増えない）
  - 相手upが **非常に良い**（A〜5が多く、ペアも見えない）
  - deadが **自分に不利**（A〜5が大量に死んでおり、自分の改善が薄い）

> Lv2では「5thで弱い継続を切れる」ことが強さの核。  
> ただしRazzは7thで逆転もあり、相手ボードが汚いなら粘る。

---

## 6. 7th（オーバーフォールド回避：ベット/ブラフキャッチを強めに）

### 6.1 7thの前提
- 相手の7thは見えないため、6thまでのボードとラインで推測する
- 7thは「降りすぎ」が最大リークなので、Lv2は **一定条件で必ずコール** を組み込む

### 6.2 7th：バリューベット（相手がチェック）
- 自分が “十分良いロー” と判断できるなら **BET**
  - 目安（簡易）：
    - 自分の最良5枚の最大カードが 8以下（= 8ロー相当） → ほぼBET
    - 9ロー相当でも、相手upが汚い（高牌/ペア多い）ならBET
- さらに “相手が極端に汚いボード” の場合：
  - 自分が弱め（Tロー/Kロー相当）でも **BET** を許可（ブリック相手への押し切り/薄いバリュー）

### 6.3 7th：相手BETに直面（CALL/FOLD）
CALLしやすい条件（2つ以上でCALL推奨、HUなら1つでもCALL可）：
1) 相手upが汚い（9以上が複数 / 明確なブリック）  
2) 相手upにペア要素がある、またはdead状況からペアが疑わしい  
3) 相手が6th時点で“未完成っぽい”（upがA〜5中心でない、連続改善が見えない）  
4) 自分が少なくとも “9ロー相当” 以上の完成が見込める

FOLD推奨：
- 相手upが極めて良い（A〜5が多く、ペア無し、ブリック無し）かつ
- 自分が明確に悪い（ブリック多い/ペア汚染）  
→ FOLD

> Lv2の重要仕様：
> - 「相手はローが出来ていれば高頻度でBETしてくる」前提で、
> - 相手が未完成だった可能性が高いなら、一定割合で必ずCALLしてオーバーフォールドを防ぐ。

---

## 7. allowedActions フォールバック規則（共通）
- 望ましい行動が無ければ次善へ落とす
  - RAISE → CALL
  - BET → CHECK
  - CALL → CHECK（あれば）/ それも無ければ FOLD
  - BRING_IN局面は BRING_IN / COMPLETE の二択なので必ず決められる

---

## 8. 実装タスク（AIへの具体指示）

### 8.1 必須関数（最低限）
- `buildVisibleContext(state, seat)`（Studと共通）
- `lowValue(rank)`（A=1）
- `eval3rdQuality(me3): Monster3/Good3/Okay3/Bad3`
- `countDeadLow(deadRankCount)`：
  - A〜5のdead枚数、6〜8のdead枚数
- `estimateBoardQuality(cards)`：
  - lowCount8, highCount9, pairPenalty
- `isStealLikely(opDoor, myDoor)`：
  - opDoor >= 9 & myDoor < opDoor など簡易で良い
- `scoreOppBoardDirt(opUpCards)`：
  - 高牌の多さ、ペアの有無

### 8.2 推奨（強さが上がる）
- `getLastAggressorSeat(state.eventLog, state.street)`：
  - 直近の BRING_IN / COMPLETE / BET / RAISE の seat を取得し、
  - 4th〜7thで主導権（Aggressor/Defender）を判定に使う

---

## 9. テスト観点（最低限）
- 3rd分岐：
  - Door>=9 かつ後ろに低ドアあり → FOLD
  - Door>=9 かつ全員高ドア → COMPLETE
  - Door<=8 で競合2人以上、Good3未満 → FOLD
  - Bring-inでBad3 → BRING_IN、Good3以上 → COMPLETE
- 5th/6thの損切り：
  - ブリック連発 + 相手良ボード + dead不利 → FOLD
- 7thのオーバーフォールド回避：
  - 相手up汚い＆未完成推定 → 弱めローでもCALLが選ばれる

---
