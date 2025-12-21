/**
 * アクションタイプから日本語ラベルに変換
 */
export const getActionLabel = (actionType: string | null): string => {
  if (!actionType) return "";
  switch (actionType) {
    case "BRING_IN":
      return "Bring In";
    case "COMPLETE":
      return "Complete";
    case "BET":
      return "Bet";
    case "RAISE":
      return "Raise";
    case "CALL":
      return "Call";
    case "CHECK":
      return "Check";
    case "FOLD":
      return "Fold";
    default:
      return "";
  }
};

/**
 * そのストリートにおける直近アクションを取得
 * @param actionsThisStreet - "seat:eventType" 形式の文字列配列
 * @param seatIndex - プレイヤーのseatIndex
 * @returns 直近のアクションタイプ、またはnull
 */
export const getLastAction = (
  actionsThisStreet: string[],
  seatIndex: number,
): string | null => {
  const playerActions = actionsThisStreet
    .filter((action) => action.startsWith(`${seatIndex}:`))
    .map((action) => action.split(":")[1]);

  if (playerActions.length === 0) return null;
  return playerActions[playerActions.length - 1];
};
