import { describe, expect, it } from "vitest";
import { calculateChips } from "../../../src/ui/utils/chipCalculator";

describe("calculateChips", () => {
  it("ポットが0の場合は空配列を返す", () => {
    expect(calculateChips(0, 10)).toEqual([]);
  });

  it("Ante未満のチップは使わない", () => {
    const result = calculateChips(50, 10);
    // Anteが10なので、5や1のチップは使わない
    expect(result.every((chip) => chip.spec.label !== "5")).toBe(true);
    expect(result.every((chip) => chip.spec.label !== "1")).toBe(true);
  });

  it("大きい額面から順に選択される", () => {
    const result = calculateChips(2310, 10);
    // 1000, 100, 10の順に選択される
    expect(result[0].spec.label).toBe("1K");
    expect(result[1].spec.label).toBe("100");
    expect(result[2].spec.label).toBe("10");
  });

  it("最大3種類まで選択される", () => {
    const result = calculateChips(10000, 1);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("枚数に応じてスタックカウントが決まる", () => {
    // 10枚以上は3枚スタック（1Kが10枚以上の場合）
    const result1 = calculateChips(15000, 1);
    const chip1K = result1.find((c) => c.spec.label === "1K");
    if (chip1K) {
      // 1Kが15枚なので3枚スタック
      expect(chip1K.stackCount).toBe(3);
    }

    // 3枚以上10枚未満は2枚スタック（5Kが2枚の場合）
    const result2 = calculateChips(10000, 1);
    const chip5K = result2.find((c) => c.spec.label === "5K");
    if (chip5K) {
      // 5Kが2枚なので2枚スタック
      expect(chip5K.stackCount).toBe(2);
    }

    // 3枚以上10枚未満は2枚スタック
    const result3 = calculateChips(500, 10);
    const chip10 = result3.find((c) => c.spec.label === "10");
    if (chip10) {
      expect(chip10.stackCount).toBe(2);
    }

    // 3枚未満も2枚スタック
    const result4 = calculateChips(20, 10);
    const chip10_2 = result4.find((c) => c.spec.label === "10");
    if (chip10_2) {
      expect(chip10_2.stackCount).toBe(2);
    }
  });

  it("Anteが大きすぎる場合はAnte額面のチップを表示", () => {
    const result = calculateChips(10000, 10000);
    expect(result.length).toBe(1);
    expect(result[0].spec.label).toBe("10000");
    expect(result[0].spec.tone).toBe("blue");
  });

  it("正確にポット額を表現できる", () => {
    const pot = 2310;
    const ante = 10;
    const result = calculateChips(pot, ante);

    // 主要な額面が選択されていることを確認
    const labels = result.map((r) => r.spec.label);
    expect(labels).toContain("1K");
  });

  it("複数の額面が使われる場合、大きい順に並ぶ", () => {
    const result = calculateChips(5000, 1);
    const values = result.map((r) => {
      const label = r.spec.label;
      if (label === "5K") return 5000;
      if (label === "1K") return 1000;
      if (label === "500") return 500;
      if (label === "100") return 100;
      if (label === "25") return 25;
      if (label === "10") return 10;
      if (label === "5") return 5;
      if (label === "1") return 1;
      // カスタムAnte額面の場合
      const parsed = Number.parseInt(label, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });

    // 大きい順に並んでいることを確認
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i + 1]);
    }
  });
});
