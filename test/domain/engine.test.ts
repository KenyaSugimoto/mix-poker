import { describe, expect, it } from "vitest";
import { applyEvent } from "../../src/domain/engine/applyEvent";
import type { Card, DealState, Event } from "../../src/domain/types";
import { generateId } from "../../src/domain/utils/id";

describe("applyEvent", () => {
  const initialState: DealState = {
    dealId: "test-deal",
    gameType: "studHi",
    playerCount: 2,
    players: [
      {
        seat: 0,
        kind: "human",
        active: true,
        stack: 1000,
        committedTotal: 0,
        committedThisStreet: 0,
      },
      {
        seat: 1,
        kind: "cpu",
        active: true,
        stack: 1000,
        committedTotal: 0,
        committedThisStreet: 0,
      },
    ],
    seatOrder: ["player1", "player2"],
    ante: 10,
    bringIn: 20,
    smallBet: 40,
    bigBet: 80,
    street: "3rd",
    bringInIndex: 0,
    currentActorIndex: 0,
    pot: 0,
    currentBet: 0,
    raiseCount: 0,
    pendingResponseCount: 0,
    checksThisStreet: 0,
    actionsThisStreet: [],
    dealFinished: false,
    deck: [],
    rngSeed: "",
    hands: {},
  };

  it("POST_ANTEイベントが正しく処理されること", () => {
    const event: Event = {
      id: "e1",
      type: "POST_ANTE",
      seat: 0,
      street: null,
      amount: 10,
      timestamp: Date.now(),
    };
    const nextState = applyEvent(initialState, event);
    expect(nextState.players[0].stack).toBe(990);
    expect(nextState.players[0].committedTotal).toBe(10);
    expect(nextState.pot).toBe(10);
  });

  it("BRING_INイベントが正しく処理されること", () => {
    const event: Event = {
      id: "e2",
      type: "BRING_IN",
      seat: 0,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    };
    const nextState = applyEvent(initialState, event);
    expect(nextState.players[0].stack).toBe(980);
    expect(nextState.pot).toBe(20);
    expect(nextState.currentBet).toBe(20);
    expect(nextState.pendingResponseCount).toBe(1);
    expect(nextState.currentActorIndex).toBe(1);
  });

  it("CALLイベントが正しく処理されること", () => {
    // Bring-in state
    const intermediateState = applyEvent(initialState, {
      id: "e2",
      type: "BRING_IN",
      seat: 0,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    });

    const callEvent: Event = {
      id: "e3",
      type: "CALL",
      seat: 1,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    };
    const finalState = applyEvent(intermediateState, callEvent);
    expect(finalState.players[1].stack).toBe(980);
    expect(finalState.pot).toBe(40);
    expect(finalState.pendingResponseCount).toBe(0);
  });

  it("FOLDイベントが正しく処理されること", () => {
    const intermediateState = applyEvent(initialState, {
      id: "e2",
      type: "BRING_IN",
      seat: 0,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    });

    const foldEvent: Event = {
      id: "e3",
      type: "FOLD",
      seat: 1,
      street: "3rd",
      timestamp: Date.now(),
    };
    const finalState = applyEvent(intermediateState, foldEvent);
    expect(finalState.players[1].active).toBe(false);
    // dealFinishedはcheckStreetEndCondition経由で設定されるため、
    // applyEvent単体ではfalseのまま
    expect(finalState.dealFinished).toBe(false);
  });

  it("FOLDイベントでpendingResponseCountが減ること（攻撃フェーズ）", () => {
    // BRING_IN後の状態（攻撃フェーズ、pendingResponseCount = 1）
    const intermediateState = applyEvent(initialState, {
      id: "e2",
      type: "BRING_IN",
      seat: 0,
      street: "3rd",
      amount: 20,
      timestamp: Date.now(),
    });
    expect(intermediateState.pendingResponseCount).toBe(1);

    const foldEvent: Event = {
      id: "e3",
      type: "FOLD",
      seat: 1,
      street: "3rd",
      timestamp: Date.now(),
    };
    const finalState = applyEvent(intermediateState, foldEvent);
    expect(finalState.pendingResponseCount).toBe(0);
  });

  it("FOLDイベントでpendingResponseCountが変わらないこと（checkフェーズ）", () => {
    // checkフェーズ（currentBet = 0）での状態
    const checkPhaseState = {
      ...initialState,
      street: "4th" as const,
      currentBet: 0,
      pendingResponseCount: 0,
    };

    const foldEvent: Event = {
      id: "e3",
      type: "FOLD",
      seat: 0,
      street: "4th",
      timestamp: Date.now(),
    };
    const finalState = applyEvent(checkPhaseState, foldEvent);
    expect(finalState.players[0].active).toBe(false);
    expect(finalState.pendingResponseCount).toBe(0); // 変化なし
  });

  it("CHECKイベントが正しく処理されること", () => {
    // 4th street, no bet
    const checkState = {
      ...initialState,
      street: "4th" as const,
      currentBet: 0,
      pendingResponseCount: 2,
    };

    const checkEvent: Event = {
      id: "e4",
      type: "CHECK",
      seat: 0,
      street: "4th",
      timestamp: Date.now(),
    };
    const nextState = applyEvent(checkState, checkEvent);
    expect(nextState.checksThisStreet).toBe(1);
    // CHECKはcheckフェーズなのでpendingResponseCountは変更しない
    expect(nextState.pendingResponseCount).toBe(2);
  });

  it("STREET_ADVANCEイベントが正しく処理されること", () => {
    // 3rd street end state
    const endState = {
      ...initialState,
      street: "3rd" as const,
      pot: 100,
      currentBet: 20,
      raiseCount: 1,
      checksThisStreet: 0,
      players: [
        { ...initialState.players[0], committedThisStreet: 20 },
        { ...initialState.players[1], committedThisStreet: 20 },
      ],
      hands: {
        0: {
          downCards: [],
          upCards: [
            { rank: "A" as Card["rank"], suit: "s" as Card["suit"] },
            { rank: "K" as Card["rank"], suit: "h" as Card["suit"] },
            { rank: "Q" as Card["rank"], suit: "d" as Card["suit"] },
            { rank: "J" as Card["rank"], suit: "c" as Card["suit"] },
          ],
        },
        1: {
          downCards: [],
          upCards: [
            { rank: "A" as Card["rank"], suit: "c" as Card["suit"] },
            { rank: "K" as Card["rank"], suit: "d" as Card["suit"] },
            { rank: "Q" as Card["rank"], suit: "h" as Card["suit"] },
            { rank: "J" as Card["rank"], suit: "s" as Card["suit"] },
          ],
        },
      },
    };

    const event: Event = {
      id: "e5",
      type: "STREET_ADVANCE",
      seat: null,
      street: "3rd", // 終了したストリート
      timestamp: Date.now(),
    };

    const nextState = applyEvent(endState, event);
    expect(nextState.street).toBe("4th"); // 次のストリートに進む
    expect(nextState.pot).toBe(100); // changes nothing directly
    expect(nextState.currentBet).toBe(0);
    expect(nextState.raiseCount).toBe(0);
    expect(nextState.players[0].committedThisStreet).toBe(0);
    expect(nextState.players[1].committedThisStreet).toBe(0);
    // 先頭アクターが正しく設定されている（カード情報に基づく）
    // カード情報がない場合はseat最小（0）が選ばれる
    expect(nextState.currentActorIndex).toBeGreaterThanOrEqual(0);
    expect(nextState.currentActorIndex).toBeLessThan(nextState.playerCount);
  });

  describe("カード配布イベント", () => {
    it("DEAL_INITイベントが正しく処理されること", () => {
      const event: Event = {
        id: generateId(),
        type: "DEAL_INIT",
        seat: null,
        street: null,
        timestamp: Date.now(),
        rngSeed: "test-seed-123",
      };

      const nextState = applyEvent(initialState, event);

      expect(nextState.rngSeed).toBe("test-seed-123");
      expect(nextState.deck).toHaveLength(52);
      expect(nextState.hands[0]).toEqual({ downCards: [], upCards: [] });
      expect(nextState.hands[1]).toEqual({ downCards: [], upCards: [] });
    });

    it("DEAL_CARDS_3RDイベントが正しく処理されること", () => {
      // DEAL_INITで初期化
      const initState = applyEvent(initialState, {
        id: generateId(),
        type: "DEAL_INIT",
        seat: null,
        street: null,
        timestamp: Date.now(),
        rngSeed: "test-seed",
      });

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARDS_3RD",
        seat: null,
        street: "3rd",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(initState, event);

      // 各active seatにdown2+up1が配られている
      expect(nextState.hands[0].downCards).toHaveLength(2);
      expect(nextState.hands[0].upCards).toHaveLength(1);
      expect(nextState.hands[1].downCards).toHaveLength(2);
      expect(nextState.hands[1].upCards).toHaveLength(1);

      // デッキから6枚消費されている（2人×3枚）
      expect(nextState.deck).toHaveLength(46);

      // bringInIndexとcurrentActorIndexが設定されている
      expect(nextState.bringInIndex).toBeGreaterThanOrEqual(0);
      expect(nextState.bringInIndex).toBeLessThan(nextState.playerCount);
      expect(nextState.currentActorIndex).toBe(nextState.bringInIndex);
    });

    it("DEAL_CARD_4THイベントが正しく処理されること", () => {
      // DEAL_INITとDEAL_CARDS_3RDで初期化
      let state = applyEvent(initialState, {
        id: generateId(),
        type: "DEAL_INIT",
        seat: null,
        street: null,
        timestamp: Date.now(),
        rngSeed: "test-seed",
      });

      state = applyEvent(state, {
        id: generateId(),
        type: "DEAL_CARDS_3RD",
        seat: null,
        street: "3rd",
        timestamp: Date.now(),
      });

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARD_4TH",
        seat: null,
        street: "4th",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(state, event);

      // 各active seatにup1枚追加されている
      expect(nextState.hands[0].upCards).toHaveLength(2); // 3rdで1枚 + 4thで1枚
      expect(nextState.hands[1].upCards).toHaveLength(2);

      // デッキから2枚消費されている
      expect(nextState.deck).toHaveLength(44);
    });

    it("DEAL_CARD_7THイベントが正しく処理されること", () => {
      // DEAL_INITとDEAL_CARDS_3RDで初期化
      let state = applyEvent(initialState, {
        id: generateId(),
        type: "DEAL_INIT",
        seat: null,
        street: null,
        timestamp: Date.now(),
        rngSeed: "test-seed",
      });

      state = applyEvent(state, {
        id: generateId(),
        type: "DEAL_CARDS_3RD",
        seat: null,
        street: "3rd",
        timestamp: Date.now(),
      });

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARD_7TH",
        seat: null,
        street: "7th",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(state, event);

      // 各active seatにdown1枚追加されている
      expect(nextState.hands[0].downCards).toHaveLength(3); // 3rdで2枚 + 7thで1枚
      expect(nextState.hands[1].downCards).toHaveLength(3);

      // デッキから2枚消費されている
      expect(nextState.deck).toHaveLength(44);
    });

    it("fold済みseatにはカードが配られないこと", () => {
      // fold済みの状態を作成
      const foldedState = {
        ...initialState,
        players: [
          { ...initialState.players[0], active: true },
          { ...initialState.players[1], active: false }, // fold済み
        ],
        deck: [],
        rngSeed: "",
        hands: {},
      };

      // DEAL_INITで初期化
      const state = applyEvent(foldedState, {
        id: generateId(),
        type: "DEAL_INIT",
        seat: null,
        street: null,
        timestamp: Date.now(),
        rngSeed: "test-seed",
      });

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARDS_3RD",
        seat: null,
        street: "3rd",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(state, event);

      // activeなseat0には配られている
      expect(nextState.hands[0].downCards).toHaveLength(2);
      expect(nextState.hands[0].upCards).toHaveLength(1);

      // fold済みのseat1には配られていない
      expect(nextState.hands[1]?.downCards?.length ?? 0).toBe(0);
      expect(nextState.hands[1]?.upCards?.length ?? 0).toBe(0);

      // デッキから3枚のみ消費されている（1人×3枚）
      expect(nextState.deck).toHaveLength(49);
    });
  });
});
