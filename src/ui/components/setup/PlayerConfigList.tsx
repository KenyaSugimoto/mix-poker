import { Cpu, Plus, Trash2, User } from "lucide-react";
import type React from "react";
import type { GamePlayer } from "../../../domain/types";

interface Props {
  players: GamePlayer[];
  onChange: (players: GamePlayer[]) => void;
}

export const PlayerConfigList: React.FC<Props> = ({ players, onChange }) => {
  const handleAddPlayer = () => {
    if (players.length >= 7) return;
    const newId = `p${Date.now()}`;
    // Always add as CPU
    onChange([
      ...players,
      { id: newId, name: `Player ${players.length}`, kind: "cpu" },
    ]);
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length <= 2) return;
    onChange(players.filter((p) => p.id !== id));
  };

  const handleChange = (id: string, updates: Partial<GamePlayer>) => {
    onChange(players.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl shadow-sm bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          プレイヤー設定 ({players.length}名)
        </h3>
        <button
          type="button"
          onClick={handleAddPlayer}
          disabled={players.length >= 7}
          className="flex items-center gap-1 text-sm text-primary hover:bg-primary/10 px-3 py-1.5 rounded-full disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          <Plus size={16} />
          追加
        </button>
      </div>

      <div className="space-y-3">
        {players.map((player, index) => {
          const isHuman = index === 0;

          return (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border"
            >
              <div className="flex-shrink-0 text-muted-foreground font-mono text-xs w-6">
                #{index + 1}
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) =>
                    handleChange(player.id, { name: e.target.value })
                  }
                  className="w-full bg-background border px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Name"
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/50 text-xs font-medium text-muted-foreground">
                {isHuman ? (
                  <>
                    <User size={14} className="text-primary" />
                    <span className="text-primary">Human</span>
                  </>
                ) : (
                  <>
                    <Cpu size={14} />
                    <span>CPU</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleRemovePlayer(player.id)}
                disabled={players.length <= 2 || isHuman}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title={isHuman ? "Cannot remove Human player" : "Remove"}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
      {players.length < 2 && (
        <p className="text-xs text-destructive">
          最低2名のプレイヤーが必要です
        </p>
      )}
    </div>
  );
};
