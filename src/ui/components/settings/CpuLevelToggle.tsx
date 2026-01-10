import type React from "react";
import { useAppStore } from "../../../app/store/appStore";
import type { CpuLevel } from "../../../app/types";

const CPU_LEVEL_DESCRIPTIONS: Record<CpuLevel, string> = {
  lv0: "CHECK/CALL優先（開発用）",
  lv1: "状況に応じた意思決定",
  lv2: "ルールベースの強い戦略",
};

export const CpuLevelToggle: React.FC = () => {
  const cpuLevel = useAppStore((state) => state.ui.cpuLevel);
  const setCpuLevel = useAppStore((state) => state.setCpuLevel);

  return (
    <div className="bg-muted p-4 rounded space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">CPUレベル</div>
          <div className="text-sm text-muted-foreground">
            {CPU_LEVEL_DESCRIPTIONS[cpuLevel]}
          </div>
        </div>
        <select
          value={cpuLevel}
          onChange={(e) => setCpuLevel(e.target.value as CpuLevel)}
          className="px-3 py-2 rounded bg-background border border-border text-foreground"
        >
          <option value="lv2">Lv2（強い）</option>
          <option value="lv1">Lv1（標準）</option>
          <option value="lv0">Lv0（開発用）</option>
        </select>
      </div>
    </div>
  );
};
