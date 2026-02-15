"use client";

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useImperativeHandle,
  forwardRef,
  type CSSProperties,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ColumnType } from "generated/prisma/enums";
import type { GridColumn, GridRow, ContextMenuState } from "~/types/grid";
import type { SortConfig } from "~/server/api/routers/view";

// --- Row height map ---
const ROW_HEIGHT_MAP: Record<string, number> = {
  short: 36,
  medium: 56,
  tall: 84,
  extraTall: 120,
};
const HEADER_HEIGHT = 36;
const CHECKBOX_WIDTH = 66;
const PRIMARY_WIDTH = 250;

// --- Types ---
interface CellAddress {
  rowId: number;
  columnId: number;
}

export interface GridTableHandle {
  scrollToRow: (rowId: number) => void;
}

interface GridTableProps {
  columns: GridColumn[];
  rows: GridRow[];
  onCellUpdate: (rowId: number, columnId: number, value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: number) => void;
  onBulkDeleteRow: (rowIds: number[]) => void;
  onAddColumn: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  onDeleteColumn: (columnId: number) => void;
  onReorderColumn: (
    columnId: number,
    afterColumnId: number | null,
    beforeColumnId: number | null,
  ) => void;
  onUpdateColumn: (columnId: number, name?: string, type?: ColumnType) => void;
  onSetPrimaryColumn: (columnId: number) => void;
  onReorderRow?: (draggedRowIds: number[], targetRowId: number) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  sorts?: SortConfig[];
  rowHeight?: "short" | "medium" | "tall" | "extraTall";
  highlightedCells?: Map<number, Set<number>>;
  activeSearchCell?: { rowId: number; columnId: number };
  searchQuery?: string;
  onContextMenu?: (state: ContextMenuState) => void;
}

// --- Drag handle SVG ---
function DragHandle({
  className,
  ...props
}: { className?: string } & React.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      className={className ?? "h-3 w-3 cursor-grab text-gray-300"}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

// --- Highlighted Text Component ---
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-400 font-medium">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

// --- Sortable Header Cell ---
function SortableHeaderCell({
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-full items-center justify-between bg-white px-2 py-1.5"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1.5 overflow-hidden">
        <svg
          className="h-3.5 w-3.5 shrink-0 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              column.type === "NUMBER"
                ? "M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                : "M4 6h16M4 12h16m-7 6h7"
            }
          />
        </svg>
        <span className="truncate text-xs font-normal text-gray-700">
          {column.name}
        </span>
        {sortEntry && (
          <svg
            className="h-3 w-3 shrink-0 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                sortEntry.direction === "asc"
                  ? "M5 15l7-7 7 7"
                  : "M19 9l-7 7-7-7"
              }
            />
          </svg>
        )}
      </div>
      {children}
    </div>
  );
}

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

function SortableRow(props: SortableRowProps) {
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
        {primaryColumn && (() => {
          // Compute primary cell styling
          const primaryCellKey = `${rowData.id}-${primaryColumn.id}`;
          const isSelectedCell = selectedCell?.rowId === rowData.id &&
                                 selectedCell?.columnId === primaryColumn.id;
          const isInMultiSelection = isMultiSelect &&
                                    selectedCells.has(primaryCellKey) &&
                                    !isSelectedCell;
          const isPrimaryActiveSearch = activeSearchCell?.rowId === rowData.id &&
                                       activeSearchCell?.columnId === primaryColumn.id;
          const isPrimaryHighlighted = highlightedCells?.get(rowData.id)?.has(primaryColumn.id);

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
              onMouseEnter={() => handleMouseEnter(rowData.id, primaryColumn.id)}
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
                    setEditingCell({ rowId: rowData.id, columnId: primaryColumn.id })
                  }
                  onChange={(e) =>
                    handleCellChange(rowData.id, primaryColumn.id, e.target.value)
                  }
                />
                {showLastRowTooltip &&
                  editingCell?.rowId === rowData.id &&
                  editingCell?.columnId === primaryColumn.id && (
                    <div className="absolute bottom-full left-0 z-50 mb-1 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg">
                      Shift+Enter to create new row
                      <div className="absolute left-4 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-900" />
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
                      <div className="absolute bottom-full left-0 z-50 mb-1 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg">
                        Shift+Enter to create new row
                        <div className="absolute left-4 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-900" />
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

// --- Main GridTable Component ---
export const GridTable = forwardRef<GridTableHandle, GridTableProps>(
  function GridTable(
    {
      columns,
      rows,
      onCellUpdate,
      onAddRow,
      onAddColumn,
      onReorderColumn,
      onUpdateColumn,
      onReorderRow,
      onLoadMore,
      hasNextPage,
      sorts = [],
      rowHeight = "short",
      highlightedCells,
      activeSearchCell,
      searchQuery = "",
      onContextMenu,
    },
    ref,
  ) {
    const currentRowHeight = ROW_HEIGHT_MAP[rowHeight] ?? 36;

    // --- Selection state ---
    const [selectedCell, setSelectedCell] = useState<CellAddress | null>(null);
    const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
    const [selectionStart, setSelectionStart] = useState<CellAddress | null>(
      null,
    );
    const [selectionEnd, setSelectionEnd] = useState<CellAddress | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>(
      {},
    );
    const [editingHeader, setEditingHeader] = useState<number | null>(null);
    const [editingHeaderValue, setEditingHeaderValue] = useState("");
    const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
    const [primaryColumnWidth, setPrimaryColumnWidth] = useState(PRIMARY_WIDTH);
    const [showLastRowTooltip, setShowLastRowTooltip] = useState(false);

    const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const parentRef = useRef<HTMLDivElement>(null);
    const primaryResizeStartWidth = useRef<number>(0);
    const primaryResizeStartX = useRef<number>(0);

    // Find primary column
    const primaryColumn = useMemo(
      () => columns.find((c) => c.primary) ?? null,
      [columns],
    );
    const nonPrimaryColumns = useMemo(
      () => columns.filter((c) => !c.primary),
      [columns],
    );

    // Width of frozen section (checkbox + primary column)
    const frozenWidth =
      CHECKBOX_WIDTH + (primaryColumn ? primaryColumnWidth : 0);

    // Primary column resize handlers
    const handlePrimaryResizeStart = useCallback(
      (e: React.MouseEvent) => {
        primaryResizeStartWidth.current = primaryColumnWidth;
        primaryResizeStartX.current = e.clientX;

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const delta = moveEvent.clientX - primaryResizeStartX.current;
          const newWidth = Math.max(
            80,
            primaryResizeStartWidth.current + delta,
          );
          setPrimaryColumnWidth(newWidth);
        };

        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      },
      [primaryColumnWidth],
    );

    const handleCellChange = useCallback(
      (rowId: number, columnId: number, value: string) => {
        const key = `${rowId}-${columnId}`;
        const existing = debounceTimers.current.get(key);
        if (existing) clearTimeout(existing);
        debounceTimers.current.set(
          key,
          setTimeout(() => {
            onCellUpdate(rowId, columnId, value);
            debounceTimers.current.delete(key);
          }, 300),
        );
      },
      [onCellUpdate],
    );

    // --- Multi-cell selection helpers ---
    const getSelectedCells = useCallback((): Set<string> => {
      if (!selectionStart || !selectionEnd) {
        if (selectedCell)
          return new Set([`${selectedCell.rowId}-${selectedCell.columnId}`]);
        return new Set();
      }
      const result = new Set<string>();
      const rowIds = rows.map((r) => r.id);
      const colIds = columns.map((c) => c.id);
      const r1 = rowIds.indexOf(selectionStart.rowId);
      const r2 = rowIds.indexOf(selectionEnd.rowId);
      const c1 = colIds.indexOf(selectionStart.columnId);
      const c2 = colIds.indexOf(selectionEnd.columnId);
      const rMin = Math.min(r1, r2);
      const rMax = Math.max(r1, r2);
      const cMin = Math.min(c1, c2);
      const cMax = Math.max(c1, c2);
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          const rid = rowIds[r];
          const cid = colIds[c];
          if (rid !== undefined && cid !== undefined) {
            result.add(`${rid}-${cid}`);
          }
        }
      }
      return result;
    }, [selectionStart, selectionEnd, selectedCell, rows, columns]);

    const handleMouseDown = useCallback(
      (rowId: number, columnId: number, e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setSelectedCell({ rowId, columnId });
        setSelectionStart({ rowId, columnId });
        setSelectionEnd({ rowId, columnId });
        setIsSelecting(true);
        // Exit edit mode when clicking on a cell
        setEditingCell(null);
      },
      [],
    );

    const handleMouseEnter = useCallback(
      (rowId: number, columnId: number) => {
        if (isSelecting) {
          setSelectionEnd({ rowId, columnId });

          // Auto-scroll left when selecting into the primary column area
          const col = columns.find((c) => c.id === columnId);
          if (col?.primary && parentRef.current) {
            const scrollEl = parentRef.current;
            if (scrollEl.scrollLeft > 0) {
              scrollEl.scrollTo({
                left: 0,
                behavior: "smooth",
              });
            }
          }
        }
      },
      [isSelecting, columns],
    );

    useEffect(() => {
      const handleMouseUp = () => setIsSelecting(false);
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
    }, []);

    // --- Deselect cells when clicking outside table ---
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          parentRef.current &&
          !parentRef.current.contains(event.target as Node)
        ) {
          setSelectedCell(null);
          setEditingCell(null);
          setSelectionStart(null);
          setSelectionEnd(null);
          // Also blur any focused input to remove focus ring
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Focus input when entering edit mode ---
    useEffect(() => {
      if (editingCell) {
        const cellId = `cell-${editingCell.rowId}-${editingCell.columnId}`;
        const cellElement = document.getElementById(cellId);
        if (cellElement) {
          const input = cellElement.querySelector("input");
          if (input) {
            input.focus();
            // Move cursor to end of input
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }
      }
    }, [editingCell]);

    // --- Enter key behavior for editing and navigation ---
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Handle Shift+Enter to add new row
        if (e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          onAddRow();
          setShowLastRowTooltip(false);
          return;
        }

        // Handle Enter key when editing
        if (editingCell && e.key === "Enter") {
          e.preventDefault();
          setEditingCell(null);

          // Find current row index
          const currentRowIndex = rows.findIndex(
            (r) => r.id === editingCell.rowId,
          );

          if (currentRowIndex !== -1) {
            // If not on last row, move to cell below
            if (currentRowIndex < rows.length - 1) {
              const nextRow = rows[currentRowIndex + 1];
              if (nextRow) {
                setSelectedCell({
                  rowId: nextRow.id,
                  columnId: editingCell.columnId,
                });
                // Scroll to next cell
                setTimeout(() => {
                  const cellId = `cell-${nextRow.id}-${editingCell.columnId}`;
                  const cellElement = document.getElementById(cellId);
                  if (cellElement) {
                    cellElement.scrollIntoView({
                      block: "nearest",
                      inline: "nearest",
                      behavior: "smooth",
                    });
                  }
                }, 0);
              }
            } else {
              // On last row, show tooltip
              setShowLastRowTooltip(true);
              setTimeout(() => setShowLastRowTooltip(false), 3000);
            }
          }
          return;
        }

        // Handle Enter key when cell is selected but not editing
        if (selectedCell && !editingCell && e.key === "Enter") {
          e.preventDefault();
          setEditingCell(selectedCell);
          return;
        }

        // Handle Escape key to exit edit mode
        if (editingCell && e.key === "Escape") {
          e.preventDefault();
          setEditingCell(null);
          setShowLastRowTooltip(false);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [editingCell, selectedCell, rows, onAddRow]);

    // --- Arrow key navigation between cells ---
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Only navigate if not in edit mode
        if (editingCell) return;

        const isArrowKey = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
        const isTabKey = e.key === "Tab";

        if (!isArrowKey && !isTabKey) return;
        if (!selectedCell) return;

        e.preventDefault();

        // Build column list: primary column + non-primary columns
        const allColumns = primaryColumn
          ? [primaryColumn, ...nonPrimaryColumns]
          : nonPrimaryColumns;

        // Find current cell indices
        const currentRowIndex = rows.findIndex((r) => r.id === selectedCell.rowId);
        const currentColumnIndex = allColumns.findIndex(
          (c) => c.id === selectedCell.columnId
        );

        if (currentRowIndex === -1 || currentColumnIndex === -1) return;

        let newRowIndex = currentRowIndex;
        let newColumnIndex = currentColumnIndex;

        // Calculate new position
        if (e.key === "ArrowUp") {
          newRowIndex = Math.max(0, currentRowIndex - 1);
        } else if (e.key === "ArrowDown") {
          newRowIndex = Math.min(rows.length - 1, currentRowIndex + 1);
        } else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
          newColumnIndex = Math.max(0, currentColumnIndex - 1);
        } else if (e.key === "ArrowRight" || e.key === "Tab") {
          newColumnIndex = Math.min(allColumns.length - 1, currentColumnIndex + 1);
        }

        // Update selected cell
        const newRow = rows[newRowIndex];
        const newColumn = allColumns[newColumnIndex];

        if (newRow && newColumn) {
          setSelectedCell({ rowId: newRow.id, columnId: newColumn.id });

          // Scroll to cell (use browser's built-in scroll)
          setTimeout(() => {
            const cellId = `cell-${newRow.id}-${newColumn.id}`;
            const cellElement = document.getElementById(cellId);
            if (cellElement) {
              cellElement.scrollIntoView({
                block: "nearest",
                inline: "nearest",
                behavior: "smooth",
              });
            }
          }, 0);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedCell, editingCell, rows, primaryColumn, nonPrimaryColumns]);

    // --- Auto-scroll when mouse near edges ---
    useEffect(() => {
      if (!isSelecting || !parentRef.current) return;

      let animationId: number;
      let lastMouseX = 0;

      const handleMouseMove = (e: MouseEvent) => {
        lastMouseX = e.clientX;
      };

      const autoScroll = () => {
        if (!parentRef.current) return;

        const container = parentRef.current;
        const containerRect = container.getBoundingClientRect();
        const frozenEdge = containerRect.left + frozenWidth;
        const rightEdge = containerRect.right;

        const EDGE_THRESHOLD = 100; // Distance from edge to trigger scroll
        const MAX_SCROLL_SPEED = 20; // Max pixels per frame

        let scrollDelta = 0;

        // Check left edge (near frozen primary column)
        if (
          lastMouseX < frozenEdge + EDGE_THRESHOLD &&
          lastMouseX > frozenEdge
        ) {
          const distance = frozenEdge + EDGE_THRESHOLD - lastMouseX;
          const intensity = Math.min(distance / EDGE_THRESHOLD, 1);
          scrollDelta = -intensity * MAX_SCROLL_SPEED;
        }
        // Check right edge
        else if (
          lastMouseX > rightEdge - EDGE_THRESHOLD &&
          lastMouseX < rightEdge
        ) {
          const distance = rightEdge - lastMouseX;
          const intensity = Math.min(
            (EDGE_THRESHOLD - distance) / EDGE_THRESHOLD,
            1,
          );
          scrollDelta = intensity * MAX_SCROLL_SPEED;
        }

        if (scrollDelta !== 0) {
          container.scrollLeft += scrollDelta;
        }

        animationId = requestAnimationFrame(autoScroll);
      };

      window.addEventListener("mousemove", handleMouseMove);
      animationId = requestAnimationFrame(autoScroll);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        cancelAnimationFrame(animationId);
      };
    }, [isSelecting, frozenWidth]);

    // --- TanStack Table column defs (NO selectedCell dep!) ---
    const columnDefs = useMemo<ColumnDef<GridRow>[]>(() => {
      const defs: ColumnDef<GridRow>[] = [];

      nonPrimaryColumns.forEach((col) => {
        defs.push({
          id: String(col.id),
          accessorFn: (row) => {
            const val = row.cells[String(col.id)];
            return val != null ? String(val) : "";
          },
          size: col.width,
          minSize: 80,
          enableResizing: true,
          header: () => null,
          cell: () => null,
        });
      });

      return defs;
    }, [nonPrimaryColumns]);

    const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
      () => {
        const sizing: Record<string, number> = {};
        nonPrimaryColumns.forEach((col) => {
          sizing[String(col.id)] = col.width;
        });
        return sizing;
      },
    );

    const table = useReactTable({
      data: rows,
      columns: columnDefs,
      state: {
        rowSelection,
        columnSizing,
      },
      onRowSelectionChange: setRowSelection,
      onColumnSizingChange: setColumnSizing,
      getCoreRowModel: getCoreRowModel(),
      getRowId: (row) => String(row.id),
      enableRowSelection: true,
      enableColumnResizing: true,
      columnResizeMode: "onChange",
    });

    // Virtual rows
    const tableRows = table.getRowModel().rows;
    const rowVirtualizer = useVirtualizer({
      count: tableRows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => currentRowHeight,
      overscan: 10,
    });

    // Expose scrollToRow method via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollToRow: (rowId: number) => {
          const index = tableRows.findIndex((r) => r.original.id === rowId);
          if (index !== -1) {
            rowVirtualizer.scrollToIndex(index, { align: "center" });
          }
        },
      }),
      [tableRows, rowVirtualizer],
    );

    // Remeasure virtualizer when row height changes
    useEffect(() => {
      rowVirtualizer.measure();
    }, [currentRowHeight, rowVirtualizer]);

    // Load more
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= tableRows.length - 5 && hasNextPage) {
      onLoadMore?.();
    }

    // DnD
    const columnOrder = useMemo(
      () => nonPrimaryColumns.map((c) => `col-${c.id}`),
      [nonPrimaryColumns],
    );

    const rowOrder = useMemo(() => rows.map((r) => `row-${r.id}`), [rows]);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    // Selected row IDs (checkbox selection — blue highlight)
    const selectedRowIds = useMemo(() => {
      const set = new Set<string>();
      for (const [key, val] of Object.entries(rowSelection)) {
        if (val) set.add(key);
      }
      return set;
    }, [rowSelection]);

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        // Check if it's a column drag (prefix col-)
        if (activeIdStr.startsWith("col-") && overIdStr.startsWith("col-")) {
          const activeId = Number(activeIdStr.replace("col-", ""));
          const overId = Number(overIdStr.replace("col-", ""));

          const allCols = columns;
          const oldIndex = allCols.findIndex((c) => c.id === activeId);
          const newIndex = allCols.findIndex((c) => c.id === overId);
          if (oldIndex === -1 || newIndex === -1) return;

          if (newIndex === 0) {
            onReorderColumn(activeId, null, allCols[0]!.id);
          } else if (oldIndex < newIndex) {
            onReorderColumn(activeId, allCols[newIndex]!.id, null);
          } else {
            onReorderColumn(activeId, null, allCols[newIndex]!.id);
          }
        }
        // Check if it's a row drag (prefix row-)
        else if (
          activeIdStr.startsWith("row-") &&
          overIdStr.startsWith("row-")
        ) {
          const draggedRowId = Number(activeIdStr.replace("row-", ""));
          const targetRowId = Number(overIdStr.replace("row-", ""));
          if (onReorderRow) {
            // Check if dragged row is part of a multi-selection
            const draggedRowIndex = rows.findIndex(
              (r) => r.id === draggedRowId,
            );
            const isDraggedRowSelected =
              draggedRowIndex !== -1 &&
              selectedRowIds.has(String(draggedRowIndex));

            if (isDraggedRowSelected && selectedRowIds.size > 1) {
              // Multi-row drag: collect all selected row IDs in order
              const selectedIds = rows
                .filter((_, index) => selectedRowIds.has(String(index)))
                .map((r) => r.id);
              onReorderRow(selectedIds, targetRowId);
            } else {
              // Single row drag
              onReorderRow([draggedRowId], targetRowId);
            }
          }
        }
      },
      [columns, onReorderColumn, onReorderRow, rows, selectedRowIds],
    );

    // Total scrollable width
    const totalScrollableWidth = useMemo(() => {
      const headers = table.getHeaderGroups()[0]?.headers ?? [];
      return headers.reduce((sum, h) => sum + h.getSize(), 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, columnSizing]);

    const handleHeaderDoubleClick = useCallback((col: GridColumn) => {
      setEditingHeader(col.id);
      setEditingHeaderValue(col.name);
    }, []);

    const handleHeaderRename = useCallback(
      (colId: number) => {
        const col = columns.find((c) => c.id === colId);
        if (
          editingHeaderValue.trim() &&
          editingHeaderValue.trim() !== col?.name
        ) {
          onUpdateColumn(colId, editingHeaderValue.trim());
        }
        setEditingHeader(null);
      },
      [editingHeaderValue, columns, onUpdateColumn],
    );

    // Memoize selected cells set for render
    const selectedCells = getSelectedCells();
    const isMultiSelect = !!(
      selectionStart &&
      selectionEnd &&
      (selectionStart.rowId !== selectionEnd.rowId ||
        selectionStart.columnId !== selectionEnd.columnId)
    );

    // Row that contains the selected cell
    const activeRowId = selectedCell?.rowId ?? null;

    // Determine row background for frozen section
    const getRowBg = useCallback(
      (rowId: number): string => {
        if (selectedRowIds.has(String(rowId))) return "bg-blue-50";
        if (rowId === activeRowId || rowId === hoveredRowId)
          return "bg-gray-50";
        return "bg-white";
      },
      [selectedRowIds, activeRowId, hoveredRowId],
    );

    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-100">
        <div ref={parentRef} className="flex-1 overflow-auto">
          <div
            className="flex min-h-full flex-col"
            style={{ minWidth: "fit-content" }}
          >
            {/* === HEADER === */}
            <div
              className="sticky top-0 z-40 flex shrink-0"
              style={{ minWidth: "fit-content" }}
            >
              {/* Frozen: checkbox + primary header */}
              <div
                className="sticky left-0 z-50 flex shrink-0 border-b border-gray-200 bg-white"
                style={{
                  width: frozenWidth,
                  height: HEADER_HEIGHT,
                  borderRight: "2px solid rgb(209, 213, 219)",
                }}
              >
                {/* Checkbox header — use same layout as rows for alignment */}
                <div
                  className="flex items-center"
                  style={{ width: CHECKBOX_WIDTH }}
                >
                  <div className="w-5 shrink-0 pl-1.5" />
                  <div className="flex flex-1 justify-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                      checked={table.getIsAllRowsSelected()}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                  </div>
                </div>

                {/* Primary column header */}
                {primaryColumn && (
                  <div
                    className="relative flex items-center bg-white border-b border-gray-200"
                    style={{ width: primaryColumnWidth, height: HEADER_HEIGHT }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onContextMenu?.({
                        type: "column",
                        position: { x: e.clientX, y: e.clientY },
                        data: { columnId: primaryColumn.id },
                      });
                    }}
                  >
                    {editingHeader === primaryColumn.id ? (
                      <div className="flex h-full w-full items-center px-2">
                        <input
                          type="text"
                          value={editingHeaderValue}
                          onChange={(e) =>
                            setEditingHeaderValue(e.target.value)
                          }
                          onBlur={() => handleHeaderRename(primaryColumn.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleHeaderRename(primaryColumn.id);
                            if (e.key === "Escape") setEditingHeader(null);
                          }}
                          className="w-full bg-transparent text-xs font-normal text-gray-700 outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div
                        className="group flex h-full w-full items-center justify-between px-2 py-1.5"
                        onDoubleClick={() =>
                          handleHeaderDoubleClick(primaryColumn)
                        }
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <svg
                            className="h-3.5 w-3.5 shrink-0 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 12h16m-7 6h7"
                            />
                          </svg>
                          <span className="truncate text-xs font-normal text-gray-700">
                            {primaryColumn.name}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Resize handle */}
                    <div
                      onMouseDown={handlePrimaryResizeStart}
                      className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Scrollable headers */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columnOrder}
                  strategy={horizontalListSortingStrategy}
                >
                  <div
                    className="flex border-b border-gray-200"
                    style={{ width: totalScrollableWidth }}
                  >
                    {table.getHeaderGroups()[0]?.headers.map((header) => {
                      const col = nonPrimaryColumns.find(
                        (c) => String(c.id) === header.id,
                      );

                      if (!col) return null;

                      return (
                        <div
                          key={header.id}
                          className="relative border-r border-gray-200 bg-white"
                          style={{
                            width: header.getSize(),
                            height: HEADER_HEIGHT,
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onContextMenu?.({
                              type: "column",
                              position: { x: e.clientX, y: e.clientY },
                              data: { columnId: col.id },
                            });
                          }}
                        >
                          {editingHeader === col.id ? (
                            <div className="flex h-full items-center bg-white px-2">
                              <input
                                type="text"
                                value={editingHeaderValue}
                                onChange={(e) =>
                                  setEditingHeaderValue(e.target.value)
                                }
                                onBlur={() => handleHeaderRename(col.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleHeaderRename(col.id);
                                  if (e.key === "Escape")
                                    setEditingHeader(null);
                                }}
                                className="w-full bg-transparent text-xs font-normal text-gray-700 outline-none"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div
                              className="h-full"
                              onDoubleClick={() => handleHeaderDoubleClick(col)}
                            >
                              <SortableHeaderCell
                                column={col}
                                sorts={sorts}
                                isPrimary={false}
                              >
                                <button className="invisible rounded p-0.5 group-hover:visible hover:bg-gray-200">
                                  <svg
                                    className="h-3 w-3 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </button>
                              </SortableHeaderCell>
                            </div>
                          )}

                          {/* Resize handle */}
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              <div
                key="_add"
                className="flex items-center justify-center border border-gray-200 bg-white px-12"
                style={{ width: 48, height: HEADER_HEIGHT }}
              >
                <button
                  onClick={onAddColumn}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* === ROWS === */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rowOrder}
                strategy={verticalListSortingStrategy}
              >
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    position: "relative",
                    minWidth: "fit-content",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = tableRows[virtualRow.index]!;
                    const rowData = row.original;
                    const isRowSelected = selectedRowIds.has(
                      String(rowData.id),
                    );
                    const isActiveRow = rowData.id === activeRowId;
                    const isHoveredRow = rowData.id === hoveredRowId;
                    const rowBg = getRowBg(rowData.id);

                    return (
                      <SortableRow
                        key={row.id}
                        rowId={rowData.id}
                        virtualStart={virtualRow.start}
                        virtualIndex={virtualRow.index}
                        currentRowHeight={currentRowHeight}
                        isRowSelected={isRowSelected}
                        isActiveRow={isActiveRow}
                        isHoveredRow={isHoveredRow}
                        rowBg={rowBg}
                        rowData={rowData}
                        row={row}
                        frozenWidth={frozenWidth}
                        primaryColumn={primaryColumn}
                        primaryColumnWidth={primaryColumnWidth}
                        nonPrimaryColumns={nonPrimaryColumns}
                        columnSizing={columnSizing}
                        selectedCell={selectedCell}
                        editingCell={editingCell}
                        selectedCells={selectedCells}
                        isMultiSelect={isMultiSelect}
                        highlightedCells={highlightedCells}
                        activeSearchCell={activeSearchCell}
                        searchQuery={searchQuery}
                        handleMouseDown={handleMouseDown}
                        handleMouseEnter={handleMouseEnter}
                        handleCellChange={handleCellChange}
                        setEditingCell={setEditingCell}
                        setHoveredRowId={setHoveredRowId}
                        onContextMenu={onContextMenu}
                        totalScrollableWidth={totalScrollableWidth}
                        showLastRowTooltip={showLastRowTooltip}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add row button */}
            <div
              className="flex shrink-0 bg-gray-100"
              style={{ minWidth: "fit-content" }}
            >
              <div
                className="sticky left-0 z-10 flex border-b border-gray-200 bg-white"
                style={{
                  width: frozenWidth,
                  height: HEADER_HEIGHT,
                  borderRight: "2px solid rgb(209, 213, 219)",
                }}
              >
                <button
                  onClick={onAddRow}
                  className="ml-6 flex w-full items-center gap-2 px-3 py-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
              {/* Scrollable area matching table width */}
              <div
                className="flex border-r border-b border-gray-200 bg-white"
                style={{ width: totalScrollableWidth }}
              />
            </div>

            {/* Filler — extends the frozen divider to the bottom of the viewport */}
            <div
              className="flex flex-1 bg-gray-100"
              style={{ minWidth: "fit-content", minHeight: 0 }}
            >
              <div
                className="sticky left-0 "
                style={{
                  width: frozenWidth,
                  borderRight: "2px solid rgb(209, 213, 219)",
                }}
              />
              <div className="flex-1 " />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
