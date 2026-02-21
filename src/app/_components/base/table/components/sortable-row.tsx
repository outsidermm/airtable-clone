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
import { useBase } from "../../base-context";

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
  handleFrozenBorderDragStart: (e: React.MouseEvent) => void;
  onContextMenu: (rowId: number, rowIndex: number, e: React.MouseEvent) => void;
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
    handleFrozenBorderDragStart,
    onContextMenu,
  } = props;

  const {highlightedCells, activeSearchCell, searchQuery} = useBase();

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
  const renderCell = (col: GridColumn, width: number, _isPrimary: boolean) => {
    const isSelectedCell = selectedColumnId === col.id;
    const isEditing = editingColumnId === col.id;

    // Only apply multi-select blue if it's NOT the primary selected cell (the anchor)
    const isInMultiSelection =
      multiSelectColumnIds !== null &&
      multiSelectColumnIds.has(col.id) &&
      !isSelectedCell;

    return (
      <GridCell
        key={columnKeyMap.get(col.id) ?? String(col.id)}
        rowId={rowId}
        columnId={col.id}
        width={width}
        value={rowData.cells[String(col.id)]}
        // State flags
        isSelectedCell={isSelectedCell}
        isInMultiSelection={isInMultiSelection}
        isActiveSearch={
          activeSearchCell?.rowId === rowId &&
          activeSearchCell?.columnId === col.id
        }
        isHighlighted={!!highlightedCells?.get(rowId)?.has(col.id)}
        isEditing={isEditing}
        searchQuery={searchQuery}
        showLastRowTooltip={showLastRowTooltip}
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
    <div
      ref={setNodeRef}
      data-index={virtualIndex}
      className="absolute left-0 flex"
      style={style}
      onMouseEnter={() => setHoveredRowId(rowId)}
      onMouseLeave={() => setHoveredRowId(null)}
      onContextMenu={(e) => onContextMenu(rowId, virtualIndex, e)}
    >
      {/* === FROZEN SECTION === */}
      <div
        className={`relative left-0 z-30 flex shrink-0 border-b border-gray-200 ${rowBg}`}
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
                <span className="text-xs text-gray-400 group-hover:hidden">
                  {virtualIndex + 1}
                </span>
                <input
                  type="checkbox"
                  className="hidden h-3.5 w-3.5 rounded border-gray-300 text-blue-600 group-hover:block"
                  checked={false}
                  onChange={row.getToggleSelectedHandler()}
                />
              </div>
            </>
          )}
        </div>

        {/* Primary Cell */}
        {primaryColumn && renderCell(primaryColumn, primaryColumnWidth, true)}
        {/* Frozen non-primary cells */}
        {nonPrimaryColumns.slice(0, frozenNonPrimaryCount).map((col) =>
          renderCell(col, columnSizing[String(col.id)] ?? col.width, false),
        )}

        {/* Drag handle for adjusting the frozen border — dot appears on hover */}
        <div
          className="group/freezerow absolute top-0 right-0 z-10 flex cursor-col-resize items-center justify-center"
          style={{ width: 8, height: "100%", transform: "translateX(50%)" }}
          onMouseDown={handleFrozenBorderDragStart}
        >
          <div className="h-2.5 w-2.5 rounded-full bg-blue-400 opacity-0 shadow group-hover/freezerow:opacity-100" />
        </div>
      </div>

      {/* === SCROLLABLE SECTION === */}
      <div
        className={`flex border-b border-gray-200 ${rowBg}`}
        style={{ width: totalScrollableWidth }}
      >
        {nonPrimaryColumns.slice(frozenNonPrimaryCount).map((col) =>
          renderCell(col, columnSizing[String(col.id)] ?? col.width, false),
        )}
      </div>
    </div>
  );
});