import type { CSSProperties } from "react";
import {
  TextIcon,
  NumberIcon,
  SortAscIcon,
  SortDescIcon,
} from "~/components/icons";
import type { SortConfig } from "~/server/api/routers/view";
import type { GridColumn } from "~/types/grid";
import { useSortable } from "@dnd-kit/sortable";

export function SortableHeaderCell({
  column,
  sorts,
  isPrimary,
  children,
}: {
  column: GridColumn;
  sorts: SortConfig[];
  isPrimary: boolean;
  children: React.ReactNode;
}) {
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

  const sortEntry = sorts.find((s) => s.columnId === column.id);

  const ColumnTypeIcon = column.type === "NUMBER" ? NumberIcon : TextIcon;
  const SortIcon = sortEntry?.direction === "asc" ? SortAscIcon : SortDescIcon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-full items-center justify-between bg-white px-2 py-1.5"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1.5 overflow-hidden">
        <ColumnTypeIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="truncate text-xs font-normal text-gray-700">
          {column.name}
        </span>
        {sortEntry && <SortIcon className="h-3 w-3 shrink-0 text-blue-500" />}
      </div>
      {children}
    </div>
  );
}
