"use client";

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { GridColumn, GridRow, ContextMenuState } from "~/types/grid";
import {
  ROW_HEIGHT_MAP,
  HEADER_HEIGHT,
  CHECKBOX_WIDTH,
  PRIMARY_WIDTH,
} from "../grid-table/constants";
import type { CellAddress, GridTableHandle } from "../grid-table/types";
import { SortableRow } from "./components/sortable-row";
import { GridHeader } from "./components/grid-header";

// Custom Hooks
import { useGridSelection } from "./hooks/useGridSelection";
import { useGridNavigation } from "./hooks/useGridNavigation";
import type { SortConfig } from "~/server/api/routers/view";
import type { ColumnType } from "generated/prisma/enums";
import { PlusIcon } from "~/components/icons";

// Re-export types
export type { GridTableHandle } from "../grid-table/types";

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
    const parentRef = useRef<HTMLDivElement>(null);
    const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // --- 1. Core State ---
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>(
      {},
    );
    const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
    const [showLastRowTooltip, setShowLastRowTooltip] = useState(false);
    const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
    const [primaryColumnWidth, setPrimaryColumnWidth] = useState(PRIMARY_WIDTH);

    // --- 2. Derived State ---
    const primaryColumn = useMemo(
      () => columns.find((c) => c.primary) ?? null,
      [columns],
    );
    const nonPrimaryColumns = useMemo(
      () => columns.filter((c) => !c.primary),
      [columns],
    );
    const frozenWidth =
      CHECKBOX_WIDTH + (primaryColumn ? primaryColumnWidth : 0);
    const selectedRowIds = useMemo(() => {
      const set = new Set<string>();
      for (const [key, val] of Object.entries(rowSelection)) {
        if (val) set.add(key);
      }
      return set;
    }, [rowSelection]);

    // --- 3. Custom Hooks ---

    // Selection Logic
    const {
      selectedCell,
      setSelectedCell,
      selectedCells,
      handleMouseDown,
      handleMouseEnter,
      isSelecting,
      isMultiSelect,
    } = useGridSelection(rows, columns, setEditingCell);

    // Navigation Logic
    useGridNavigation({
      rows,
      columns,
      primaryColumn,
      nonPrimaryColumns,
      selectedCell,
      setSelectedCell,
      editingCell,
      setEditingCell,
      onAddRow,
      setShowLastRowTooltip,
    });

    // --- 4. Helpers ---

    // Cell Updates with Debounce
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

    // Primary Resize Logic
    const primaryResizeStartWidth = useRef<number>(0);
    const primaryResizeStartX = useRef<number>(0);
    const handlePrimaryResizeStart = useCallback(
      (e: React.MouseEvent) => {
        primaryResizeStartWidth.current = primaryColumnWidth;
        primaryResizeStartX.current = e.clientX;
        const handleMouseMove = (moveEvent: MouseEvent) => {
          const delta = moveEvent.clientX - primaryResizeStartX.current;
          setPrimaryColumnWidth(
            Math.max(80, primaryResizeStartWidth.current + delta),
          );
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

    // --- 5. TanStack Table Setup ---
    const columnDefs = useMemo<ColumnDef<GridRow>[]>(() => {
      return nonPrimaryColumns.map((col) => ({
        id: String(col.id),
        accessorFn: (row) => row.cells[String(col.id)] ?? "",
        size: col.width,
        minSize: 80,
        enableResizing: true,
        header: () => null,
        cell: () => null,
      }));
    }, [nonPrimaryColumns]);

    const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
      {},
    );

    // Sync initial sizing
    useEffect(() => {
      const initial: Record<string, number> = {};
      nonPrimaryColumns.forEach((c) => (initial[String(c.id)] = c.width));
      setColumnSizing((prev) =>
        Object.keys(prev).length === 0 ? initial : prev,
      );
    }, [nonPrimaryColumns]);

    const table = useReactTable({
      data: rows,
      columns: columnDefs,
      state: { rowSelection, columnSizing },
      onRowSelectionChange: setRowSelection,
      onColumnSizingChange: setColumnSizing,
      getCoreRowModel: getCoreRowModel(),
      getRowId: (row) => String(row.id),
      enableRowSelection: true,
      enableColumnResizing: true,
      columnResizeMode: "onChange",
    });

    const totalScrollableWidth =
      table
        .getHeaderGroups()[0]
        ?.headers.reduce((sum, h) => sum + h.getSize(), 0) ?? 0;

    // --- 6. Virtualization ---
    const tableRows = table.getRowModel().rows;
    const rowVirtualizer = useVirtualizer({
      count: tableRows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => currentRowHeight,
      overscan: 10,
    });

    // Handle Load More
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= tableRows.length - 5 && hasNextPage) {
      onLoadMore?.();
    }

    useImperativeHandle(
      ref,
      () => ({
        scrollToRow: (rowId: number) => {
          const index = tableRows.findIndex((r) => r.original.id === rowId);
          if (index !== -1)
            rowVirtualizer.scrollToIndex(index, { align: "center" });
        },
      }),
      [tableRows, rowVirtualizer],
    );

    useEffect(() => {
      rowVirtualizer.measure();
    }, [currentRowHeight, rowVirtualizer]);

    // --- 7. Auto Scroll on Drag ---
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
        const { left, right } = container.getBoundingClientRect();
        const frozenEdge = left + frozenWidth;
        const EDGE_THRESHOLD = 100;

        let scrollDelta = 0;
        if (
          lastMouseX < frozenEdge + EDGE_THRESHOLD &&
          lastMouseX > frozenEdge
        ) {
          scrollDelta =
            -Math.min(
              (frozenEdge + EDGE_THRESHOLD - lastMouseX) / EDGE_THRESHOLD,
              1,
            ) * 20;
        } else if (lastMouseX > right - EDGE_THRESHOLD && lastMouseX < right) {
          scrollDelta =
            Math.min(
              (EDGE_THRESHOLD - (right - lastMouseX)) / EDGE_THRESHOLD,
              1,
            ) * 20;
        }

        if (scrollDelta !== 0) container.scrollLeft += scrollDelta;
        animationId = requestAnimationFrame(autoScroll);
      };
      window.addEventListener("mousemove", handleMouseMove);
      animationId = requestAnimationFrame(autoScroll);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        cancelAnimationFrame(animationId);
      };
    }, [isSelecting, frozenWidth]);

    // --- 8. Drag and Drop Logic ---
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );
    const columnOrder = useMemo(
      () => nonPrimaryColumns.map((c) => `col-${c.id}`),
      [nonPrimaryColumns],
    );
    const rowOrder = useMemo(() => rows.map((r) => `row-${r.id}`), [rows]);

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const activeStr = String(active.id);
        const overStr = String(over.id);

        if (activeStr.startsWith("col-") && overStr.startsWith("col-")) {
          const activeId = Number(activeStr.replace("col-", ""));
          const overId = Number(overStr.replace("col-", ""));
          const all = columns;
          const oldIdx = all.findIndex((c) => c.id === activeId);
          const newIdx = all.findIndex((c) => c.id === overId);

          if (newIdx === 0) onReorderColumn(activeId, null, all[0]!.id);
          else if (oldIdx < newIdx)
            onReorderColumn(activeId, all[newIdx]!.id, null);
          else onReorderColumn(activeId, null, all[newIdx]!.id);
        } else if (
          activeStr.startsWith("row-") &&
          overStr.startsWith("row-") &&
          onReorderRow
        ) {
          const draggedId = Number(activeStr.replace("row-", ""));
          const targetId = Number(overStr.replace("row-", ""));
          const draggedIndex = rows.findIndex((r) => r.id === draggedId);

          if (
            draggedIndex !== -1 &&
            selectedRowIds.has(String(draggedIndex)) &&
            selectedRowIds.size > 1
          ) {
            const selected = rows
              .filter((_, i) => selectedRowIds.has(String(i)))
              .map((r) => r.id);
            onReorderRow(selected, targetId);
          } else {
            onReorderRow([draggedId], targetId);
          }
        }
      },
      [columns, rows, onReorderColumn, onReorderRow, selectedRowIds],
    );

    // --- 9. Deselect when clicking outside ---
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          parentRef.current &&
          !parentRef.current.contains(e.target as Node)
        ) {
          setSelectedCell(null);
          setEditingCell(null);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [setSelectedCell, setEditingCell]);

    // --- 10. Focus Input Effect ---
    useEffect(() => {
      if (editingCell) {
        const el = document
          .getElementById(`cell-${editingCell.rowId}-${editingCell.columnId}`)
          ?.querySelector("input");
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }
    }, [editingCell]);

    // --- Render ---
    const activeRowId = selectedCell?.rowId ?? null;

    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-100">
        <div ref={parentRef} className="flex-1 overflow-auto">
          <div
            className="flex min-h-full flex-col"
            style={{ minWidth: "fit-content" }}
          >
            <GridHeader
              frozenWidth={frozenWidth}
              totalScrollableWidth={totalScrollableWidth}
              primaryColumn={primaryColumn}
              nonPrimaryColumns={nonPrimaryColumns}
              primaryColumnWidth={primaryColumnWidth}
              handlePrimaryResizeStart={handlePrimaryResizeStart}
              isAllSelected={table.getIsAllRowsSelected()}
              onToggleAllSelected={table.getToggleAllRowsSelectedHandler()}
              sorts={sorts}
              columnOrder={columnOrder}
              sensors={sensors}
              handleDragEnd={handleDragEnd}
              headerGroups={table.getHeaderGroups()[0]?.headers ?? []}
              onAddColumn={onAddColumn}
              onUpdateColumn={onUpdateColumn}
              onContextMenu={onContextMenu}
            />

            {/* Rows */}
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

                    return (
                      <SortableRow
                        key={row.id}
                        rowId={rowData.id}
                        virtualStart={virtualRow.start}
                        virtualIndex={virtualRow.index}
                        currentRowHeight={currentRowHeight}
                        isRowSelected={selectedRowIds.has(String(rowData.id))}
                        rowBg={
                          selectedRowIds.has(String(rowData.id))
                            ? "bg-blue-50"
                            : rowData.id === activeRowId ||
                                rowData.id === hoveredRowId
                              ? "bg-gray-50"
                              : "bg-white"
                        }
                        rowData={rowData}
                        row={row}
                        frozenWidth={frozenWidth}
                        primaryColumn={primaryColumn}
                        primaryColumnWidth={primaryColumnWidth}
                        nonPrimaryColumns={nonPrimaryColumns}
                        columnSizing={columnSizing}
                        selectedCell={selectedCell}
                        editingCell={editingCell}
                        selectedCells={selectedCells} // PASSED MEMOIZED SET
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

            {/* Bottom Add Row Section */}
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
                  className="ml-6 flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-600"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
              <div
                className="flex border-r border-b border-gray-200 bg-white"
                style={{ width: totalScrollableWidth }}
              />
            </div>

            {/* Bottom Filler */}
            <div
              className="flex flex-1 bg-gray-100"
              style={{ minWidth: "fit-content", minHeight: 0 }}
            >
              <div
                className="sticky left-0"
                style={{
                  width: frozenWidth,
                  borderRight: "2px solid rgb(209, 213, 219)",
                }}
              />
              <div className="flex-1" />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
