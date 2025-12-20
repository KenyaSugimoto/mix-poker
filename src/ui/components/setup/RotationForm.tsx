import type React from "react";

interface Props {
  dealPerGame: number;
  onChange: (dealPerGame: number) => void;
}

export const RotationForm: React.FC<Props> = ({ dealPerGame, onChange }) => {
  return (
    <div className="space-y-4 p-4 border rounded-xl shadow-sm bg-card">
      <h3 className="text-lg font-semibold">ローテーション設定</h3>

      <div className="flex items-center gap-4">
        <label className="space-y-1 flex-1">
          <span className="text-xs text-muted-foreground font-medium">
            種目切り替え頻度 (Deal数)
          </span>
          <input
            type="number"
            min={1}
            value={dealPerGame}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!Number.isNaN(val) && val >= 1) onChange(val);
            }}
            className="w-full bg-background border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <div className="text-xs text-muted-foreground pt-4 flex-1">
          指定したディール数ごとに、次の種目に切り替わります。
        </div>
      </div>
    </div>
  );
};
