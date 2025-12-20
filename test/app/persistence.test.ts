import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  saveAppState,
  loadAppState,
  STORAGE_KEY,
  STORAGE_VERSION,
} from "../../src/app/store/persistence";
import type { AppState } from "../../src/app/types";

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const validState: AppState = {
    version: STORAGE_VERSION,
    ui: {
      screen: "SETUP",
      selectedDealId: null,
      displayUnit: "points",
    },
    game: null,
    fullStore: {
      fullDealIds: [],
      fullDealsById: {},
      favoriteDealIds: [],
    },
    lastLoadError: null,
  };

  it("正常な状態を保存・復元できること", () => {
    saveAppState(validState);
    const loaded = loadAppState();
    expect(loaded).toEqual(validState);
  });

  it("保存データがない場合 null を返すこと", () => {
    const loaded = loadAppState();
    expect(loaded).toBeNull();
  });

  it("不正なJSONの場合 null を返すこと", () => {
    localStorage.setItem(STORAGE_KEY, "{ invalid json");
    const loaded = loadAppState();
    // Zod parse error or JSON parse error -> catch -> null
    expect(loaded).toBeNull();
  });

  it("スキーマに違反する場合 null を返すこと", () => {
    const invalidState = { ...validState, version: "invalid" }; // number expected
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));
    
    const loaded = loadAppState();
    expect(loaded).toBeNull();
  });
});
