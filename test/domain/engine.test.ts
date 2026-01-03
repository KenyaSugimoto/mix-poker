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
    eventLog: [],
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

    it("DEAL_CARD_6TH後に先頭アクターがアップカードに基づいて決定されること（ペア > ハイカード）", () => {
      // 5thまでの状態: seat0はAハイカード、seat1はハイカード
      const state5th: DealState = {
        ...initialState,
        street: "5th",
        deck: [
          // seat0には9が配られる（ペアにならない）
          { rank: "9", suit: "c" } as Card,
          // seat1には7が配られる（7のペアになる）
          { rank: "7", suit: "d" } as Card,
        ],
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "A", suit: "s" } as Card, // 3rd
              { rank: "K", suit: "h" } as Card, // 4th
              { rank: "Q", suit: "d" } as Card, // 5th
            ],
          },
          1: {
            downCards: [
              { rank: "4", suit: "c" } as Card,
              { rank: "5", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "7", suit: "s" } as Card, // 3rd - 7
              { rank: "8", suit: "h" } as Card, // 4th
              { rank: "6", suit: "d" } as Card, // 5th
            ],
          },
        },
      };

      // DEAL_CARD_6TH イベント
      const event: Event = {
        id: generateId(),
        type: "DEAL_CARD_6TH",
        seat: null,
        street: "6th",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(state5th, event);

      // 各seatのアップカードを確認
      // seat0: A K Q 9 (ハイカード)
      // seat1: 7 8 6 7 (ペア)
      expect(nextState.hands[0].upCards).toHaveLength(4);
      expect(nextState.hands[1].upCards).toHaveLength(4);

      // ペアを持つseat1が先頭アクターになる
      expect(nextState.currentActorIndex).toBe(1);
    });

    it("DEAL_CARD_4TH後に先頭アクターがアップカードに基づいて決定されること", () => {
      // 3rdまでの状態: seat0は2、seat1はA
      const state3rd: DealState = {
        ...initialState,
        street: "3rd",
        deck: [
          // seat0には2が配られる（2のペアになる）
          { rank: "2", suit: "d" } as Card,
          // seat1にはKが配られる（ハイカード）
          { rank: "K", suit: "d" } as Card,
        ],
        hands: {
          0: {
            downCards: [
              { rank: "3", suit: "c" } as Card,
              { rank: "4", suit: "c" } as Card,
            ],
            upCards: [{ rank: "2", suit: "s" } as Card], // 3rd - 2
          },
          1: {
            downCards: [
              { rank: "5", suit: "c" } as Card,
              { rank: "6", suit: "c" } as Card,
            ],
            upCards: [{ rank: "A", suit: "s" } as Card], // 3rd - A
          },
        },
      };

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARD_4TH",
        seat: null,
        street: "4th",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(state3rd, event);

      // seat0: 2 2 (ペア) vs seat1: A K (ハイカード)
      // ペアを持つseat0が先頭アクターになる
      expect(nextState.currentActorIndex).toBe(0);
    });

    it("DEAL_CARD_5TH後に先頭アクターがアップカードに基づいて決定されること", () => {
      // 4thまでの状態
      const state4th: DealState = {
        ...initialState,
        street: "4th",
        deck: [
          // seat0にはQが配られる（ハイカードのまま）
          { rank: "Q", suit: "d" } as Card,
          // seat1にはKが配られる（Kのペアになる）
          { rank: "K", suit: "d" } as Card,
        ],
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "A", suit: "s" } as Card, // 3rd
              { rank: "J", suit: "h" } as Card, // 4th
            ],
          },
          1: {
            downCards: [
              { rank: "4", suit: "c" } as Card,
              { rank: "5", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "K", suit: "s" } as Card, // 3rd - K
              { rank: "T", suit: "h" } as Card, // 4th
            ],
          },
        },
      };

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARD_5TH",
        seat: null,
        street: "5th",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(state4th, event);

      // seat0: A J Q (ハイカード) vs seat1: K T K (ペア)
      // ペアを持つseat1が先頭アクターになる
      expect(nextState.currentActorIndex).toBe(1);
    });

    it("DEAL_CARD_7TH後もupcardに基づいて先頭アクターが決定されること", () => {
      // 6thまでの状態: seat0がペア（先頭）、seat1がハイカード
      const state6th: DealState = {
        ...initialState,
        street: "6th",
        currentActorIndex: 1, // 6thでseat1が先だったと仮定
        deck: [
          // ダウンカードなので何が配られても先頭アクターの決定には影響しない
          { rank: "A", suit: "c" } as Card,
          { rank: "K", suit: "c" } as Card,
        ],
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "9", suit: "s" } as Card,
              { rank: "9", suit: "h" } as Card, // ペア
              { rank: "8", suit: "d" } as Card,
              { rank: "7", suit: "c" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "4", suit: "c" } as Card,
              { rank: "5", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "K", suit: "h" } as Card,
              { rank: "Q", suit: "d" } as Card,
              { rank: "J", suit: "c" } as Card, // ハイカード
            ],
          },
        },
      };

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARD_7TH",
        seat: null,
        street: "7th",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(state6th, event);

      // 7thはダウンカードだがfirst actorはupcardに基づいて判定される
      // seat0: 9のペア vs seat1: ハイカード -> seat0が先頭アクター
      expect(nextState.currentActorIndex).toBe(0);
    });

    it("Razz: DEAL_CARD_7TH後もupcardに基づいて先頭アクターが決定されること", () => {
      // 6thまでの状態: seat0が良いロー（ハイカード）、seat1が悪いロー（ペア）
      const state6thRazz: DealState = {
        ...initialState,
        gameType: "razz",
        street: "6th",
        currentActorIndex: 1, // 6thでseat1が先だったと仮定
        deck: [
          { rank: "K", suit: "c" } as Card,
          { rank: "Q", suit: "c" } as Card,
        ],
        hands: {
          0: {
            downCards: [
              { rank: "T", suit: "c" } as Card,
              { rank: "J", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "2", suit: "h" } as Card,
              { rank: "3", suit: "d" } as Card,
              { rank: "4", suit: "c" } as Card, // ハイカード - 良いロー
            ],
          },
          1: {
            downCards: [
              { rank: "K", suit: "h" } as Card,
              { rank: "Q", suit: "h" } as Card,
            ],
            upCards: [
              { rank: "7", suit: "s" } as Card,
              { rank: "7", suit: "h" } as Card, // ペア - 悪いロー
              { rank: "8", suit: "d" } as Card,
              { rank: "9", suit: "c" } as Card,
            ],
          },
        },
      };

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARD_7TH",
        seat: null,
        street: "7th",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(state6thRazz, event);

      // Razzでは良いロー（ハイカード）がfirst actor
      // seat0: A 2 3 4 (ハイカード) vs seat1: 7 7 8 9 (ペア)
      // seat0が先頭アクターになる
      expect(nextState.currentActorIndex).toBe(0);
    });

    it("6thと7thで同じfirst actorになること（upcardが変わらないため）", () => {
      // 5thまでの状態
      const state5th: DealState = {
        ...initialState,
        street: "5th",
        deck: [
          // 6th用カード
          { rank: "9", suit: "c" } as Card,
          { rank: "J", suit: "d" } as Card,
          // 7th用カード（ダウン）
          { rank: "2", suit: "d" } as Card,
          { rank: "3", suit: "d" } as Card,
        ],
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "K", suit: "s" } as Card,
              { rank: "K", suit: "h" } as Card, // ペア
              { rank: "Q", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "4", suit: "c" } as Card,
              { rank: "5", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "T", suit: "h" } as Card,
              { rank: "8", suit: "d" } as Card, // ハイカード
            ],
          },
        },
      };

      // 6thカードを配布
      const state6th = applyEvent(state5th, {
        id: generateId(),
        type: "DEAL_CARD_6TH",
        seat: null,
        street: "6th",
        timestamp: Date.now(),
      });

      // 6thでの先頭アクターを記録
      const firstActor6th = state6th.currentActorIndex;
      // seat0: K K Q 9 (ペア) がfirst actorになるはず
      expect(firstActor6th).toBe(0);

      // 7thカードを配布
      const state7th = applyEvent(state6th, {
        id: generateId(),
        type: "DEAL_CARD_7TH",
        seat: null,
        street: "7th",
        timestamp: Date.now(),
      });

      // 7thでも同じ先頭アクター（upcardは変わらない）
      expect(state7th.currentActorIndex).toBe(firstActor6th);
    });

    it("Razzでは弱いアップカード（ハイカード）を持つプレイヤーが先頭アクターになること", () => {
      // Razz: ハイカード > ペア の優先順位
      const stateRazz: DealState = {
        ...initialState,
        gameType: "razz",
        street: "5th",
        deck: [
          // seat0には9が配られる（ハイカードのまま）
          { rank: "9", suit: "c" } as Card,
          // seat1には7が配られる（7のペアになる）
          { rank: "7", suit: "d" } as Card,
        ],
        hands: {
          0: {
            downCards: [
              { rank: "K", suit: "c" } as Card,
              { rank: "Q", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "A", suit: "s" } as Card, // 3rd - A (Low)
              { rank: "2", suit: "h" } as Card, // 4th
              { rank: "3", suit: "d" } as Card, // 5th
            ],
          },
          1: {
            downCards: [
              { rank: "J", suit: "c" } as Card,
              { rank: "T", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "7", suit: "s" } as Card, // 3rd - 7
              { rank: "8", suit: "h" } as Card, // 4th
              { rank: "6", suit: "d" } as Card, // 5th
            ],
          },
        },
      };

      const event: Event = {
        id: generateId(),
        type: "DEAL_CARD_6TH",
        seat: null,
        street: "6th",
        timestamp: Date.now(),
      };

      const nextState = applyEvent(stateRazz, event);

      // Razzでは:
      // seat0: A 2 3 9 (ハイカード - 良いロー)
      // seat1: 7 8 6 7 (ペア - 悪いロー)
      // ハイカードを持つseat0が先頭アクターになる
      expect(nextState.currentActorIndex).toBe(0);
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

  describe("RAISE/COMPLETEイベント", () => {
    const threePlayerState: DealState = {
      ...initialState,
      playerCount: 3,
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
        {
          seat: 2,
          kind: "cpu",
          active: true,
          stack: 1000,
          committedTotal: 0,
          committedThisStreet: 0,
        },
      ],
    };

    it("COMPLETEイベントでcurrentBetがsmallBetになること", () => {
      // BRING_IN後の状態
      const afterBringIn = applyEvent(threePlayerState, {
        id: "e1",
        type: "BRING_IN",
        seat: 0,
        street: "3rd",
        amount: 20,
        timestamp: Date.now(),
      });
      expect(afterBringIn.currentBet).toBe(20);

      // COMPLETE
      const afterComplete: Event = {
        id: "e2",
        type: "COMPLETE",
        seat: 1,
        street: "3rd",
        timestamp: Date.now(),
        amount: 40, // smallBet
      };
      const completeState = applyEvent(afterBringIn, afterComplete);
      expect(completeState.currentBet).toBe(40); // smallBetに設定
      expect(completeState.raiseCount).toBe(0);
    });

    it("RAISEイベントでcurrentBetが正しく増加すること（COMPLETE後）", () => {
      // BRING_IN
      let state = applyEvent(threePlayerState, {
        id: "e1",
        type: "BRING_IN",
        seat: 0,
        street: "3rd",
        amount: 20,
        timestamp: Date.now(),
      });

      // COMPLETE (currentBet = smallBet = 40)
      state = applyEvent(state, {
        id: "e2",
        type: "COMPLETE",
        seat: 1,
        street: "3rd",
        timestamp: Date.now(),
        amount: 40,
      });
      expect(state.currentBet).toBe(40);

      // RAISE (currentBet += smallBet = 40 + 40 = 80)
      state = applyEvent(state, {
        id: "e3",
        type: "RAISE",
        seat: 2,
        street: "3rd",
        timestamp: Date.now(),
        amount: 40, // streetBetUnit (smallBet)
      });
      expect(state.currentBet).toBe(80);
      expect(state.raiseCount).toBe(1);
    });

    it("連続RAISEでcurrentBetが正しく増加すること", () => {
      // BRING_IN
      let state = applyEvent(threePlayerState, {
        id: "e1",
        type: "BRING_IN",
        seat: 0,
        street: "3rd",
        amount: 20,
        timestamp: Date.now(),
      });

      // COMPLETE (currentBet = 40)
      state = applyEvent(state, {
        id: "e2",
        type: "COMPLETE",
        seat: 1,
        street: "3rd",
        timestamp: Date.now(),
        amount: 40,
      });

      // 1st RAISE (currentBet = 40 + 40 = 80)
      state = applyEvent(state, {
        id: "e3",
        type: "RAISE",
        seat: 2,
        street: "3rd",
        timestamp: Date.now(),
        amount: 40,
      });
      expect(state.currentBet).toBe(80);
      expect(state.raiseCount).toBe(1);

      // 2nd RAISE (currentBet = 80 + 40 = 120)
      state = applyEvent(state, {
        id: "e4",
        type: "RAISE",
        seat: 0,
        street: "3rd",
        timestamp: Date.now(),
        amount: 40,
      });
      expect(state.currentBet).toBe(120);
      expect(state.raiseCount).toBe(2);

      // 3rd RAISE (currentBet = 120 + 40 = 160)
      state = applyEvent(state, {
        id: "e5",
        type: "RAISE",
        seat: 1,
        street: "3rd",
        timestamp: Date.now(),
        amount: 40,
      });
      expect(state.currentBet).toBe(160);
      expect(state.raiseCount).toBe(3);
    });

    it("BigBetストリートでRAISEが正しく機能すること", () => {
      // 5thストリート（bigBet使用）の状態
      const state5th: DealState = {
        ...threePlayerState,
        street: "5th",
        currentBet: 0,
      };

      // BET (currentBet = bigBet = 80)
      let state = applyEvent(state5th, {
        id: "e1",
        type: "BET",
        seat: 0,
        street: "5th",
        timestamp: Date.now(),
        amount: 80,
      });
      expect(state.currentBet).toBe(80);

      // RAISE (currentBet = 80 + 80 = 160)
      state = applyEvent(state, {
        id: "e2",
        type: "RAISE",
        seat: 1,
        street: "5th",
        timestamp: Date.now(),
        amount: 80, // bigBet
      });
      expect(state.currentBet).toBe(160);
      expect(state.raiseCount).toBe(1);
    });
  });
});
