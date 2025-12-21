import type React from "react";
import { useAppStore } from "../../../app/store/appStore";

export const DisplayUnitToggle: React.FC = () => {
  const displayUnit = useAppStore((state) => state.ui.displayUnit);
  const setDisplayUnit = useAppStore((state) => state.setDisplayUnit);

  return (
    <div className="bg-muted p-4 rounded">
      <div className="block mb-2 font-medium">表示単位</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDisplayUnit("points")}
          className={`px-4 py-2 rounded transition-colors ${
            displayUnit === "points"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground hover:bg-muted"
          }`}
        >
          ポイント
        </button>
        <button
          type="button"
          onClick={() => setDisplayUnit("bb")}
          className={`px-4 py-2 rounded transition-colors ${
            displayUnit === "bb"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground hover:bg-muted"
          }`}
        >
          Big Blind
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        現在の表示単位: {displayUnit === "points" ? "ポイント" : "Big Blind"}
        （MVPでは実装予定）
      </p>
    </div>
  );
};
