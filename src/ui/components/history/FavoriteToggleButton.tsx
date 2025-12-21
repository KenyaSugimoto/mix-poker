import type React from "react";
import { useAppStore } from "../../../app/store/appStore";

interface FavoriteToggleButtonProps {
  dealId: string;
}

export const FavoriteToggleButton: React.FC<FavoriteToggleButtonProps> = ({
  dealId,
}) => {
  const favoriteDealIds = useAppStore(
    (state) => state.fullStore.favoriteDealIds,
  );
  const toggleFavoriteDeal = useAppStore((state) => state.toggleFavoriteDeal);

  const isFavorite = favoriteDealIds.includes(dealId);

  const handleClick = () => {
    toggleFavoriteDeal(dealId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`px-4 py-2 rounded transition-colors ${
        isFavorite
          ? "bg-yellow-500 text-white hover:bg-yellow-600"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {isFavorite ? "★ お気に入り解除" : "☆ お気に入り登録"}
    </button>
  );
};
