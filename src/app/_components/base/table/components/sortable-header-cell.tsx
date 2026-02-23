import type { CSSProperties } from "react";
import {
  TextIcon,
  NumberIcon,
} from "~/app/_components/ui/icons";
import type { GridColumn } from "~/types/grid";
import { useSortable } from "@dnd-kit/sortable";

interface SortableHeaderCellProps {
  column: GridColumn;
  isPrimary: boolean;
  children: React.ReactNode;
}

export function SortableHeaderCell({
  column,
  isPrimary,
  children,
}: SortableHeaderCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `col-${column.id}`,
    disabled: isPrimary,
  });

  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, 0px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
    position: "relative",
  };


  const ColumnTypeIcon = column.type === "NUMBER" ? NumberIcon : TextIcon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-full items-center justify-between bg-transparent px-2 py-1.5"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1.5 overflow-hidden">
        <ColumnTypeIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="truncate text-xs text-gray-900">
          {column.name}
        </span>
      </div>
      {children}
    </div>
  );
}
