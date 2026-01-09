# Stud Hi CPU戦略 Lv2 実装指示書（ルールベース / 強め）
Version: 1.0  
Target: 7 Card Stud High（Stud Hi）  
目的: ルールベースで「強い」CPU（Lv2）を実装する。  
制約: CPUは `allowedActions` の範囲でアクション種別を返す。金額計算はエンジン側。  

---

## 0. 前提（入力・見える情報）

### 0.1 入力（既存CPUインターフェース想定）
- `state`: DealState（ディール状態）
- `seat`: 自分のSeatIndex
- `allowedActions`: EventType[]（このターンで実行可能なアクション）

### 0.2 見えるカード情報
- 自分: down + up 全部見える（3rdはdown2+up1、4th以降はupが増える）
- 相手: up のみ見える
- デッドカード（dead）は **相手・自分以外の up 全部**（fold済みも含む）を対象にする  
  - down は見えないので dead に含めない  
  - これにより「Live判定」がルールベースで安定する

---

## 1. 実装の全体構造（推奨）

### 1.1 推奨モジュール構成
- `studHiLv15.ts`
  - `decideStudHiLv15(ctx): ActionType`
- `studHiEval.ts`
  - `buildVisibleContext(state, seat): VisibleContext`
  - `eval3rdTier(my, opp, dead): Tier`
  - `evalCategory5thPlus(my, opp, dead): Category`  // Made/Draw/Nothing
  - `scoreThreat(oppUpCards): number`
  - `scoreLive(drawIntent, dead): LiveScore`

### 1.2 決定フロー（全ストリート共通）
1) VisibleContext生成  
2) street分岐（3rd / 4th / 5th / 6th / 7th）  
3) 望ましいアクション（primary）を決める  
4) `allowedActions` に無ければフォールバック（secondary → tertiary）  
5) 返却

---

## 2. 共通定義（評価軸）

### 2.1 用語
- **Aggressor（主導権）**: 直近で攻撃行動（BRING_IN / COMPLETE / BET / RAISE）を取った側  
  - 実装簡略化: 「このディールのこのストリートで最後に攻撃行動をした seat」を state から推定できるなら使う  
  - 推定できない場合は「このストリート開始時に自分が最後に攻撃したか」を保持（CPU側で簡易記憶してもよい）

- **Threat（相手ボード圧）**: 相手upが強く見える度合い
- **Live（アウツの生存度）**: 自分の狙い（フラ/ストレ/ペア改善）に必要なカードが相手upにどれだけ見えているか

### 2.2 返却アクション（想定）
- "BRING_IN" / "COMPLETE" / "BET" / "RAISE" / "CALL" / "CHECK" / "FOLD"

---

## 3. 3rdストリート：Tier判定（参加・オープン・防衛）

### 3.1 3rdの基本方針
- 「参加するなら原則COMPLETE（= 2bet）」
- セットマイン目的の薄いコールは禁止（弱い隠れペアを“コールだけ”で追わない）
- スチールは行うが、無差別にはしない（ブレーキ条件あり）

### 3.2 Tier定義（S/A/B/C/D）
3rd（down2 + up1）を基準にTierを決め、状況（dead・相手up）で微調整する。

#### Tier S（最強：3betも辞さない）
- Trips（最初から3枚同ランク）
- 隠れハイペア（down-down が JJ+）
- 見えているハイペア（upを含む JJ+ のペア）

#### Tier A（強い：基本COMPLETE、相手次第で3bet）
- 99/TT/JJ（S未満の上位ペアは基本A以上扱いで良い）
- 隠れミドルペア（77–TT）
- 3フラ（A/K/Q 高スート絡み）かつ Live良
- 3ストレ（連結度が高い、ギャップ<=1）かつ Live良（かつ高め）

#### Tier B（条件付き参加：Liveと相手次第）
- 隠れローペア（22–66）
- 3フラ/3ストレだが、ランク低め or deadやや多め
- A絡みでも、スート/連結などの裏付けが薄いものはB止まり

#### Tier C（スチール条件なら攻撃、そうでなければ原則FOLD）
- 高いドア単体（K/Q/J）で、ダウンが弱い
- 連結・スートの補助がほぼ無い

#### Tier D（原則FOLD）
- 低いドア単体＋補助なし
- deadが重い3フラ/3ストレ
- 7-high以下のドアで特記事項なし

---

## 4. 3rd：パターン表（Tier判定の具体例）

### 4.1 ペア系（最重要）
- (xx)/x で down-down がペア → 隠れペア
- (x x)/x で upがペア構成に関与 → 見えているペア（相手に強く見える）

| パターン | 例 | Tier |
|---|---|---|
| Trips | (7 7)/7 | S |
| 隠れハイペア | (K K)/4 | S |
| 見えているハイペア | (K 4)/K | S |
| 隠れミドルペア | (9 9)/2 | A |
| 見えているミドルペア | (9 2)/9 | A（相手ドア次第でS寄り） |
| 隠れローペア | (4 4)/Q | B（deadが悪いとC/D） |

**3rdでの“強め補正”**
- 自分upがペア要素を含む（見えているペア）の場合、同ランクでも隠れペアより1段階強く扱う（A寄り）

### 4.2 3フラ（Flush draw）
- 自分の3枚のうち同スートが3枚

| パターン | 例 | Tier条件 |
|---|---|---|
| A-high 3フラ | (A♠ 6♠)/T♠ | A（Live良なら） |
| K/Q-high 3フラ | (K♥ 9♥)/2♥ | A/B（Live次第） |
| 低位3フラ | (7♦ 3♦)/2♦ | B（基本） |

**Live悪化（dead）で降格**
- 必要スートが相手upに3枚以上見えている → 2段階降格（例:A→C）

### 4.3 3ストレ（Straight draw）
- 3枚で連結度が高い（ギャップ<=1を推奨）

| パターン | 例 | Tier条件 |
|---|---|---|
| 高位連結 | (J 9)/T | A（Live良なら） |
| 1-gap | (Q T)/J | A/B（Live次第） |
| 低位連結 | (6 4)/5 | B（基本） |

**Live悪化（dead）で降格**
- 必要ランクが相手upに2枚以上見えている → 1〜2段階降格

---

## 5. Threat（相手ボード圧）スコアリング

### 5.1 Threatスコア（0〜10推奨）
以下を相手ごとに計算し、最大値（最も危険な相手）を採用して良い。

#### スコア加点ルール（相手upのみ）
- オープンペア（同ランクupが2枚）: +5
- 3フラ（同スートupが3枚）: +4
- 4フラ: +6（以降ストリートで更新）
- 3枚連結（例:T-J-Q）: +4
- 4枚連結: +6
- Aがupに含まれる: +2（ただし単体Aは+1でも可）
- K/Qが複数: +1〜2（任意）

**Threatの閾値（推奨）**
- Threat >= 7: “相手が完成寄り”として扱う（ドロー・ワンペアは慎重）
- Threat 4〜6: 中圧
- Threat <= 3: 低圧（セミブラフが通りやすい）

---

## 6. Live（アウツ生存）判定（簡易）

### 6.1 目的
厳密な確率計算は不要。  
ルールベースで「枯れている / まだ生きている」を判断する。

### 6.2 deadCountの数え方
- 相手全員のupカード（fold済み含む）から、目的に応じたカードの枚数を数える

### 6.3 Live判定（3段階）
- `LIVE_GOOD`
- `LIVE_OK`
- `LIVE_BAD`

#### Flush（フラ狙い）のLive
- deadSuit = 相手upに見えている同スート枚数
  - deadSuit <= 1 → GOOD
  - deadSuit == 2 → OK
  - deadSuit >= 3 → BAD

#### Straight（ストレ狙い）のLive
- 自分の3〜4枚の連結から「必要ランク（end or gut）」を定義
- deadRank = 必要ランクが相手upに見えている枚数（ランクごとに数える）
  - maxDeadNeededRank == 0 → GOOD
  - maxDeadNeededRank == 1 → OK
  - maxDeadNeededRank >= 2 → BAD

#### Pair improvement（ペア→Trips等）
- 自分のペアランクが相手upに見えている枚数
  - 0 → GOOD
  - 1 → OK
  - 2 → BAD（残り1枚で非常に厳しい）

---

## 7. ストリート別の意思決定ルール（最終版）

以降、CPUは「望ましい行動」を決め、`allowedActions`に無ければフォールバックする。

### 7.1 3rd（オープン：BRING_IN/COMPLETE/CALL/FOLD/RAISE）
#### 3rd-1: 自分がBring-in担当（BRING_IN or COMPLETE）
- Tier S/A/B → COMPLETE
- Tier C/D → BRING_IN（最小で参加し、反応で降りる余地）

#### 3rd-2: まだcompleteされていない局面（自分が先に強制でない）
- Tier S/A → COMPLETE
- Tier B → (Live GOOD/OK)なら COMPLETE、Live BADなら CALL or FOLD（基本FOLD寄り）
- Tier C → スチール条件なら COMPLETE、なければ FOLD
- Tier D → FOLD

#### 3rd-3: スチール条件（COMPLETE）
- 自分のドアが「未行動の全員」より高い  
  かつ以下のブレーキ条件を満たさない：
  - 自分ドアが J 以下 → スチール禁止
  - 後ろに Aドアが残っている → スチール禁止
  - 自分が狙うスートが既に相手upに複数見えている（>=2）→ スチール抑制（任意）

#### 3rd-4: 相手COMPLETEに直面（CALL/RAISE/FOLD）
- Tier S → RAISE（3bet）
- Tier A → 相手ドアが自分より弱い & Threat低いなら RAISE、そうでなければ CALL
- Tier B → Live GOOD/OKなら CALL、Live BADなら FOLD
- Tier C/D → FOLD

#### 3rd-5: 相手から3betが返ってきた後（CALL/FOLD）
- Tier S → CALL
- Tier A以下 → 基本FOLD（強めの損切り）

---

### 7.2 4th（CHECK/BET/CALL/RAISE/FOLD）
#### 4th-1: 自分がベット可能（CHECK/BET）
- Made（オープンペア以上）→ BET
- Drawが強い（4フラ/強4ストレ）かつ Threat低〜中 → BET（セミブラフ）
- それ以外は CHECK寄り（特にThreat高ならCHECK）

#### 4th-2: 相手BETに直面（CALL/RAISE/FOLD）
- 原則CALL（「基本降りない」）
- ただしFOLD許可条件（明確理由がある時のみ）：
  - 自分が Nothing（HighCard相当）かつ Draw薄い（Live BAD）  
  - かつ Threat >= 7
- RAISE条件（強め要素）：
  - 自分がオープンペア以上になった
  - または強いDraw（4フラ/強4ストレ）で Threat低〜中

---

### 7.3 5th（最重要分岐 / Big Bet）
5th以降は `Category` を使う：
- `M` (Made): OnePair以上（特にオープンペア加点）
- `D` (Draw): 4フラ / 4ストレ / ペア改善が現実的
- `N` (Nothing): 上記以外

#### 5th-1: 自分がベット可能
- M → BET（スロープレイしない）
- D → Threat低〜中のみ BET（セミブラフ）。Threat高ならCHECK寄り
- N → CHECK（可能なら） / 受けに回る

#### 5th-2: 相手BETに直面（CALL/RAISE/FOLD）
- M → 基本CALL。優位（自分の見えが強い、相手Threat低）ならRAISE
- D → Live GOOD/OKならCALL、Live BADならFOLD
- N → FOLD（ここで切れるのが強いCPU）

---

### 7.4 6th（Big Bet / “完成”を尊重）
#### 6th-1: 相手の完成シグナル
- 相手upがオープンペア維持 + 高カード追加
- 相手が4フラ/4ストレに到達
- 相手が5th/6thで継続的に攻撃

#### 6th-2: 相手BETに直面
- TwoPair+ → CALL/RAISE（優位ならRAISE）
- OnePair → Threat高ならFOLDも許可（特に自分が弱いペア・Live悪い）
- Draw → Live GOODでも、相手完成シグナル強いならFOLD（完成にぶつかるドローを切る）

---

### 7.5 7th（バリュー・薄いブラフキャッチ）
#### 7th-1: 相手がチェックしてきた（自分がBET可能）
- TwoPair+ → BET（バリュー）
- OnePair → 相手upが弱い & 失敗ドロー多そうなら BET（薄いバリュー）
- それ以外 → CHECK

#### 7th-2: 相手BETに直面（CALL/FOLD）
ブラフキャッチは限定的に許可。以下「条件2つ以上」でCALL推奨：
- 相手upが完成形に見えない（ペア無し、3フラ止まり、3ストレ止まり）
- これまで相手が攻撃継続だが、ボードが伸びていない（空砲ライン）
- 自分が上位OnePair（A/Kペアなど）

満たさない → FOLD

---

## 8. フォールバック規則（allowedActions対応）

### 8.1 優先順位（推奨）
- 望ましい行動が不可能なら、次善へ落とす

例：
- `RAISE`したいが無い → `CALL`（または `BET`/`CHECK` の局面なら `BET`）
- `BET`したいが無い → `CHECK`
- `CALL`したいが無い → `CHECK`（可能なら） / それも無いなら `FOLD`

### 8.2 例外
- BRING_IN局面は `BRING_IN` か `COMPLETE` のどちらかしか無い想定  
  → Tierルールで必ず決められる

---

## 9. テスト観点（最低限）
実装AIは以下の観点でユニットテスト（またはスナップショット）を用意すること。

### 9.1 Tier判定（3rd）
- Trips / 隠れハイペア / 見えているハイペア → S
- 隠れミドルペア → A
- ローペア → B
- 高いドア単体 → C
- 低いドア単体 → D
- 3フラでdeadSuit>=3 → 2段階降格されること

### 9.2 Threat
- オープンペアup → +5
- 4フラup → +6
- 4連結up → +6
- A含む → +2

### 9.3 5th分岐
- Category N で相手BET → FOLDになること
- Category D で Live BAD → FOLDになること
- Category M で Threat低 → CALL/RAISEが選ばれること

---

## 10. 実装上の注意（重要）
- ルールは「強め」だが、無理な戦争（3rdでの4bet/5bet戦争）は行わない  
- 5th以降のN（Nothing）フォールドが、強さの核  
- ブラフキャッチは限定的（条件式で管理）  
- 乱数は不要（同点時のみ微小ランダムは任意）

---

## 付録A: 3rdの“相手ドア比較”補正（任意だが強くなる）
- 自分のupランクが相手のupより明確に高い（>=2段階）なら、Tierを1段階引き上げてもよい（ただしD→Cまで）
- 相手にAドアが複数いる場合、自分のスチール条件は強く抑制する

---

## 付録B: HU補正（2人時）
- 3rdでTier Bを「参加寄り」（A相当の扱い）にする
- 7thブラフキャッチの条件を「2つ以上」→「1つ以上」に緩める（任意）


