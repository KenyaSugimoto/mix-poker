import { describe, expect, it, beforeEach, vi } from "vitest";
import { useAppStore } from "../../src/app/store/appStore";
import { saveAppState } from "../../src/app/store/persistence";

// モック化: saveAppState をスパイする
vi.mock("../../src/app/store/persistence", async () => {
    const actual = await vi.importActual("../../src/app/store/persistence");
    return {
        ...actual,
        saveAppState: vi.fn(),
    };
});

describe("storeFlow", () => {
  beforeEach(() => {
    // ストアのリセット
    useAppStore.getState().resetAll();
    vi.clearAllMocks();
  });

  it("初期化時に状態がデフォルトであること", () => {
    const state = useAppStore.getState();
    expect(state.ui.screen).toBe("SETUP");
    expect(state.game).toBeNull();
  });

  it("startNewGame でゲームが開始され、画面が PLAY になること", () => {
    const store = useAppStore.getState();
    // 最小限のダミーGameState
    const dummyGame: any = {
       gameId: "g1",
       currentDeal: null,
       score: { stacks: {} },
       players: [],
       rotation: {},
       dealIndex: 0,
       dealHistory: [],
       stakes: { ante: 10, bringIn: 20, smallBet: 40, bigBet: 80 }
    };
    
    store.startNewGame(dummyGame);
    
    const newState = useAppStore.getState();
    expect(newState.game).toBe(dummyGame);
    expect(newState.ui.screen).toBe("PLAY");
  });

  it("startDeal で新しいディールがセットされること", () => {
    const store = useAppStore.getState();
    const dummyGame: any = {
       gameId: "g1",
       currentPlayerId: "p1",
       dealIndex: 0,
       rotation: { sequence: ["studHi"], dealPerGame: 6 },
       players: [{ id: "p1", kind: "human" }, { id: "p2", kind: "cpu" }],
       stakes: { ante: 10, bringIn: 20, smallBet: 40, bigBet: 80 },
       score: { stacks: {} },
    };
    store.startNewGame(dummyGame);

    store.startDeal({
        rngSeed: "seed",
        seatOrder: ["p1", "p2"]
    });

    const newState = useAppStore.getState();
    expect(newState.game?.currentDeal).not.toBeNull();
    expect(newState.game?.currentDeal?.playerCount).toBe(2);
  });

  it("STREET_ADVANCE イベントで自動保存が呼ばれること", () => {
    const store = useAppStore.getState();
    // Setup game with currentDeal
    const dummyGame: any = {
       gameId: "g1",
       rotation: { sequence: ["studHi"], dealPerGame: 6 },
       players: [{ id: "p1", kind: "human" }, { id: "p2", kind: "cpu" }],
       stakes: { ante: 10 },
       score: { stacks: {} },
    };
    store.startNewGame(dummyGame);
    store.startDeal({ rngSeed: "s", seatOrder: ["p1", "p2"] });

    // Ensure we have a deal
    expect(useAppStore.getState().game?.currentDeal).toBeDefined();

    // Dispatch STREET_ADVANCE
    store.dispatch({
        id: "e1",
        type: "STREET_ADVANCE",
        seat: null,
        street: "4th",
        timestamp: Date.now()
    });

    // saveAppState が呼ばれたか確認
    expect(saveAppState).toHaveBeenCalled();
  });

  it("通常のイベント（BETなど）では保存されないこと", () => {
    const store = useAppStore.getState();
    const dummyGame: any = {
        gameId: "g1",
       rotation: { sequence: ["studHi"], dealPerGame: 6 },
       players: [{ id: "p1", kind: "human" }, { id: "p2", kind: "cpu" }],
       stakes: { ante: 10 },
       score: { stacks: {} },
     };
     store.startNewGame(dummyGame);
     store.startDeal({ rngSeed: "s", seatOrder: ["p1", "p2"] });

     store.dispatch({
         id: "e2",
         type: "POST_ANTE",
         seat: 0,
         street: null,
         amount: 10,
         timestamp: Date.now()
     });

     expect(saveAppState).not.toHaveBeenCalled();
  });
});
