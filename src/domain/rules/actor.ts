import type { DealState, SeatIndex } from "../types";

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

  // 次のプレイヤーから順にチェック
  for (let i = 1; i <= playerCount; i++) {
    const nextIndex = (currentActorIndex + i) % playerCount;
    const player = players[nextIndex];

    if (player.active) {
      // 全員のアクションが完了したかの判定
      // 1. 直前のプレイヤーがストリートを終了させるアクションをしたか？
      // （※このロジックは applyEvent 側で pendingResponseCount 等を管理することで簡略化する）
      if (state.pendingResponseCount > 0) {
        return nextIndex;
      }
    }
  }

  return null;
};

/**
 * 3rdストリートのブリングイン発生プレイヤーを決定する
 * (7th Studの特殊ルール: StudHiは一番低いカード, Razzは一番高いカード)
 * ※MVPでは index.ts の bringInIndex をそのまま使うか、暫定ロジックを置く
 */
export const getBringInIndex = (state: DealState): SeatIndex => {
  // TODO: カードの強さに基づく判定
  return state.bringInIndex;
};
