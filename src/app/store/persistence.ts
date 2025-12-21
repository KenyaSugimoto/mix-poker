import { z } from "zod";
import type { AppState } from "../types";

export const STORAGE_KEY = "mix-poker:appState";
export const STORAGE_VERSION = 1;

// --- Zod Schemas ---

const UiStateSchema = z.object({
  screen: z.enum(["SETUP", "PLAY", "HISTORY", "SETTINGS"]),
  selectedDealId: z.string().nullable(),
  displayUnit: z.enum(["points", "bb"]),
});

// Deep validation for Domain objects is ideal, but for MVP we focus on structure.
// Using z.custom or basic objects to avoid massive duplication of domain types.
const PlayerIdSchema = z.string();

const GamePlayerSchema = z.object({
  id: PlayerIdSchema,
  name: z.string(),
  kind: z.enum(["human", "cpu"]),
});

const StakesSchema = z.object({
  ante: z.number(),
  bringIn: z.number(),
  smallBet: z.number(),
  bigBet: z.number(),
});

const RotationRuleSchema = z.object({
  sequence: z.array(z.enum(["studHi", "razz", "stud8"])),
  dealPerGame: z.number(),
});

const DealSummarySchema = z.object({
  dealId: z.string(),
  gameType: z.enum(["studHi", "razz", "stud8"]),
  startedAt: z.number(),
  endedAt: z.number(),
  winnersHigh: z.array(PlayerIdSchema),
  winnersLow: z.array(PlayerIdSchema).optional(),
  pot: z.number(),
  deltaStacks: z.record(z.string(), z.number()),
  potShare: z.record(z.string(), z.number()),
});

// DealState is complex, so we validate it loosely for MVP (or define minimal structure)
// Ideally we should replicate the full structure
const DealStateSchema = z
  .object({
    dealId: z.string(),
    gameType: z.enum(["studHi", "razz", "stud8"]),
    playerCount: z.number(),
    // ... other fields implied by 'passthrough' or explicit 'any' if we want to be loose
    // But let's try to be strictly proper where reasonable.
    dealFinished: z.boolean(),
  })
  .passthrough(); // Allow other fields for now to avoid huge schema maintenance

const GameStateSchema = z.object({
  gameId: z.string(),
  players: z.array(GamePlayerSchema),
  score: z.object({
    stacks: z.record(z.string(), z.number()),
  }),
  stakes: StakesSchema,
  rotation: RotationRuleSchema,
  dealIndex: z.number(),
  currentDeal: DealStateSchema.nullable(),
  dealHistory: z.array(DealSummarySchema),
  gameFinished: z.boolean(),
});

const FullStoreSchema = z.object({
  fullDealIds: z.array(z.string()),
  fullDealsById: z.record(z.string(), DealStateSchema),
  favoriteDealIds: z.array(z.string()),
});

const AppStateSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  ui: UiStateSchema,
  game: GameStateSchema.nullable(),
  fullStore: FullStoreSchema,
  lastLoadError: z.string().nullable(),
});

// --- Functions ---

export const saveAppState = (state: AppState): void => {
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (e) {
    console.error("Failed to save AppState:", e);
    // MVP: suppress error or handle it via a global toaster?
    // For now, console error is enough as per requirement "not stopping game"
  }
};

export const loadAppState = (): AppState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Validate schema
    const data = AppStateSchema.parse(parsed);

    return data as unknown as AppState; // Cast needed because Zod type inference vs explicit type might have minor mismatches (e.g. methods vs data)
  } catch (e) {
    console.warn("Failed to load AppState or schema mismatch:", e);
    return null;
  }
};
