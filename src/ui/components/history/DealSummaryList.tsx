import type React from "react";
import { useAppStore } from "../../../app/store/appStore";
import { DealSummaryRow } from "./DealSummaryRow";

export const DealSummaryList: React.FC = () => {
  const game = useAppStore((state) => state.game);
  const dealHistory = game?.dealHistory ?? [];

  return (
    <div className="divide-y divide-border">
      {dealHistory.map((summary) => (
        <DealSummaryRow key={summary.dealId} summary={summary} />
      ))}
    </div>
  );
};
