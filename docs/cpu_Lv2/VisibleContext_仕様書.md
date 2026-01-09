# Stud Hi CPU Lv2：VisibleContext 仕様書 & 実装テンプレ（DealState.hands版）

## 0. 目的
DealState / PlayerHand の実データ構造に基づき、CPU判断用の中間表現 `VisibleContext` を定義し、
3rd Tier判定 / 4th〜7th Category判定 / Threat / Live を安定して実装できる状態にする。

---

## 1. データ構造の確定（今回の型から）
- 自分/相手のカードは `state.hands[seat]` にある。
  - `downCards: Card[]`（裏）
  - `upCards: Card[]`（表）
- プレイヤーの生存/参加は `state.players[].active` で判定できる。
- seatの集合は `state.players[].seat` から取得する（0..playerCount-1固定と仮定しない）。
- 現在の手番は `state.currentActorIndex`。
- ゲーム種別は `state.gameType`（ここでは "studHi" のときのみ適用）

---

## 2. VisibleContext（中間表現）仕様

### 2.1 型定義（推奨）
```ts
export type LiveGrade = "GOOD" | "OK" | "BAD";
export type Tier3rd = "S" | "A" | "B" | "C" | "D";
export type Category = "M" | "D" | "N"; // Made / Draw / Nothing

export interface VisiblePlayer {
  seat: number;
  active: boolean;
  up: Card[];
  downCount: number;     // downを直接見せたくない場合にカウントだけ持つ
  // NOTE: 自分だけ down を別で保持して良い（後述）
}

export interface VisibleContext {
  street: Street;
  me: {
    seat: number;
    up: Card[];
    down: Card[];        // 自分は見えるので保持
  };
  opponents: VisiblePlayer[];   // 相手は up のみ参照
  aliveSeats: number[];         // active=true の seat
  headsUp: boolean;

  // dead cards（公開情報で確定して見えているカード）
  deadUpCards: Card[];          // 相手全員 + 自分以外のup（fold済みも含む）
  deadRankCount: Record<Rank, number>;
  deadSuitCount: Record<Suit, number>;

  // 盤面の補助情報（任意だが便利）
  bringInSeat: number;
}
```

### 2.2 deadUpCards の定義（重要）
deadUpCards = 「自分以外の全プレイヤーの upCards を全部」  
- active=false（fold済み）でも upCards は見えている前提なので dead に含める
- 自分のupは dead に含めない（自分の手札として扱う）

---

## 3. VisibleContext の生成（実装テンプレ）

### 3.1 ヘルパー（rank/suitのカウント）
```ts
import type { Card, DealState, Rank, SeatIndex, Suit, Street } from "../types"; // パスは実装側で調整

const SUITS: Suit[] = ["c", "d", "h", "s"];
const RANKS: Rank[] = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];

export const makeRankCount = (cards: Card[]): Record<Rank, number> => {
  const init = Object.fromEntries(RANKS.map(r => [r, 0])) as Record<Rank, number>;
  for (const c of cards) init[c.rank] += 1;
  return init;
};

export const makeSuitCount = (cards: Card[]): Record<Suit, number> => {
  const init = Object.fromEntries(SUITS.map(s => [s, 0])) as Record<Suit, number>;
  for (const c of cards) init[c.suit] += 1;
  return init;
};
```

### 3.2 buildVisibleContext（確定版）
```ts
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
  deadRankCount: Record<Rank, number>;
  deadSuitCount: Record<Suit, number>;
  bringInSeat: number;
}

export const buildVisibleContext = (state: DealState, meSeat: SeatIndex): VisibleContext => {
  const myHand = state.hands[meSeat] ?? { upCards: [], downCards: [] };
  const me = { seat: meSeat, up: myHand.upCards ?? [], down: myHand.downCards ?? [] };

  const players = state.players.map(p => {
    const hand = state.hands[p.seat] ?? { upCards: [], downCards: [] };
    return {
      seat: p.seat,
      active: p.active,
      up: hand.upCards ?? [],
      downCount: (hand.downCards ?? []).length,
    } satisfies VisiblePlayer;
  });

  const opponents = players.filter(p => p.seat !== meSeat);
  const aliveSeats = players.filter(p => p.active).map(p => p.seat);
  const headsUp = aliveSeats.length === 2;

  const deadUpCards = opponents.flatMap(p => p.up);
  const deadRankCount = makeRankCount(deadUpCards);
  const deadSuitCount = makeSuitCount(deadUpCards);

  return {
    street: state.street,
    me,
    opponents,
    aliveSeats,
    headsUp,
    deadUpCards,
    deadRankCount,
    deadSuitCount,
    bringInSeat: state.bringInIndex,
  };
};
```

---

## 4. Lv2 評価関数（実装しやすい最小セット）

### 4.1 rank強弱（High向け）
```ts
const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

export const rankValue = (r: Rank): number => RANK_VALUE[r];
```

### 4.2 3rd Tier判定（S/A/B/C/D）
- 対象カード：自分の (down2 + up1) = `me.down + me.up`
- まず「ペア/トリップス」を最優先で判定
- 次に「3フラ」「3ストレ（近接）」を判定
- 最後に「高ドア単体」をC、その他D

```ts
export type Tier3rd = "S" | "A" | "B" | "C" | "D";

const countByRank = (cards: Card[]): Record<Rank, number> => {
  const init = Object.fromEntries(Object.keys(RANK_VALUE).map(r => [r, 0])) as Record<Rank, number>;
  for (const c of cards) init[c.rank] += 1;
  return init;
};

const maxSameSuit = (cards: Card[]): number => {
  const m = new Map<Suit, number>();
  for (const c of cards) m.set(c.suit, (m.get(c.suit) ?? 0) + 1);
  return Math.max(0, ...Array.from(m.values()));
};

const isThreeStraightish = (cards: Card[]): boolean => {
  // 3枚のrankValueをソートし、ギャップ合計<=2 を「近接」とみなす（簡易）
  const vals = cards.map(c => rankValue(c.rank)).sort((a,b)=>a-b);
  // A2345 などは厳密にやるなら補正が要るが、Lv2では簡易でOK
  const gap1 = vals[1] - vals[0];
  const gap2 = vals[2] - vals[1];
  return (gap1 >= 1 && gap2 >= 1 && (gap1 + gap2) <= 3); // 連結〜1gap程度
};

export const evalTier3rd = (
  meCards3: Card[],                 // down2+up1
  deadRankCount: Record<Rank, number>,
  deadSuitCount: Record<Suit, number>,
): Tier3rd => {
  const byRank = countByRank(meCards3);
  const ranks = Object.keys(byRank) as Rank[];

  const hasTrips = ranks.some(r => byRank[r] === 3);
  if (hasTrips) return "S";

  const pairRank = ranks.find(r => byRank[r] === 2);
  if (pairRank) {
    const v = rankValue(pairRank);
    if (v >= 11) return "S";      // JJ+
    if (v >= 7) return "A";       // 77–TT
    return "B";                   // 22–66
  }

  // 3-flush
  const suitMax = maxSameSuit(meCards3);
  if (suitMax === 3) {
    // Live: deadSuit>=3 なら2段階降格
    const suit = meCards3[0].suit; // 3枚同スート前提（厳密には検出する）
    const deadSuit = deadSuitCount[suit] ?? 0;

    // A/K/Q を含むなら上位
    const high = Math.max(...meCards3.map(c => rankValue(c.rank)));
    const base: Tier3rd = (high >= 12) ? "A" : "B"; // Q以上含む→A
    if (deadSuit >= 3) return "C";
    if (deadSuit === 2 && base === "A") return "B";
    return base;
  }

  // 3-straight-ish
  if (isThreeStraightish(meCards3)) {
    // Live: 必要ランク算出は簡易化して、deadRankが多いほど降格（任意）
    const high = Math.max(...meCards3.map(c => rankValue(c.rank)));
    return (high >= 11) ? "A" : "B"; // J以上を含むならA
  }

  // 高ドア単体
  // up1枚は meCards3 に含まれている前提で「最大ランク」をドア相当として扱うのは雑なので、
  // 実装側で "meUp[0]" をドアとして渡してもよい。ここでは簡易に最大で判定。
  const doorHigh = Math.max(...meCards3.map(c => rankValue(c.rank)));
  if (doorHigh >= 11) return "C"; // J/Q/K/A
  return "D";
};
```

※ 上は“最小で動く”実装例です。  
あなたがより強くしたい場合、**ドアカードは `me.up[0]` を明確に参照**し、ダウン2枚の情報と分離して評価するほうが精度が上がります。

---

## 5. Threat（相手ボード圧）の最小実装
- 相手ごとにスコア計算し、最大値を採用

```ts
export const scoreThreatForUp = (up: Card[]): number => {
  if (up.length === 0) return 0;
  let score = 0;

  // pair in up
  const byRank = new Map<Rank, number>();
  const bySuit = new Map<Suit, number>();
  for (const c of up) {
    byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1);
    bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + 1);
  }

  const hasOpenPair = Array.from(byRank.values()).some(v => v >= 2);
  if (hasOpenPair) score += 5;

  const maxSuit = Math.max(0, ...Array.from(bySuit.values()));
  if (maxSuit === 3) score += 4;
  if (maxSuit >= 4) score += 6;

  // A high pressure
  if (up.some(c => c.rank === "A")) score += 2;
  const highCount = up.filter(c => ["K","Q"].includes(c.rank)).length;
  if (highCount >= 2) score += 1;

  // straight-ish up (簡易: 値をソートし、連結3枚以上なら加点)
  const vals = up.map(c => rankValue(c.rank)).sort((a,b)=>a-b);
  let run = 1;
  for (let i=1;i<vals.length;i++) {
    if (vals[i] === vals[i-1] + 1) run += 1;
    else run = 1;
    if (run === 3) score += 4;
    if (run === 4) score += 6;
  }

  return Math.min(score, 10);
};

export const scoreThreat = (opponents: { up: Card[] }[]): number => {
  let max = 0;
  for (const o of opponents) max = Math.max(max, scoreThreatForUp(o.up));
  return max;
};
```

---

## 6. Live判定（フラ/ストレ/ペア改善の最小実装）
Lv2では「GOOD/OK/BAD」の3段階で十分。

```ts
export type LiveGrade = "GOOD" | "OK" | "BAD";

export const liveForFlushSuit = (
  suit: Suit,
  deadSuitCount: Record<Suit, number>,
): LiveGrade => {
  const dead = deadSuitCount[suit] ?? 0;
  if (dead <= 1) return "GOOD";
  if (dead === 2) return "OK";
  return "BAD"; // >=3
};

export const liveForPairImprove = (
  pairRank: Rank,
  deadRankCount: Record<Rank, number>,
): LiveGrade => {
  const dead = deadRankCount[pairRank] ?? 0;
  if (dead === 0) return "GOOD";
  if (dead === 1) return "OK";
  return "BAD"; // >=2
};
```

ストレの必要ランクを厳密に出すのはやや面倒なので、Lv2では次のいずれかを推奨：
- A案: “必要ランク算出”まで実装して deadRankCount 参照（精度高）
- B案: “3ストレ/4ストレ判定だけ”にして Liveは一律OK扱い（簡易だが強さは少し落ちる）

まずはA案が良いです（強めにしたいので）。

---

## 7. 4th〜7thのCategory（M/D/N）最小実装
厳密な役判定ロジックは別に既存があるはずなので、CPU側では軽量に分類して良い。

### 7.1 簡易分類ルール
- M: 自分の見えているカード（up+down）で
  - ペア以上が確定、または
  - upにオープンペアがある
- D: 4フラ or 4ストレ（近接）などが見えている
- N: 上記以外

（役判定関数を呼べるならそれを使ってM判定を強化してよい）

---

## 8. allowedActions フォールバック共通関数
CPUは「望ましいアクション」を返したいが、許可されない場合があるので必須。

```ts
import type { EventType } from "../types";

const has = (allowed: EventType[], t: EventType) => allowed.includes(t);

export const pickAction = (
  allowed: EventType[],
  pref: EventType[],
): EventType => {
  for (const t of pref) if (has(allowed, t)) return t;
  // 最低限の保険
  if (has(allowed, "CHECK")) return "CHECK";
  if (has(allowed, "CALL")) return "CALL";
  if (has(allowed, "FOLD")) return "FOLD";
  // ここまで来るのは想定外
  return allowed[0];
};
```

---

## 9. 次に実装するファイル（実装AIへの具体タスク）
1) `buildVisibleContext(state, seat)` を実装しテスト
2) `evalTier3rd()` を実装しテスト
3) `scoreThreat()` を実装しテスト
4) `studHiLv15.decide()` で streetごとの意思決定を実装
5) 主要ケースをスナップショット or テーブル駆動でテスト（Tier/Threat/5th分岐が特に重要）

---
