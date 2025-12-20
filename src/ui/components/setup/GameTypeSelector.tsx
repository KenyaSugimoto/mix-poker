import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import type React from "react";

import type { GameType } from "../../../domain/types";
import { getGameTypeLabel } from "../../utils/labelHelper";

interface Props {
  selectedGames: GameType[];
  onChange: (games: GameType[]) => void;
}

const ALL_GAMES: GameType[] = ["studHi", "razz", "stud8"];

// --- Sortable Item Component ---
function SortableGameItem({
  game,
  onRemove,
  canRemove,
}: {
  game: GameType;
  onRemove: (g: GameType) => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: game });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab hover:text-foreground text-muted-foreground outline-none touch-none"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical size={18} />
        </button>
        <span className="font-medium text-sm">{getGameTypeLabel(game)}</span>
      </div>

      <button
        type="button"
        onClick={() => onRemove(game)}
        disabled={!canRemove}
        className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-30 transition-colors"
        title="Remove"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// --- Main Component ---
export const GameTypeSelector: React.FC<Props> = ({
  selectedGames,
  onChange,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && over) {
      const oldIndex = selectedGames.indexOf(active.id as GameType);
      const newIndex = selectedGames.indexOf(over.id as GameType);
      onChange(arrayMove(selectedGames, oldIndex, newIndex));
    }
  };

  const handleToggle = (game: GameType) => {
    if (selectedGames.includes(game)) {
      if (selectedGames.length > 1) {
        onChange(selectedGames.filter((g) => g !== game));
      }
    } else {
      onChange([...selectedGames, game]);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl shadow-sm bg-card">
      <h3 className="text-lg font-semibold">採用種目と順序</h3>

      {/* DnD List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-2">
          <SortableContext
            items={selectedGames}
            strategy={verticalListSortingStrategy}
          >
            {selectedGames.map((game) => (
              <SortableGameItem
                key={game}
                game={game}
                onRemove={() => handleToggle(game)}
                canRemove={selectedGames.length > 1}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {/* Available Games (Add) */}
      <div className="flex flex-wrap gap-2 pt-2 border-t text-sm">
        <span className="w-full text-xs text-muted-foreground">追加候補:</span>
        {ALL_GAMES.map((game) => {
          const isSelected = selectedGames.includes(game);
          if (isSelected) return null;
          return (
            <button
              type="button"
              key={game}
              onClick={() => handleToggle(game)}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-colors"
              title={`Add ${getGameTypeLabel(game)}`}
            >
              <Plus size={14} />
              {getGameTypeLabel(game)}
            </button>
          );
        })}
        {selectedGames.length === ALL_GAMES.length && (
          <span className="text-xs text-muted-foreground">
            全ての種目が選択されています
          </span>
        )}
      </div>
    </div>
  );
};
