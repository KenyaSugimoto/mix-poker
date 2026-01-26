import type React from "react";

/** プリセットオプション定義 */
const ROTATION_PRESETS = [
  { value: 1, label: "1" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
] as const;

interface Props {
  dealPerGame: number;
  onChange: (dealPerGame: number) => void;
}

export const RotationForm: React.FC<Props> = ({ dealPerGame, onChange }) => {
  return (
    <div className="space-y-4 p-4 border rounded-xl shadow-sm bg-card">
      <h3 className="text-lg font-semibold">ローテーション設定</h3>

      <div className="space-y-2">

        <div className="flex gap-2">
          {ROTATION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dealPerGame === preset.value
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          選択したハンド数ごとに、次の種目に切り替わります。
        </div>
      </div>
    </div>
  );
};
