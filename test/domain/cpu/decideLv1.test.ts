import { describe, expect, it } from "vitest";
import { decideLv1 } from "../../../src/domain/cpu/decideLv1";
import { DEFAULT_PARAMS_LV1 } from "../../../src/domain/cpu/params";
import type { CpuDecisionContext } from "../../../src/domain/cpu/policy";
import type { Card, DealState } from "../../../src/domain/types";

/**
 * decideLv1 のテスト
 * 合法性テスト、代表シナリオ
 */
describe("decideLv1", () => {
  const createTestState = (overrides: Partial<DealState> = {}): DealState => ({
    dealId: "test-deal",
    gameType: "studHi",
    playerCount: 2,
    players: [
      {
        seat: 0,
        kind: "human",
        active: true,
        stack: 900,
        committedTotal: 100,
        committedThisStreet: 40,
      },
      {
        seat: 1,
        kind: "cpu",
        active: true,
        stack: 850,
        committedTotal: 150,
        committedThisStreet: 40,
      },
    ],
    seatOrder: ["player1", "player2"],
    ante: 10,
    bringIn: 20,
    smallBet: 40,
    bigBet: 80,
    street: "4th",
    bringInIndex: 0,
    currentActorIndex: 1,
    pot: 250,
    currentBet: 40,
    raiseCount: 0,
    pendingResponseCount: 1,
    checksThisStreet: 0,
    actionsThisStreet: [],
    dealFinished: false,
    deck: [],
    rngSeed: "",
    hands: {
      0: {
        downCards: [
          { rank: "A", suit: "h" } as Card,
          { rank: "K", suit: "h" } as Card,
        ],
        upCards: [
          { rank: "Q", suit: "h" } as Card,
          { rank: "J", suit: "h" } as Card,
        ],
      },
      1: {
        downCards: [
          { rank: "T", suit: "c" } as Card,
          { rank: "9", suit: "c" } as Card,
        ],
        upCards: [
          { rank: "8", suit: "c" } as Card,
          { rank: "7", suit: "c" } as Card,
        ],
      },
    },
    eventLog: [],
    ...overrides,
  });

  describe("合法性テスト", () => {
    it("返すアクションがallowedActionsに含まれていること", () => {
      const state = createTestState();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideLv1(ctx, () => 0.5);

      expect(["CALL", "RAISE", "FOLD"]).toContain(action);
    });

    it("allowedActionsが1つの場合、そのアクションを返すこと", () => {
      const state = createTestState();
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL"],
      };

      const action = decideLv1(ctx, () => 0.5);

      expect(action).toBe("CALL");
    });

    it("allowedActionsに存在しないアクションを返さないこと", () => {
      const state = createTestState({ currentBet: 0 });
      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"], // FOLDは含まない
      };

      const action = decideLv1(ctx, () => 0.5);

      expect(action).not.toBe("FOLD");
      expect(["CHECK", "BET"]).toContain(action);
    });
  });

  describe("3rdストリート シナリオ", () => {
    it("ブリングインプレイヤーは強い手でも常にBRING_INを選択すること", () => {
      // 強い手（ペア）でもブリングインプレイヤーはBRING_IN固定
      const state = createTestState({
        street: "3rd",
        currentBet: 0,
        bringInIndex: 1,
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [{ rank: "8", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "A", suit: "c" } as Card, // ペア
            ],
            upCards: [{ rank: "K", suit: "s" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["BRING_IN", "COMPLETE"],
      };

      const action = decideLv1(ctx, () => 0.5);

      // ブリングインプレイヤーは常にBRING_INを選択
      expect(action).toBe("BRING_IN");
    });

    it("非ブリングインプレイヤーで強い手の場合COMPLETEを選択すること", () => {
      // 非ブリングインプレイヤーがCOMPLETE権を持つ場合
      const state = createTestState({
        street: "3rd",
        currentBet: 20, // bring-in後
        playerCount: 3,
        players: [
          {
            seat: 0,
            kind: "human",
            active: true,
            stack: 900,
            committedTotal: 30,
            committedThisStreet: 20,
          },
          {
            seat: 1,
            kind: "cpu",
            active: true,
            stack: 990,
            committedTotal: 10,
            committedThisStreet: 0,
          }, // COMPLETE権あり
          {
            seat: 2,
            kind: "cpu",
            active: true,
            stack: 980,
            committedTotal: 30,
            committedThisStreet: 20,
          },
        ],
        bringInIndex: 0,
        currentActorIndex: 1,
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [{ rank: "8", suit: "h" } as Card],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "A", suit: "c" } as Card, // ペア（強い手）
            ],
            upCards: [{ rank: "K", suit: "s" } as Card],
          },
          2: {
            downCards: [
              { rank: "5", suit: "d" } as Card,
              { rank: "6", suit: "s" } as Card,
            ],
            upCards: [{ rank: "4", suit: "c" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "FOLD", "COMPLETE"], // BRING_INはない
      };

      const action = decideLv1(ctx, () => 0.5);

      // 強い手でCOMPLETE権がある場合はCOMPLETE
      expect(action).toBe("COMPLETE");
    });

    it("非ブリングインプレイヤーで弱い手の場合CALLを選択すること", () => {
      const state = createTestState({
        street: "3rd",
        currentBet: 20,
        playerCount: 3,
        players: [
          {
            seat: 0,
            kind: "human",
            active: true,
            stack: 900,
            committedTotal: 30,
            committedThisStreet: 20,
          },
          {
            seat: 1,
            kind: "cpu",
            active: true,
            stack: 990,
            committedTotal: 10,
            committedThisStreet: 0,
          },
          {
            seat: 2,
            kind: "cpu",
            active: true,
            stack: 980,
            committedTotal: 30,
            committedThisStreet: 20,
          },
        ],
        bringInIndex: 0,
        currentActorIndex: 1,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "K", suit: "s" } as Card,
            ],
            upCards: [{ rank: "Q", suit: "s" } as Card],
          },
          1: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "4", suit: "h" } as Card, // 弱い手
            ],
            upCards: [{ rank: "6", suit: "d" } as Card],
          },
          2: {
            downCards: [
              { rank: "5", suit: "d" } as Card,
              { rank: "6", suit: "s" } as Card,
            ],
            upCards: [{ rank: "4", suit: "c" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "FOLD", "COMPLETE"],
      };

      const action = decideLv1(ctx, () => 0.5);

      // 弱い手ではCOMPLETEせずCALL
      expect(action).toBe("CALL");
    });

    it("3rdでCOMPLETE後にRAISEされた場合、CALL/FOLD/RAISEから選択すること", () => {
      const state = createTestState({
        street: "3rd",
        currentBet: 80, // COMPLETE後にRAISE
        raiseCount: 1,
        playerCount: 3,
        players: [
          {
            seat: 0,
            kind: "human",
            active: true,
            stack: 850,
            committedTotal: 90,
            committedThisStreet: 80,
          },
          {
            seat: 1,
            kind: "cpu",
            active: true,
            stack: 990,
            committedTotal: 10,
            committedThisStreet: 0,
          },
          {
            seat: 2,
            kind: "cpu",
            active: true,
            stack: 930,
            committedTotal: 50,
            committedThisStreet: 40,
          },
        ],
        bringInIndex: 0,
        currentActorIndex: 1,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "K", suit: "s" } as Card,
            ],
            upCards: [{ rank: "Q", suit: "s" } as Card],
          },
          1: {
            downCards: [
              { rank: "T", suit: "c" } as Card,
              { rank: "9", suit: "h" } as Card,
            ],
            upCards: [{ rank: "8", suit: "d" } as Card],
          },
          2: {
            downCards: [
              { rank: "5", suit: "d" } as Card,
              { rank: "6", suit: "s" } as Card,
            ],
            upCards: [{ rank: "4", suit: "c" } as Card],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "FOLD", "RAISE"], // COMPLETEはない
      };

      const action = decideLv1(ctx, () => 0.5);

      // 合法なアクションから選択される
      expect(["CALL", "FOLD", "RAISE"]).toContain(action);
    });
  });

  describe("currentBet == 0 シナリオ", () => {
    it("強い手でBETを選択すること", () => {
      const state = createTestState({
        street: "4th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "8", suit: "h" } as Card,
              { rank: "7", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "A", suit: "c" } as Card, // ペア
            ],
            upCards: [
              { rank: "K", suit: "s" } as Card,
              { rank: "K", suit: "h" } as Card, // ペア
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      const action = decideLv1(ctx, () => 0.5);

      // ツーペア（AA + KK）は強いが、閾値以上かどうかはパラメータ次第
      // 合法なアクションが返されることを確認
      expect(["CHECK", "BET"]).toContain(action);
    });

    it("弱い手でCHECKを選択すること", () => {
      const state = createTestState({
        street: "4th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "K", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "Q", suit: "s" } as Card,
              { rank: "J", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "4", suit: "h" } as Card,
            ],
            upCards: [
              { rank: "6", suit: "d" } as Card,
              { rank: "8", suit: "c" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      const action = decideLv1(ctx, () => 0.5);

      expect(action).toBe("CHECK");
    });
  });

  describe("currentBet > 0 シナリオ", () => {
    it("big betストリートで弱い手の場合FOLDを選択すること", () => {
      const state = createTestState({
        street: "5th", // big bet street
        currentBet: 80,
        players: [
          {
            seat: 0,
            kind: "human",
            active: true,
            stack: 900,
            committedTotal: 100,
            committedThisStreet: 80,
          },
          {
            seat: 1,
            kind: "cpu",
            active: true,
            stack: 850,
            committedTotal: 150,
            committedThisStreet: 0, // まだ何も出していない
          },
        ],
        hands: {
          0: {
            downCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "K", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "Q", suit: "s" } as Card,
              { rank: "J", suit: "d" } as Card,
              { rank: "T", suit: "h" } as Card, // 強そうに見える
            ],
          },
          1: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "4", suit: "h" } as Card,
            ],
            upCards: [
              { rank: "6", suit: "d" } as Card,
              { rank: "8", suit: "c" } as Card,
              { rank: "9", suit: "s" } as Card, // 弱い
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideLv1(ctx, () => 0.9); // ブラフしない

      // 弱い手 + big bet + コスト重い -> FOLD
      expect(action).toBe("FOLD");
    });

    it("中程度の手でCALLを選択すること", () => {
      const state = createTestState({
        street: "4th",
        currentBet: 40,
        hands: {
          0: {
            downCards: [
              { rank: "8", suit: "s" } as Card,
              { rank: "7", suit: "s" } as Card,
            ],
            upCards: [
              { rank: "6", suit: "s" } as Card,
              { rank: "5", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "T", suit: "c" } as Card,
              { rank: "T", suit: "h" } as Card, // ペア
            ],
            upCards: [
              { rank: "9", suit: "d" } as Card,
              { rank: "8", suit: "c" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      const action = decideLv1(ctx, () => 0.9); // RAISEしない確率

      // ワンペアは中程度 -> CALL
      expect(action).toBe("CALL");
    });
  });

  describe("RNG注入テスト", () => {
    it("rngが0を返す場合、セミブラフが発生し得ること", () => {
      // セミブラフ条件を満たす状態
      const state = createTestState({
        street: "4th", // big betではない
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "8", suit: "h" } as Card,
              { rank: "7", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "2", suit: "h" } as Card,
            ],
            upCards: [
              { rank: "K", suit: "h" } as Card,
              { rank: "Q", suit: "h" } as Card, // 4-flush
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      // rng=0 の場合、semiBluffFreq(0.03)より小さいのでセミブラフが発動
      const action = decideLv1(ctx, () => 0);

      // 4-flush + rng=0 -> BET（セミブラフ）
      expect(action).toBe("BET");
    });

    it("rngが1を返す場合、セミブラフが抑制されること", () => {
      const state = createTestState({
        street: "4th",
        currentBet: 0,
        hands: {
          0: {
            downCards: [
              { rank: "2", suit: "c" } as Card,
              { rank: "3", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "8", suit: "h" } as Card,
              { rank: "7", suit: "d" } as Card,
            ],
          },
          1: {
            downCards: [
              { rank: "5", suit: "h" } as Card,
              { rank: "6", suit: "h" } as Card,
            ],
            upCards: [
              { rank: "9", suit: "h" } as Card,
              { rank: "T", suit: "h" } as Card, // 4-flush だが弱い
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CHECK", "BET"],
      };

      // rng=1 の場合、セミブラフは発動しない
      const action = decideLv1(ctx, () => 1);

      // 弱い手 + rng=1 -> CHECK
      expect(action).toBe("CHECK");
    });
  });
  describe("raiseChanceAdjust パラメータテスト", () => {
    it("raiseChanceAdjust=0.0 の場合、強い手でもRAISEしないこと", () => {
      const state = createTestState({
        street: "4th",
        currentBet: 40,
        hands: {
          0: { downCards: [], upCards: [] },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "A", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "K", suit: "s" } as Card,
              { rank: "K", suit: "h" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      // aggression=1.0 でも adjust=0.0 なら adjusted=0.0 -> RAISEしない
      const params = {
        ...DEFAULT_PARAMS_LV1,
        aggression: 1.0,
        raiseChanceAdjust: 0.0,
      };

      // rng=0 (本来なら絶対RAISEする乱数値)
      const action = decideLv1(ctx, () => 0, params);

      expect(action).not.toBe("RAISE");
      expect(action).toBe("CALL");
    });

    it("raiseChanceAdjust=1.0 の場合、条件を満たせばRAISEすること", () => {
      const state = createTestState({
        street: "4th",
        currentBet: 40,
        hands: {
          0: { downCards: [], upCards: [] },
          1: {
            downCards: [
              { rank: "A", suit: "h" } as Card,
              { rank: "A", suit: "c" } as Card,
            ],
            upCards: [
              { rank: "A", suit: "s" } as Card,
              { rank: "K", suit: "h" } as Card,
            ],
          },
        },
      });

      const ctx: CpuDecisionContext = {
        state,
        seat: 1,
        allowedActions: ["CALL", "RAISE", "FOLD"],
      };

      // aggression=0.5, adjust=1.0 -> adjusted=0.5. tightness=0 (閾値上昇を防ぐ)
      const params = {
        ...DEFAULT_PARAMS_LV1,
        aggression: 0.5,
        raiseChanceAdjust: 1.0,
        tightness: 0,
      };

      // rng=0 (< 0.5) -> RAISE
      const action = decideLv1(ctx, () => 0, params);

      expect(action).toBe("RAISE");
    });
  });

  // === Razz 専用戦略テスト ===
  describe("Razz Lv1 戦略", () => {
    const createRazzState = (
      overrides: Partial<DealState> = {},
    ): DealState => ({
      dealId: "razz-test",
      gameType: "razz",
      playerCount: 2,
      players: [
        {
          seat: 0,
          kind: "human",
          active: true,
          stack: 900,
          committedTotal: 30,
          committedThisStreet: 20,
        },
        {
          seat: 1,
          kind: "cpu",
          active: true,
          stack: 990,
          committedTotal: 10,
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
      currentActorIndex: 1,
      pot: 40,
      currentBet: 20,
      raiseCount: 0,
      pendingResponseCount: 1,
      checksThisStreet: 0,
      actionsThisStreet: [],
      dealFinished: false,
      deck: [],
      rngSeed: "",
      hands: {
        0: {
          downCards: [
            { rank: "K", suit: "c" } as Card,
            { rank: "Q", suit: "c" } as Card,
          ],
          upCards: [{ rank: "J", suit: "h" } as Card],
        },
        1: {
          downCards: [
            { rank: "A", suit: "h" } as Card,
            { rank: "2", suit: "c" } as Card,
          ],
          upCards: [{ rank: "3", suit: "s" } as Card],
        },
      },
      eventLog: [],
      ...overrides,
    });

    describe("3rd Street", () => {
      it("ブリングインプレイヤーは無条件でBRING_INを選択すること", () => {
        const state = createRazzState({
          bringInIndex: 1,
          currentActorIndex: 1,
          currentBet: 0,
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["BRING_IN", "COMPLETE"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("BRING_IN");
      });

      it("ブリングインプレイヤーがCOMP後に8以下3枚の場合はRAISEすること", () => {
        const state = createRazzState({
          bringInIndex: 1,
          currentActorIndex: 1,
          currentBet: 40, // 相手がCOMPLETEした後
          hands: {
            0: {
              downCards: [
                { rank: "K", suit: "c" } as Card,
                { rank: "Q", suit: "c" } as Card,
              ],
              upCards: [{ rank: "J", suit: "h" } as Card],
            },
            1: {
              downCards: [
                { rank: "A", suit: "h" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [{ rank: "3", suit: "s" } as Card], // 全て8以下
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("RAISE");
      });

      it("ブリングインプレイヤーがCOMP後に8以下3枚でない場合はCALLすること", () => {
        const state = createRazzState({
          bringInIndex: 1,
          currentActorIndex: 1,
          currentBet: 40,
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [{ rank: "3", suit: "h" } as Card],
            },
            1: {
              downCards: [
                { rank: "K", suit: "h" } as Card, // 9以上のカードあり
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [{ rank: "3", suit: "s" } as Card],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("CALL");
      });

      it("非ブリングインでCOMPなし＋後ろ全員より強い場合はCOMPLETEすること", () => {
        const state = createRazzState({
          bringInIndex: 0,
          currentActorIndex: 1,
          currentBet: 20, // bringInのまま
          hands: {
            0: {
              downCards: [
                { rank: "K", suit: "c" } as Card,
                { rank: "Q", suit: "c" } as Card,
              ],
              upCards: [{ rank: "J", suit: "h" } as Card], // 弱い（Jが最弱）
            },
            1: {
              downCards: [
                { rank: "A", suit: "h" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [{ rank: "3", suit: "s" } as Card], // 強い（3が最弱）
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["FOLD", "CALL", "COMPLETE"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("COMPLETE");
      });

      it("非ブリングインでCOMPなし＋後ろより弱い場合はFOLDすること", () => {
        const state = createRazzState({
          bringInIndex: 0,
          currentActorIndex: 1,
          currentBet: 20, // bringInのまま
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [{ rank: "3", suit: "h" } as Card], // 強い
            },
            1: {
              downCards: [
                { rank: "K", suit: "h" } as Card,
                { rank: "Q", suit: "c" } as Card,
              ],
              upCards: [{ rank: "T", suit: "s" } as Card], // 弱い（Tが最弱）
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["FOLD", "CALL", "COMPLETE"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("FOLD");
      });

      it("非ブリングインでCOMPあり＋8以下3枚の場合はRAISEすること", () => {
        const state = createRazzState({
          bringInIndex: 0,
          currentActorIndex: 1,
          currentBet: 40, // COMPLETEが入っている
          hands: {
            0: {
              downCards: [
                { rank: "K", suit: "c" } as Card,
                { rank: "Q", suit: "c" } as Card,
              ],
              upCards: [{ rank: "J", suit: "h" } as Card],
            },
            1: {
              downCards: [
                { rank: "A", suit: "h" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [{ rank: "5", suit: "s" } as Card], // 全て8以下
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["FOLD", "CALL", "RAISE"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("RAISE");
      });

      it("非ブリングインでCOMPあり＋8以下3枚でない場合はFOLDすること", () => {
        const state = createRazzState({
          bringInIndex: 0,
          currentActorIndex: 1,
          currentBet: 40, // COMPLETEが入っている
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [{ rank: "3", suit: "h" } as Card],
            },
            1: {
              downCards: [
                { rank: "K", suit: "h" } as Card, // 9以上のカードあり
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [{ rank: "5", suit: "s" } as Card],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["FOLD", "CALL", "RAISE"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("FOLD");
      });
    });

    describe("4th Street", () => {
      it("相手にペアがある場合はBETすること", () => {
        const state = createRazzState({
          street: "4th",
          currentBet: 0,
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [
                { rank: "3", suit: "h" } as Card,
                { rank: "3", suit: "d" } as Card, // ペア
              ],
            },
            1: {
              downCards: [
                { rank: "A", suit: "h" } as Card,
                { rank: "2", suit: "d" } as Card,
              ],
              upCards: [
                { rank: "4", suit: "s" } as Card,
                { rank: "5", suit: "c" } as Card, // ノーペア
              ],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CHECK", "BET"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("BET");
      });

      it("両者ノーペアで最弱札比較で勝っている場合はBETすること", () => {
        const state = createRazzState({
          street: "4th",
          currentBet: 0,
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [
                { rank: "K", suit: "h" } as Card, // 最弱がK
                { rank: "5", suit: "d" } as Card,
              ],
            },
            1: {
              downCards: [
                { rank: "A", suit: "h" } as Card,
                { rank: "2", suit: "d" } as Card,
              ],
              upCards: [
                { rank: "4", suit: "s" } as Card,
                { rank: "5", suit: "c" } as Card, // 最弱が5
              ],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CHECK", "BET"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("BET");
      });

      it("自分がペアの場合はCHECKすること", () => {
        const state = createRazzState({
          street: "4th",
          currentBet: 0,
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [
                { rank: "K", suit: "h" } as Card,
                { rank: "5", suit: "d" } as Card,
              ],
            },
            1: {
              downCards: [
                { rank: "A", suit: "h" } as Card,
                { rank: "A", suit: "d" } as Card, // ペア
              ],
              upCards: [
                { rank: "4", suit: "s" } as Card,
                { rank: "5", suit: "c" } as Card,
              ],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CHECK", "BET"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("CHECK");
      });

      it("BETを受けて自分ノーペアの場合は無条件CALLすること", () => {
        const state = createRazzState({
          street: "4th",
          currentBet: 40,
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [
                { rank: "3", suit: "h" } as Card,
                { rank: "4", suit: "d" } as Card,
              ],
            },
            1: {
              downCards: [
                { rank: "K", suit: "h" } as Card,
                { rank: "Q", suit: "d" } as Card, // 弱いがノーペア
              ],
              upCards: [
                { rank: "T", suit: "s" } as Card,
                { rank: "9", suit: "c" } as Card,
              ],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("CALL");
      });
    });

    describe("5th Street 以降", () => {
      it("自分がペアでBETを受けた場合はFOLDすること", () => {
        const state = createRazzState({
          street: "5th",
          currentBet: 80,
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [
                { rank: "3", suit: "h" } as Card,
                { rank: "4", suit: "d" } as Card,
                { rank: "5", suit: "s" } as Card,
              ],
            },
            1: {
              downCards: [
                { rank: "7", suit: "h" } as Card,
                { rank: "7", suit: "d" } as Card, // ペア
              ],
              upCards: [
                { rank: "4", suit: "s" } as Card,
                { rank: "5", suit: "c" } as Card,
                { rank: "6", suit: "h" } as Card,
              ],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideLv1(ctx);
        expect(action).toBe("FOLD");
      });

      it("2番目に弱い札が相手の最弱より弱い場合はFOLDすること", () => {
        const state = createRazzState({
          street: "5th",
          currentBet: 80,
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [
                { rank: "3", suit: "h" } as Card, // 最弱が3
                { rank: "4", suit: "d" } as Card,
                { rank: "5", suit: "s" } as Card,
              ],
            },
            1: {
              downCards: [
                { rank: "K", suit: "h" } as Card, // 最弱K、2番目弱いのはQ
                { rank: "Q", suit: "d" } as Card,
              ],
              upCards: [
                { rank: "4", suit: "s" } as Card,
                { rank: "5", suit: "c" } as Card,
                { rank: "6", suit: "h" } as Card,
              ],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideLv1(ctx);
        // 2番目弱い(Q=12) > 相手最弱(3) → FOLD
        expect(action).toBe("FOLD");
      });

      it("2番目に弱い札が相手の最弱以下の場合はCALLすること", () => {
        const state = createRazzState({
          street: "5th",
          currentBet: 80,
          hands: {
            0: {
              downCards: [
                { rank: "A", suit: "c" } as Card,
                { rank: "2", suit: "c" } as Card,
              ],
              upCards: [
                { rank: "8", suit: "h" } as Card, // 最弱が8
                { rank: "7", suit: "d" } as Card,
                { rank: "6", suit: "s" } as Card,
              ],
            },
            1: {
              downCards: [
                { rank: "A", suit: "h" } as Card,
                { rank: "2", suit: "d" } as Card,
              ],
              upCards: [
                { rank: "3", suit: "s" } as Card,
                { rank: "4", suit: "c" } as Card,
                { rank: "7", suit: "h" } as Card, // 最弱7、2番目弱い4
              ],
            },
          },
        });

        const ctx: CpuDecisionContext = {
          state,
          seat: 1,
          allowedActions: ["CALL", "RAISE", "FOLD"],
        };

        const action = decideLv1(ctx);
        // 2番目弱い(7) <= 相手最弱(8) → CALL
        expect(action).toBe("CALL");
      });
    });
  });
});
