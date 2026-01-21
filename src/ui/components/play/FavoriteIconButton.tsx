import type React from "react";
import { useAppStore } from "../../../app/store/appStore";

interface FavoriteIconButtonProps {
  dealId: string;
  size?: "sm" | "md";
}

export const FavoriteIconButton: React.FC<FavoriteIconButtonProps> = ({
  dealId,
  size = "md",
}) => {
  const favoriteDealIds = useAppStore(
    (state) => state.fullStore.favoriteDealIds,
  );
  const toggleFavoriteDeal = useAppStore((state) => state.toggleFavoriteDeal);

  const isFavorite = favoriteDealIds.includes(dealId);

  const handleClick = () => {
    toggleFavoriteDeal(dealId);
  };

  const sizeClasses = size === "sm" ? "w-6 h-6 text-sm" : "w-10 h-10 text-xl";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${sizeClasses} flex items-center justify-center rounded-lg transition-all ${
        isFavorite
          ? "bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
      title={isFavorite ? "お気に入り解除" : "お気に入り登録"}
    >
      {isFavorite ? "★" : "☆"}
    </button>
  );
};
