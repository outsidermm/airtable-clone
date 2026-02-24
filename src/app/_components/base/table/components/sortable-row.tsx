/**
 * SortableRow — one absolute-positioned row in the virtualized grid.
 *
 * Positioning:
 *   Placed via `position: absolute; top: virtualStart` inside the
 *   `position: relative` scroll canvas. `virtualStart` is the scroll-scaled
 *   CSS pixel offset from `useTableVirtualizer`, not the raw virtualizer value.
 *
 * Two-section layout:
 *   Frozen section (`position: sticky; left: 0; z-index: 30`) holds the
 *   checkbox column, primary cell, and any extra frozen non-primary cells.
 *   Scrollable section holds the remaining non-primary cells side-by-side.
 *   Both sections use `role="none"` so the WAI-ARIA grid model sees
 *   `role="row"` directly owning `role="gridcell"` children.
 *
 * Narrow selection props pattern:
 *   Rather than passing the full `selectedCell` / `editingCell` objects,
 *   the parent extracts per-row slices (`selectedColumnId`, `editingColumnId`,
 *   `multiSelectColumnIds`). Memo comparison then only re-renders rows whose
 *   selection status actually changed — unaffected rows are skipped entirely.
 *
 * columnKeyMap — stable React keys across temp ID swaps:
 *   When a column is optimistically created, it gets a negative temp ID.
 *   `columnKeyMap` maps each column ID to a stable UUID-like string created
 *   at optimistic-add time. Passing this as the React key prevents GridCell
 *   from unmounting and remounting when the temp ID is swapped for the
 *   confirmed DB ID.
 *
 * DnD Kit integration:
 *   `useSortable({ id: "row-{rowId}" })` attaches drag event handlers and
 *   provides the CSS transform for in-flight reordering. `isDragging` reduces
 *   opacity to signal the drag source. The actual row reorder persists via
 *   `handleReorderRowPersisted` in base-content.tsx on DragEnd.
 */

import { memo } from "react";
import type { Row } from "@tanstack/react-table";
import type { GridColumn, GridRow } from "~/types/grid";
import type { CellAddress } from "~/types/cell";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "../../../ui/drag-handle";
import { CHECKBOX_WIDTH } from "../../constants";
import type { CSSProperties } from "react";
import { GridCell } from "./grid-cell"; // Import the new component

interface SortableRowProps {
  rowId: number;
  virtualStart: number;
  virtualIndex: number;
  currentRowHeight: number;
  isRowSelected: boolean;
  rowBg: string;
  rowData: GridRow;
  row: Row<GridRow>;
  frozenWidth: number;
  primaryColumn: GridColumn | null;
  primaryColumnWidth: number;
  nonPrimaryColumns: GridColumn[];
  frozenNonPrimaryCount: number;
  columnSizing: Record<string, number>;
  // Narrow per-row selection props — avoids re-rendering unaffected rows
  selectedColumnId: number | null;
  editingColumnId: number | null;
  multiSelectColumnIds: Set<number> | null; // null = no multi-select active

  // Handlers
  handleMouseDown: (
    rowId: number,
    columnId: number,
    e: React.MouseEvent,
  ) => void;
  handleMouseEnter: (rowId: number, columnId: number) => void;
  handleCellChange: (rowId: number, columnId: number, value: string) => void;
  setEditingCell: (cell: CellAddress | null) => void;
  setHoveredRowId: (id: number | null) => void;
  totalScrollableWidth: number;
  showLastRowTooltip: boolean;
  // Stable React keys for temp/swapped columns — prevents GridCell remount on ID swap
  columnKeyMap: Map<number, string>;
  onContextMenu: (rowId: number, rowIndex: number, e: React.MouseEvent) => void;
  filteredColumnIds: Set<number>;
  sortedColumnIds: Set<number>;
}

export const SortableRow = memo(function SortableRow(props: SortableRowProps) {
  const {
    rowId,
    virtualStart,
    virtualIndex,
    currentRowHeight,
    isRowSelected,
    rowBg,
    rowData,
    row,
    frozenWidth,
    primaryColumn,
    primaryColumnWidth,
    nonPrimaryColumns,
    frozenNonPrimaryCount,
    columnSizing,
    selectedColumnId,
    editingColumnId,
    multiSelectColumnIds,
    handleMouseDown,
    handleMouseEnter,
    handleCellChange,
    setEditingCell,
    setHoveredRowId,
    totalScrollableWidth,
    showLastRowTooltip,
    columnKeyMap,
    onContextMenu,
    filteredColumnIds,
    sortedColumnIds,
  } = props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `row-${rowId}`,
  });

  const style: CSSProperties = {
    height: currentRowHeight,
    transform: CSS.Translate.toString(transform),
    top: virtualStart,
    transition,
    opacity: isDragging ? 0.5 : 1,
    minWidth: "fit-content",
  };

  // Helper to keep the render clean
  const renderCell = (col: GridColumn, width: number) => {
    const isSelectedCell = selectedColumnId === col.id;
    const isEditing = editingColumnId === col.id;

    // Only apply multi-select blue if it's NOT the primary selected cell (the anchor)
    const isInMultiSelection =
      multiSelectColumnIds !== null &&
      multiSelectColumnIds.has(col.id) &&
      !isSelectedCell;

    const highlight = filteredColumnIds.has(col.id)
      ? "green"
      : sortedColumnIds.has(col.id)
        ? "orange"
        : undefined;

    return (
      <GridCell
        key={columnKeyMap.get(col.id) ?? String(col.id)}
        rowId={rowId}
        columnId={col.id}
        width={width}
        value={rowData.cells[String(col.id)]}
        columnType={col.type}
        // State flags
        isSelectedCell={isSelectedCell}
        isInMultiSelection={isInMultiSelection}
        isEditing={isEditing}
        showLastRowTooltip={showLastRowTooltip}
        highlight={highlight}
        // Handlers
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onDoubleClick={setEditingCell}
        onChange={handleCellChange}
        onBlur={() => setEditingCell(null)}
      />
    );
  };

  return (
    // virtualIndex is the row's actual position in the full dataset (not just the
    // rendered window), making aria-rowindex a truthful 1-based dataset position.
    <div
      ref={setNodeRef}
      role="row"
      aria-rowindex={virtualIndex + 1}
      aria-selected={isRowSelected}
      data-index={virtualIndex}
      className="absolute left-0 flex"
      style={style}
      onMouseEnter={() => setHoveredRowId(rowId)}
      onMouseLeave={() => setHoveredRowId(null)}
      onContextMenu={(e) => onContextMenu(rowId, virtualIndex, e)}
    >
      {/* === FROZEN SECTION === */}
      {/* role="none" makes this layout-only wrapper transparent to the a11y tree
          so role="row" directly owns its role="gridcell" children. */}
      <div
        role="none"
        className={`sticky left-0 z-30 flex shrink-0 border-b border-gray-200 ${rowBg}`}
        style={{
          width: frozenWidth,
          borderRight: "2px solid rgb(209, 213, 219)",
        }}
      >
        {/* Row Controls (Drag + Checkbox) */}
        <div
          className="group flex items-center"
          style={{ width: CHECKBOX_WIDTH }}
        >
          {isRowSelected ? (
            /* Selected State: Drag Handle + Checked Box */
            <>
              <div className="flex w-5 shrink-0 items-center justify-center pl-0.5">
                <DragHandle {...attributes} {...listeners} />
              </div>
              <div className="flex flex-1 justify-center">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                  checked
                  aria-label={`Deselect row ${virtualIndex + 1}`}
                  onChange={row.getToggleSelectedHandler()}
                />
              </div>
            </>
          ) : (
            /* Normal State: Index (hover -> Drag + Unchecked Box) */
            <>
              <div className="flex w-5 shrink-0 items-center justify-center pl-0.5 opacity-0 group-hover:opacity-100">
                <DragHandle {...attributes} {...listeners} />
              </div>
              <div className="flex flex-1 justify-center">
                {/* Row number is a visual affordance only; aria-rowindex on the
                    parent already encodes position for the accessibility tree. */}
                <span
                  aria-hidden="true"
                  className="text-xs text-gray-400 group-hover:hidden"
                >
                  {virtualIndex + 1}
                </span>
                <input
                  type="checkbox"
                  className="hidden h-3.5 w-3.5 rounded border-gray-300 text-blue-600 group-hover:block"
                  checked={false}
                  aria-label={`Select row ${virtualIndex + 1}`}
                  onChange={row.getToggleSelectedHandler()}
                />
              </div>
            </>
          )}
        </div>

        {/* Primary Cell */}
        {primaryColumn && renderCell(primaryColumn, primaryColumnWidth)}
        {/* Frozen non-primary cells */}
        {nonPrimaryColumns
          .slice(0, frozenNonPrimaryCount)
          .map((col) =>
            renderCell(col, columnSizing[String(col.id)] ?? col.width),
          )}

      </div>

      {/* === SCROLLABLE SECTION === */}
      {/* role="none" mirrors the frozen section: layout container only. */}
      <div
        role="none"
        className={`flex border-b border-gray-200 ${rowBg}`}
        style={{ width: totalScrollableWidth }}
      >
        {nonPrimaryColumns
          .slice(frozenNonPrimaryCount)
          .map((col) =>
            renderCell(col, columnSizing[String(col.id)] ?? col.width),
          )}
      </div>
    </div>
  );
});
