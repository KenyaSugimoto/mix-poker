import type {
  DealState,
  GamePlayer,
  GameState,
  GameType,
  PlayerId,
  RotationRule,
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
  };

  return {
    ...game,
    currentDeal: newDeal,
    // dealIndexはここでは増やさない（DEAL_ENDで増やす）
  };
};
