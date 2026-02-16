import type { Row } from "@tanstack/react-table";
import type { ContextMenuState, GridColumn, GridRow } from "~/types/grid";
import type { CellAddress } from "../grid-table/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle, HighlightedText } from "../grid-table/ui-components";
import { CHECKBOX_WIDTH } from "../grid-table/constants";
import type { CSSProperties } from "react";

// --- Sortable Row Component ---
interface SortableRowProps {
  rowId: number;
  virtualStart: number;
  virtualIndex: number;
  currentRowHeight: number;
  isRowSelected: boolean;
  isActiveRow: boolean;
  isHoveredRow: boolean;
  rowBg: string;
  rowData: GridRow;
  row: Row<GridRow>;
  frozenWidth: number;
  primaryColumn: GridColumn | null;
  primaryColumnWidth: number;
  nonPrimaryColumns: GridColumn[];
  columnSizing: Record<string, number>;
  selectedCell: CellAddress | null;
  editingCell: CellAddress | null;
  selectedCells: Set<string>;
  isMultiSelect: boolean;
  highlightedCells?: Map<number, Set<number>>;
  activeSearchCell?: { rowId: number; columnId: number };
  searchQuery?: string;
  handleMouseDown: (
    rowId: number,
    columnId: number,
    e: React.MouseEvent,
  ) => void;
  handleMouseEnter: (rowId: number, columnId: number) => void;
  handleCellChange: (rowId: number, columnId: number, value: string) => void;
  setEditingCell: (cell: CellAddress | null) => void;
  setHoveredRowId: (id: number | null) => void;
  onContextMenu?: (state: ContextMenuState) => void;
  totalScrollableWidth: number;
  showLastRowTooltip: boolean;
}

export function SortableRow(props: SortableRowProps) {
  const {
    rowId,
    virtualStart,
    virtualIndex,
    currentRowHeight,
    isRowSelected,
    isActiveRow,
    isHoveredRow,
    rowBg,
    rowData,
    row,
    frozenWidth,
    primaryColumn,
    primaryColumnWidth,
    nonPrimaryColumns,
    columnSizing,
    selectedCell,
    editingCell,
    selectedCells,
    isMultiSelect,
    highlightedCells,
    activeSearchCell,
    searchQuery,
    handleMouseDown,
    handleMouseEnter,
    handleCellChange,
    setEditingCell,
    setHoveredRowId,
    onContextMenu,
    totalScrollableWidth,
    showLastRowTooltip,
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

  return (
    <div
      ref={setNodeRef}
      data-index={virtualIndex}
      className="absolute left-0 flex"
      style={style}
      onMouseEnter={() => setHoveredRowId(rowData.id)}
      onMouseLeave={() => setHoveredRowId(null)}
    >
      {/* Frozen: checkbox/row-num + primary cell */}
      <div
        className={`sticky left-0 z-10 flex shrink-0 ${rowBg} border-b border-gray-200`}
        style={{
          width: frozenWidth,
          borderRight: "2px solid rgb(209, 213, 219)",
        }}
      >
        {/* Row number / checkbox / drag handle */}
        <div
          className="group flex items-center"
          style={{ width: CHECKBOX_WIDTH }}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu?.({
              type: "row",
              position: { x: e.clientX, y: e.clientY },
              data: { rowId: rowData.id, rowIndex: virtualIndex },
            });
          }}
        >
          {isRowSelected ? (
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
            <>
              {/* Normal: row number centered, hover: drag + checkbox */}
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

        {/* Primary cell */}
        {primaryColumn &&
          (() => {
            // Compute primary cell styling
            const primaryCellKey = `${rowData.id}-${primaryColumn.id}`;
            const isSelectedCell =
              selectedCell?.rowId === rowData.id &&
              selectedCell?.columnId === primaryColumn.id;
            const isInMultiSelection =
              isMultiSelect &&
              selectedCells.has(primaryCellKey) &&
              !isSelectedCell;
            const isPrimaryActiveSearch =
              activeSearchCell?.rowId === rowData.id &&
              activeSearchCell?.columnId === primaryColumn.id;
            const isPrimaryHighlighted = highlightedCells
              ?.get(rowData.id)
              ?.has(primaryColumn.id);

            let primaryCellBg = "bg-white";
            if (isPrimaryActiveSearch) {
              primaryCellBg = "bg-yellow-300";
            } else if (isPrimaryHighlighted) {
              primaryCellBg = "bg-yellow-100";
            } else if (isInMultiSelection) {
              primaryCellBg = "bg-blue-50/70";
            }

            return (
              <div
                id={`cell-${rowData.id}-${primaryColumn.id}`}
                className={`relative flex items-center px-2 ${
                  isSelectedCell ? "ring-2 ring-blue-500 ring-inset" : ""
                } ${primaryCellBg}`}
                style={{ width: primaryColumnWidth }}
                onMouseDown={(e) =>
                  handleMouseDown(rowData.id, primaryColumn.id, e)
                }
                onMouseEnter={() =>
                  handleMouseEnter(rowData.id, primaryColumn.id)
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu?.({
                    type: "cell",
                    position: { x: e.clientX, y: e.clientY },
                    data: {
                      rowId: rowData.id,
                      columnId: primaryColumn.id,
                      rowIndex: virtualIndex,
                    },
                  });
                }}
              >
                {highlightedCells?.get(rowData.id)?.has(primaryColumn.id) &&
                searchQuery ? (
                  <div className="w-full text-xs text-gray-900">
                    <HighlightedText
                      text={
                        rowData.cells[String(primaryColumn.id)] != null
                          ? String(rowData.cells[String(primaryColumn.id)])
                          : ""
                      }
                      query={searchQuery}
                    />
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      defaultValue={
                        rowData.cells[String(primaryColumn.id)] != null
                          ? String(rowData.cells[String(primaryColumn.id)])
                          : ""
                      }
                      readOnly={
                        editingCell?.rowId !== rowData.id ||
                        editingCell?.columnId !== primaryColumn.id
                      }
                      className="w-full bg-transparent text-xs text-gray-900 outline-none"
                      onDoubleClick={() =>
                        setEditingCell({
                          rowId: rowData.id,
                          columnId: primaryColumn.id,
                        })
                      }
                      onChange={(e) =>
                        handleCellChange(
                          rowData.id,
                          primaryColumn.id,
                          e.target.value,
                        )
                      }
                    />
                    {showLastRowTooltip &&
                      editingCell?.rowId === rowData.id &&
                      editingCell?.columnId === primaryColumn.id && (
                        <div className="absolute bottom-full left-0 z-50 mb-1 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg">
                          Shift+Enter to create new row
                          <div className="absolute top-full left-4 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-900" />
                        </div>
                      )}
                  </>
                )}
              </div>
            );
          })()}
      </div>

      {/* Scrollable cells */}
      <div
        className={`flex border-b border-gray-200 ${
          isRowSelected
            ? "bg-blue-50"
            : isActiveRow || isHoveredRow
              ? "bg-gray-50/50"
              : ""
        }`}
        style={{ width: totalScrollableWidth }}
      >
        {nonPrimaryColumns.map((col) => {
          const cellKey = `${rowData.id}-${col.id}`;
          const isOriginCell =
            selectedCell?.rowId === rowData.id &&
            selectedCell?.columnId === col.id;
          const isInSelection = selectedCells.has(cellKey);
          const isActiveSearchCell =
            activeSearchCell?.rowId === rowData.id &&
            activeSearchCell?.columnId === col.id;
          const isHighlighted = highlightedCells?.get(rowData.id)?.has(col.id);
          const cellValue = rowData.cells[String(col.id)];
          const displayValue = cellValue != null ? String(cellValue) : "";

          let cellBg = "bg-white";
          if (isActiveSearchCell) {
            cellBg = "bg-yellow-300";
          } else if (isHighlighted) {
            cellBg = "bg-yellow-100";
          } else if (isMultiSelect && isInSelection && !isOriginCell) {
            cellBg = "bg-blue-50/70";
          }

          return (
            <div
              key={col.id}
              id={`cell-${rowData.id}-${col.id}`}
              className={`relative flex items-center border-r border-gray-200 px-2 ${
                isOriginCell ? "ring-2 ring-blue-500 ring-inset" : ""
              } ${cellBg}`}
              style={{
                width: columnSizing[String(col.id)] ?? col.width,
                minWidth: 80,
              }}
              onMouseDown={(e) => handleMouseDown(rowData.id, col.id, e)}
              onMouseEnter={() => handleMouseEnter(rowData.id, col.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu?.({
                  type: "cell",
                  position: { x: e.clientX, y: e.clientY },
                  data: {
                    rowId: rowData.id,
                    columnId: col.id,
                    rowIndex: virtualIndex,
                  },
                });
              }}
            >
              {isHighlighted && searchQuery ? (
                <div className="w-full text-xs text-gray-900">
                  <HighlightedText text={displayValue} query={searchQuery} />
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    defaultValue={displayValue}
                    readOnly={
                      editingCell?.rowId !== rowData.id ||
                      editingCell?.columnId !== col.id
                    }
                    className="w-full bg-transparent text-xs text-gray-900 outline-none"
                    onDoubleClick={() =>
                      setEditingCell({ rowId: rowData.id, columnId: col.id })
                    }
                    onChange={(e) =>
                      handleCellChange(rowData.id, col.id, e.target.value)
                    }
                  />
                  {showLastRowTooltip &&
                    editingCell?.rowId === rowData.id &&
                    editingCell?.columnId === col.id && (
                      <div className="absolute bottom-full left-0 z-50 mb-1 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg">
                        Shift+Enter to create new row
                        <div className="absolute top-full left-4 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-900" />
                      </div>
                    )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
