import { describe, expect, it } from "vitest";
import {
  getActionLabel,
  getLastAction,
} from "../../../src/ui/utils/actionLabel";

describe("getActionLabel", () => {
  it("各アクションタイプを正しく変換する", () => {
    expect(getActionLabel("BRING_IN")).toBe("Bring In");
    expect(getActionLabel("COMPLETE")).toBe("Complete");
    expect(getActionLabel("BET")).toBe("Bet");
    expect(getActionLabel("RAISE")).toBe("Raise");
    expect(getActionLabel("CALL")).toBe("Call");
    expect(getActionLabel("CHECK")).toBe("Check");
    expect(getActionLabel("FOLD")).toBe("Fold");
  });

  it("nullの場合は空文字を返す", () => {
    expect(getActionLabel(null)).toBe("");
  });

  it("未知のアクションタイプの場合は空文字を返す", () => {
    expect(getActionLabel("UNKNOWN")).toBe("");
  });
});

describe("getLastAction", () => {
  it("該当プレイヤーの最後のアクションを取得する", () => {
    const actions = ["0:BRING_IN", "1:COMPLETE", "0:CALL", "1:RAISE"];
    expect(getLastAction(actions, 0)).toBe("CALL");
    expect(getLastAction(actions, 1)).toBe("RAISE");
  });

  it("該当プレイヤーのアクションがない場合はnullを返す", () => {
    const actions = ["1:BRING_IN", "2:COMPLETE"];
    expect(getLastAction(actions, 0)).toBeNull();
  });

  it("空配列の場合はnullを返す", () => {
    expect(getLastAction([], 0)).toBeNull();
  });

  it("複数のアクションがある場合、最後のものを返す", () => {
    const actions = ["0:BRING_IN", "1:COMPLETE", "0:CALL", "1:RAISE", "0:BET"];
    expect(getLastAction(actions, 0)).toBe("BET");
  });

  it("seatIndexが文字列形式で一致する場合に正しく動作する", () => {
    const actions = ["0:BRING_IN", "10:CALL", "1:RAISE"];
    expect(getLastAction(actions, 1)).toBe("RAISE");
    // seatIndex 10は "10:" で始まるので、seatIndex 1とは区別される
    expect(getLastAction(actions, 10)).toBe("CALL");
  });
});
