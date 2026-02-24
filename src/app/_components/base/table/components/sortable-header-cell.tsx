/**
 * SortableHeaderCell — DnD Kit drag wrapper for scrollable column header cells.
 *
 * Why a separate component:
 *   `useSortable` must be called at the component level (React hook rules).
 *   Extracting it here keeps `GridHeader`'s render path clean and ensures the
 *   drag transform only applies to the cell interior, not the outer
 *   `role="columnheader"` div that also owns the resize handle.
 *
 * X-axis-only transform:
 *   `translate3d(${transform.x}px, 0px, 0)` constrains drag movement to the
 *   horizontal axis. DnD Kit's raw transform includes a Y component which
 *   would cause the header to drift vertically during drag — suppressing it
 *   matches the expected column-reorder affordance.
 *
 * Primary column guard:
 *   `disabled: isPrimary` tells DnD Kit not to attach drag handlers for the
 *   primary column. The primary column is always leftmost in the frozen section
 *   and cannot be reordered via drag.
 *
 * ARIA role note:
 *   `{...attributes}` from useSortable sets `role="button"` and
 *   `aria-roledescription="sortable"` on this wrapper, overriding any explicit
 *   role set here. The parent div in GridHeader carries `role="columnheader"`,
 *   which is the semantically correct owner of column header semantics.
 *
 * Children slot:
 *   The column options `<button>` (ChevronDown) is passed as `children` and
 *   rendered inside the drag target. Click events on the button call
 *   `e.stopPropagation()` to prevent the click from being interpreted as a
 *   drag initiation by DnD Kit's pointer sensors.
 */

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
    // DnD Kit spreads role="button" + aria-roledescription via {...attributes},
    // which overrides any role we set here. The draggable affordance takes precedence
    // over columnheader semantics for this wrapper; the parent div carries role="columnheader".
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-full items-center justify-between bg-transparent px-2 py-1.5"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1.5 overflow-hidden">
        <ColumnTypeIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
        <span className="truncate text-xs text-gray-900 font-medium">
          {column.name}
        </span>
      </div>
      {children}
    </div>
  );
}
