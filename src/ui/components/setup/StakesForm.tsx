import type React from "react";
import type { Stakes } from "../../../domain/types";

interface Props {
  stakes: Stakes;
  onChange: (stakes: Stakes) => void;
}

const PRESETS: Record<string, Stakes> = {
  Low: { ante: 5, bringIn: 10, smallBet: 20, bigBet: 40 },
  Mid: { ante: 10, bringIn: 20, smallBet: 40, bigBet: 80 },
  High: { ante: 100, bringIn: 200, smallBet: 400, bigBet: 800 },
};

export const StakesForm: React.FC<Props> = ({ stakes, onChange }) => {
  const applyPreset = (name: string) => {
    onChange(PRESETS[name]);
  };

  const getActivePreset = (): string | null => {
    for (const [name, preset] of Object.entries(PRESETS)) {
      if (
        stakes.ante === preset.ante &&
        stakes.bringIn === preset.bringIn &&
        stakes.smallBet === preset.smallBet &&
        stakes.bigBet === preset.bigBet
      ) {
        return name;
      }
    }
    return null;
  };

  const activePreset = getActivePreset();

  return (
    <div className="space-y-4 p-4 border rounded-xl shadow-sm bg-card">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">ステークス設定</h3>
          <div className="flex gap-2">
            {Object.keys(PRESETS).map((name) => {
              const isActive = activePreset === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => applyPreset(name)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow ring-2 ring-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
          <div className="bg-muted/30 p-2 rounded border border-border/50 text-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">
              Ante
            </div>
            <div className="text-lg font-mono font-medium">{stakes.ante}</div>
          </div>
          <div className="bg-muted/30 p-2 rounded border border-border/50 text-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">
              Bring-In
            </div>
            <div className="text-lg font-mono font-medium">
              {stakes.bringIn}
            </div>
          </div>
          <div className="bg-muted/30 p-2 rounded border border-border/50 text-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">
              Small Bet
            </div>
            <div className="text-lg font-mono font-medium">
              {stakes.smallBet}
            </div>
          </div>
          <div className="bg-muted/30 p-2 rounded border border-border/50 text-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">
              Big Bet
            </div>
            <div className="text-lg font-mono font-medium">{stakes.bigBet}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
