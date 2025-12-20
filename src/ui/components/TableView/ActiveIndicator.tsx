import type React from "react";

interface ActiveIndicatorProps {
  isActive: boolean;
}

export const ActiveIndicator: React.FC<ActiveIndicatorProps> = ({
  isActive,
}) => {
  if (!isActive) return null;

  return (
    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full border-2 border-background flex items-center justify-center shadow-lg animate-pulse">
      <div className="w-3 h-3 bg-primary-foreground rounded-full" />
    </div>
  );
};
