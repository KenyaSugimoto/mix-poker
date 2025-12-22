import type {
  Card,
  DealState,
  GameType,
  PlayerHand,
  SeatIndex,
} from "../types";

/**
 * 次のアクター（アクション順）を決定する
 * 全員がアクションを終えた、または1人を除き全員がフォールドした場合は null を返す
 */
export const getNextActor = (state: DealState): SeatIndex | null => {
  if (state.dealFinished) return null;

  const { players, currentActorIndex, playerCount } = state;

  // アクティブなプレイヤーが1人以下なら終了
  const activePlayers = players.filter((p) => p.active);
  if (activePlayers.length <= 1) return null;

  const activeCount = activePlayers.length;

  // CHECKフェーズ（currentBet === 0）の場合
  if (state.currentBet === 0) {
    // 全員がチェックした場合はnullを返す（ストリート終了）
    if (state.checksThisStreet >= activeCount) {
      return null;
    }
    // まだチェックしていないアクティブプレイヤーがいる場合は次のアクターを返す
    for (let i = 1; i <= playerCount; i++) {
      const nextIndex = (currentActorIndex + i) % playerCount;
      const player = players[nextIndex];
      if (player.active) {
        return nextIndex;
      }
    }
    return null;
  }

  // 攻撃フェーズ（currentBet > 0）の場合
  // 次のプレイヤーから順にチェック
  for (let i = 1; i <= playerCount; i++) {
    const nextIndex = (currentActorIndex + i) % playerCount;
    const player = players[nextIndex];

    if (player.active) {
      // pendingResponseCount > 0 の場合のみ次のアクターを返す
      if (state.pendingResponseCount > 0) {
        return nextIndex;
      }
    }
  }

  return null;
};

/**
 * ランクを数値に変換（Hi Hand判定用：A=14, K=13, Q=12, J=11, T=10, 9=9, ..., 2=2）
 */
const rankToNumberForHighHand = (rank: Card["rank"]): number => {
  const map: Record<Card["rank"], number> = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    T: 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
  };
  return map[rank];
};

/**
 * ランクを数値に変換（Low Hand判定用：K=13, Q=12, J=11, T=10, 9=9, ..., 2=2, A=1）
 */
const rankToNumberForLowHand = (rank: Card["rank"]): number => {
  const map: Record<Card["rank"], number> = {
    K: 13,
    Q: 12,
    J: 11,
    T: 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
    A: 1,
  };
  return map[rank];
};

/**
 * スートを数値に変換（♣=0, ♦=1, ♥=2, ♠=3）
 */
const suitToNumber = (suit: Card["suit"]): number => {
  const map: Record<Card["suit"], number> = {
    c: 0, // ♣
    d: 1, // ♦
    h: 2, // ♥
    s: 3, // ♠
  };
  return map[suit];
};

/**
 * 3rd Streetのbring-in対象者を決定する
 * カード情報に基づいて、アップカードの強弱で判定する
 *
 * @param state DealState（handsにカード情報が含まれている必要がある）
 * @returns bring-in対象者のseat index
 */
export const computeBringInIndex = (state: DealState): SeatIndex => {
  const activeSeats = state.players
    .filter((p) => p.active)
    .map((p) => p.seat)
    .sort((a, b) => a - b);

  if (activeSeats.length === 0) {
    return 0; // fallback
  }

  const gameType = state.gameType;
  const isRazz = gameType === "razz";

  // 各アクティブプレイヤーのアップカードを取得
  const upCards: Array<{ seat: SeatIndex; card: Card }> = [];
  for (const seat of activeSeats) {
    const hand = state.hands[seat];
    if (hand && hand.upCards.length > 0) {
      // 3rd StreetではupCardsは1枚のはず
      upCards.push({ seat, card: hand.upCards[0] });
    }
  }

  if (upCards.length === 0) {
    // カード情報がない場合はseat最小を返す（暫定）
    return activeSeats[0];
  }

  // アップカードを比較してbring-in対象者を決定
  // Stud Hi / Stud8：最弱のアップカード（rank最小）
  // Razz：最強のアップカード（rank最大）
  upCards.sort((a, b) => {
    if (isRazz) {
      // Razz：rank最大がbring-in（降順）
      // bring-in判定ではHigh Handのrank値を使用（A=14が最大）
      const aRank = rankToNumberForHighHand(a.card.rank);
      const bRank = rankToNumberForHighHand(b.card.rank);

      if (aRank !== bRank) {
        return bRank - aRank;
      }
      // 同rankの場合：スート順は逆順（♠ < ♥ < ♦ < ♣）
      const aSuit = suitToNumber(a.card.suit);
      const bSuit = suitToNumber(b.card.suit);
      if (aSuit !== bSuit) {
        return bSuit - aSuit; // 逆順
      }
    } else {
      // Stud Hi / Stud8：rank最小がbring-in（昇順）
      const aRank = rankToNumberForHighHand(a.card.rank);
      const bRank = rankToNumberForHighHand(b.card.rank);

      if (aRank !== bRank) {
        return aRank - bRank;
      }
      // 同rankの場合：スート順（♣ < ♦ < ♥ < ♠）
      const aSuit = suitToNumber(a.card.suit);
      const bSuit = suitToNumber(b.card.suit);
      if (aSuit !== bSuit) {
        return aSuit - bSuit;
      }
    }

    // それでも同値ならseat最小
    return a.seat - b.seat;
  });

  return upCards[0].seat;
};

// ------------------------------------------------------------

// 辞書式比較（a>bなら+1, a<bなら-1, equal=0）
const compareLex = (a: number[], b: number[]): number => {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
};

const buildUpcardsScoreHi = (upCards: Card[]): number[] => {
  const vals = upCards.map((c) => rankToNumberForHighHand(c.rank));
  // count by rank value
  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);

  // groups: [{rank, count}]
  const groups = Array.from(counts.entries()).map(([rank, count]) => ({
    rank,
    count,
  }));
  // sort by (count desc, rank desc) for Hi
  groups.sort((a, b) => b.count - a.count || b.rank - a.rank);

  // detect category
  const top = groups[0];
  if (top.count === 4) {
    // [3, quadRank]
    return [3, top.rank];
  }
  if (top.count === 3) {
    const kickers = groups
      .filter((g) => g.count === 1)
      .map((g) => g.rank)
      .sort((a, b) => b - a);
    return [2, top.rank, ...kickers];
  }
  if (top.count === 2) {
    // このスコープでは「2ペア」は出ない（upCards最大4枚なので可能だが、あなたの定義に無い）
    // ただし安全に扱う：2ペアが出たら「ペア」カテゴリ内で強く扱う（ペアランク高い順→次ペア→キッカー）
    const pairs = groups
      .filter((g) => g.count === 2)
      .map((g) => g.rank)
      .sort((a, b) => b - a);
    const kickers = groups
      .filter((g) => g.count === 1)
      .map((g) => g.rank)
      .sort((a, b) => b - a);

    // pairs.length === 1 → 通常のワンペア
    // pairs.length === 2 → ツーペア（拡張）
    return [1, ...pairs, ...kickers];
  }

  // high card
  const sorted = vals.slice().sort((a, b) => b - a);
  return [0, ...sorted];
};

const buildUpcardsScoreRazz = (upCards: Card[]): number[] => {
  const vals = upCards.map((c) => rankToNumberForLowHand(c.rank));
  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);

  const groups = Array.from(counts.entries()).map(([rank, count]) => ({
    rank,
    count,
  }));

  // Razzの「役カテゴリ」は HIGH(最強) > PAIR > TRIPS > QUADS(最弱)
  // 同役なら「大きいカードが小さい方が強い」＝ ranks降順で見たとき、先頭が小さいほど強い
  // → 反転値 inv = 15 - rank を使って“大きいほど強い”へ寄せる
  const inv = (r: number) => 15 - r;

  // まずカテゴリ判定に必要な情報を作る
  const maxCount = Math.max(...groups.map((g) => g.count));

  if (maxCount === 4) {
    const quadRank = groups.find((g) => g.count === 4)!.rank;
    return [0, inv(quadRank)];
  }
  if (maxCount === 3) {
    const tripRank = groups.find((g) => g.count === 3)!.rank;
    const kickers = groups
      .filter((g) => g.count === 1)
      .map((g) => inv(g.rank))
      .sort((a, b) => b - a);
    return [1, inv(tripRank), ...kickers];
  }
  if (maxCount === 2) {
    const pairs = groups
      .filter((g) => g.count === 2)
      .map((g) => inv(g.rank))
      .sort((a, b) => b - a);
    const kickers = groups
      .filter((g) => g.count === 1)
      .map((g) => inv(g.rank))
      .sort((a, b) => b - a);
    return [2, ...pairs, ...kickers];
  }

  // high card：大きいカードが小さいほど強い → ranks降順の比較を inv で反転
  const sortedDesc = vals.slice().sort((a, b) => b - a); // “大きいカード”から見る
  const invSorted = sortedDesc.map(inv); // 小さいほど強いを大きいほど強いへ
  return [3, ...invSorted];
};

// 4th+ 先頭アクター（seat配列から選ぶ）
export const pickFirstActorFromUpcards = (
  gameType: GameType,
  activeSeats: SeatIndex[],
  hands: Record<SeatIndex, PlayerHand>,
): SeatIndex => {
  let bestSeat = activeSeats[0];
  let bestScore: number[] =
    gameType === "razz"
      ? buildUpcardsScoreRazz(hands[bestSeat]?.upCards ?? [])
      : buildUpcardsScoreHi(hands[bestSeat]?.upCards ?? []);

  for (const seat of activeSeats.slice(1)) {
    const score =
      gameType === "razz"
        ? buildUpcardsScoreRazz(hands[seat]?.upCards ?? [])
        : buildUpcardsScoreHi(hands[seat]?.upCards ?? []);

    const cmp = compareLex(score, bestScore);
    if (cmp > 0 || (cmp === 0 && seat < bestSeat)) {
      bestSeat = seat;
      bestScore = score;
    }
  }

  return bestSeat;
};
