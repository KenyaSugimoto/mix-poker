import { UI_STRINGS } from "../constants/uiStrings";

/**
 * アクションタイプから日本語ラベルに変換
 */
export const getActionLabel = (actionType: string | null): string => {
  if (!actionType) return "";
  switch (actionType) {
    case "BRING_IN":
      return UI_STRINGS.ACTIONS.BRING_IN;
    case "COMPLETE":
      return UI_STRINGS.ACTIONS.COMPLETE;
    case "BET":
      return UI_STRINGS.ACTIONS.BET;
    case "RAISE":
      return UI_STRINGS.ACTIONS.RAISE;
    case "CALL":
      return UI_STRINGS.ACTIONS.CALL;
    case "CHECK":
      return UI_STRINGS.ACTIONS.CHECK;
    case "FOLD":
      return UI_STRINGS.ACTIONS.FOLD;
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

/**
 * プレイヤーアクションのみをフィルタリングするためのタイプ一覧
 */
export const PLAYER_ACTION_TYPES = [
  "BET",
  "RAISE",
  "CALL",
  "FOLD",
  "CHECK",
  "BRING_IN",
  "COMPLETE",
] as const;
