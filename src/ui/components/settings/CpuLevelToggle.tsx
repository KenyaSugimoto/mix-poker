import type React from "react";
import { useAppStore } from "../../../app/store/appStore";

export const CpuLevelToggle: React.FC = () => {
  const cpuLevel = useAppStore((state) => state.ui.cpuLevel);
  const setCpuLevel = useAppStore((state) => state.setCpuLevel);

  return (
    <div className="bg-muted p-4 rounded space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">CPUレベル</div>
          <div className="text-sm text-muted-foreground">
            {cpuLevel === "lv0"
              ? "Lv0: CHECK/CALL優先（開発用）"
              : "Lv1: 状況に応じた意思決定"}
          </div>
        </div>
        <select
          value={cpuLevel}
          onChange={(e) => setCpuLevel(e.target.value as "lv0" | "lv1")}
          className="px-3 py-2 rounded bg-background border border-border text-foreground"
        >
          <option value="lv1">Lv1（戦略的）</option>
          <option value="lv0">Lv0（開発用）</option>
        </select>
      </div>
    </div>
  );
};
