import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "./drag-handle";
import { useSortable } from "@dnd-kit/sortable";
import type { GridColumn } from "~/types/grid";
import { NumberIcon, TextIcon } from "./icons";

interface SortableColumnItemProps {
  column: GridColumn;
  isHidden: boolean;
  onToggle: () => void;
  isDragHandleHidden?: boolean;
}

export function SortableColumnItem({
  column,
  isHidden,
  onToggle,
  isDragHandleHidden = false,
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(column.id) });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const isVisible = !isHidden;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-1 px-5 py-0.5"
    >
      <div className="flex w-full items-center gap-2 py-0.5 hover:bg-gray-100">
        <button
          onClick={onToggle}
          className={`flex h-2 w-3 items-center rounded-full px-0.5 transition-colors ${
            isVisible ? "bg-green-600" : "bg-gray-300"
          }`}
        >
          <div
            className={`h-1 w-1 rounded-full bg-white shadow transition-transform ${
              isVisible ? "translate-x-1" : "translate-x-0"
            }`}
          />
        </button>
        {column.type === "NUMBER" ? (
          <NumberIcon className="h-3 w-3 text-gray-400" />
        ) : (
          <TextIcon className="h-3 w-3 text-gray-400" />
        )}
        <span className="text-xs text-gray-700">{column.name}</span>
      </div>
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
      >
        {!isDragHandleHidden && (
          <DragHandle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
        )}
      </div>
    </div>
  );
}
