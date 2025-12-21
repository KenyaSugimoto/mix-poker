import { getAllCardsForSeat } from "./cards/dealing";
import { distributePot } from "./showdown/distributePot";
import { resolveShowdown } from "./showdown/resolveShowdown";
import { calcDeltaStacks } from "./showdown/scores";
import type {
  Card,
  DealState,
  DealSummary,
  GamePlayer,
  GameState,
  GameType,
  PlayerId,
  RotationRule,
  SeatIndex,
  Stakes,
} from "./types";

export interface StartDealParams {
  rngSeed: string; // 将来使用
  seatOrder: PlayerId[];
}

/**
 * 初期GameStateを作成する純関数
 */
export const createInitialGameState = (
  players: GamePlayer[],
  rotation: RotationRule,
  stakes: Stakes,
): GameState => {
  const gameId = `game-${Date.now()}`;

  // 初期スタックはMVPでは固定（例: 200BB or input）
  // ここではplayersのstackプロパティに何も持たせてないので、score.stacksで管理する前提
  // PlayerConfigListでは name/id/kind しか設定していないので、defaultsを与える
  const initialStacks: Record<string, number> = {};
  // デフォルト 200 * BigBet としておく (例)
  const startingStack = stakes.bigBet * 100; // MVP default

  players.forEach((p) => {
    initialStacks[p.id] = startingStack;
  });

  return {
    gameId,
    players,
    score: {
      stacks: initialStacks,
    },
    stakes,
    rotation,
    dealIndex: 0, // 0-based, first deal is 0
    currentDeal: null,
    dealHistory: [],
    gameFinished: false,
  };
};

/**
 * 現在のディール番号に基づいてゲーム種別を決定する
 */
export const getCurrentGameType = (
  rotation: RotationRule,
  dealIndex: number,
): GameType => {
  const { sequence, dealPerGame } = rotation;
  if (!sequence.length) return "studHi"; // fallback

  const block = Math.floor(dealIndex / dealPerGame);
  const idx = block % sequence.length;
  return sequence[idx];
};

/**
 * 新しいディールを開始し、GameState.currentDeal にセットする
 * (Action適用前に呼ぶ純関数)
 */
export const startNewDeal = (
  game: GameState,
  params: StartDealParams,
): GameState => {
  const gameType = getCurrentGameType(game.rotation, game.dealIndex);

  const startedAt = Date.now();
  const newDeal: DealState = {
    dealId: `deal-${Date.now()}`, // MVP: 簡易生成
    gameType,
    playerCount: params.seatOrder.length,
    players: params.seatOrder.map((pid, i) => {
      // GamePlayer情報をルックアップ（なければゲスト扱い）
      const pInfo = game.players.find((p) => p.id === pid);
      return {
        seat: i,
        kind: pInfo ? pInfo.kind : "human",
        active: true,
        // 前回のスタックを引き継ぐ（currentDeal初期化時はまだpot移動前だが、
        // startNewDealは「次のディール」なので、前のディールの結果反映後のGameを渡す前提）
        stack: game.score.stacks[pid] ?? 0,
        committedTotal: 0,
        committedThisStreet: 0,
      };
    }),
    seatOrder: params.seatOrder,
    ante: game.stakes.ante,
    bringIn: game.stakes.bringIn,
    smallBet: game.stakes.smallBet,
    bigBet: game.stakes.bigBet,
    street: "3rd", // Stud系は3rd開始
    bringInIndex: 0, // 仮: カード配布後に決定
    currentActorIndex: 0, // 仮: カード配布後に決定
    pot: 0,
    currentBet: 0,
    raiseCount: 0,
    pendingResponseCount: 0, // 後続のDEAL_INITイベント等で計算
    checksThisStreet: 0,
    actionsThisStreet: [],
    dealFinished: false,
    deck: [], // DEAL_INITイベントで初期化
    rngSeed: params.rngSeed,
    hands: {}, // DEAL_INITイベントで初期化
    startedAt,
  };

  return {
    ...game,
    currentDeal: newDeal,
    // dealIndexはここでは増やさない（DEAL_ENDで増やす）
  };
};

/**
 * ディール終了処理
 * - ショーダウン解決
 * - ポット分配
 * - deltaStacks計算
 * - DealSummary生成
 * - GameState更新（履歴追加、スコア更新、currentDeal=null、dealIndex++）
 */
export const finishDeal = (game: GameState, deal: DealState): GameState => {
  // seatToPlayerId変換関数
  const seatToPlayerId = (seat: SeatIndex): PlayerId => {
    return deal.seatOrder[seat] || `unknown-${seat}`;
  };

  // 全員foldの場合（1人だけ残っている）
  const activeSeats = deal.players
    .map((p, idx) => (p.active ? idx : -1))
    .filter((idx) => idx >= 0);

  let winnersHigh: SeatIndex[] = [];
  let winnersLow: SeatIndex[] | undefined;

  if (activeSeats.length === 1) {
    // 全員fold: 残った1人が勝者
    winnersHigh = activeSeats;
  } else {
    // ショーダウン: 役判定
    const hands: Record<SeatIndex, Card[]> = {};
    for (const seat of activeSeats) {
      hands[seat] = getAllCardsForSeat(deal.hands, seat);
    }

    const showdownResult = resolveShowdown(deal, hands);
    winnersHigh = showdownResult.winnersHigh;
    winnersLow = showdownResult.winnersLow;
  }

  // ポット分配
  const potShare = distributePot(
    deal.gameType,
    deal.pot,
    winnersHigh,
    winnersLow || null,
    seatToPlayerId,
  );

  // deltaStacks計算
  const deltaStacks = calcDeltaStacks(deal, potShare, seatToPlayerId);

  // スコア更新
  const newStacks: Record<PlayerId, number> = { ...game.score.stacks };
  for (const pid of Object.keys(deltaStacks)) {
    newStacks[pid] = (newStacks[pid] || 0) + deltaStacks[pid];
  }

  // DealSummary生成
  const endedAt = Date.now();
  const summary: DealSummary = {
    dealId: deal.dealId,
    gameType: deal.gameType,
    startedAt: deal.startedAt || endedAt,
    endedAt,
    winnersHigh: winnersHigh.map(seatToPlayerId),
    winnersLow: winnersLow?.map(seatToPlayerId),
    pot: deal.pot,
    deltaStacks,
    potShare, // 各プレイヤーが獲得したpot額
  };

  // GameState更新
  const newHistory = [summary, ...game.dealHistory].slice(0, 200); // 最大200件

  return {
    ...game,
    score: {
      stacks: newStacks,
    },
    dealHistory: newHistory,
    currentDeal: null,
    dealIndex: game.dealIndex + 1,
  };
};
