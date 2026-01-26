import { Play } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppStore } from "../../app/store/appStore";
import { createInitialGameState } from "../../domain/game";
import type { GamePlayer, GameType, Stakes } from "../../domain/types";
import { GameTypeSelector } from "../components/setup/GameTypeSelector";
import { PlayerConfigList } from "../components/setup/PlayerConfigList";
import { RotationForm } from "../components/setup/RotationForm";
import { StakesForm } from "../components/setup/StakesForm";
import { UI_STRINGS } from "../constants/uiStrings";

export const SetupPage: React.FC = () => {
  const startNewGame = useAppStore((state) => state.startNewGame);
  const startDeal = useAppStore((state) => state.startDeal);

  // --- Local State for Form ---
  const [selectedGames, setSelectedGames] = useState<GameType[]>([
    "studHi",
    "razz",
    "stud8",
  ]);
  const [players, setPlayers] = useState<GamePlayer[]>([
    { id: "p1", name: "Hero", kind: "human" },
    { id: "p2", name: "Player 1", kind: "cpu" },
  ]);
  // Default Stakes (High limit example)
  const [stakes, setStakes] = useState<Stakes>({
    ante: 10,
    bringIn: 20,
    smallBet: 40,
    bigBet: 80,
  });
  const [dealPerGame, setDealPerGame] = useState(6);

  const canStart = players.length >= 2 && selectedGames.length >= 1;

  const handleStartGame = () => {
    if (!canStart) return;

    // 1. Create GameState
    const initialState = createInitialGameState(
      players,
      { sequence: selectedGames, dealPerGame },
      stakes,
    );

    // 2. Initialize Store
    startNewGame(initialState);

    // 3. Start First Deal Immediately (MVP UX)
    // Seat order is just player IDs in order (simple)
    startDeal({
      rngSeed: Math.random().toString(),
      seatOrder: players.map((p) => p.id),
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-20">
      <header className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {UI_STRINGS.SETUP.TITLE}
        </h1>
        <p className="text-muted-foreground">{UI_STRINGS.SETUP.SUBTITLE}</p>
      </header>

      <section className="space-y-4">
        <GameTypeSelector
          selectedGames={selectedGames}
          onChange={setSelectedGames}
        />

        <PlayerConfigList players={players} onChange={setPlayers} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StakesForm stakes={stakes} onChange={setStakes} />
          <RotationForm dealPerGame={dealPerGame} onChange={setDealPerGame} />
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={handleStartGame}
          disabled={!canStart}
          className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-full shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
        >
          <Play fill="currentColor" size={20} />
          {UI_STRINGS.SETUP.START_BUTTON}
        </button>
      </div>
    </div>
  );
};
