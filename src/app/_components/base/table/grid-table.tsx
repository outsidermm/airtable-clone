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
import type { GridColumn, GridRow } from "~/types/grid";
import {
  ROW_HEIGHT_MAP,
  HEADER_HEIGHT,
  CHECKBOX_WIDTH,
  PRIMARY_WIDTH,
} from "../constants";

import { SortableRow } from "./components/sortable-row";
import { GridHeader } from "./components/grid-header";

// Custom Hooks
import { useGridSelection } from "./hooks/useGridSelection";
import { useGridNavigation } from "./hooks/useGridNavigation";
import type { SortConfig } from "~/server/api/routers/view";
import { PlusIcon } from "~/app/_components/ui/icons";
import type { CellAddress } from "~/types/cell";
import type { GridTableHandle } from "~/types/table";
import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { useColumnMutations } from "../../hooks/use-column-mutations";


interface GridTableProps {
  columns: GridColumn[];
  rows: GridRow[];
  onCellUpdate: (rowId: number, columnId: number, value: string) => void;
  onReorderRow?: (draggedRowIds: number[], targetRowId: number) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  totalRowCount?: number;
  sorts?: SortConfig[];
  rowHeight?: "short" | "medium" | "tall" | "extraTall";
}

export const GridTable = forwardRef<GridTableHandle, GridTableProps>(
  function GridTable(
    {
      columns,
      rows,
      onCellUpdate,
      onReorderRow,
      onLoadMore,
      hasNextPage,
      isFetchingNextPage,
      totalRowCount,
      sorts = [],
      rowHeight = "short",
    },
    ref,
  ) {
    const {activeTableId } = useBase();
    const rowMutations = useRowMutations(activeTableId);
    const columnMutations = useColumnMutations(activeTableId);


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
      primaryColumn,
      nonPrimaryColumns,
      selectedCell,
      setSelectedCell,
      editingCell,
      setEditingCell,
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
    const loadedRowCount = tableRows.length;
    // Use totalRowCount for the virtualizer so scrollbar is proportionate to ALL rows
    const virtualizerCount = totalRowCount ?? loadedRowCount;
    const rowVirtualizer = useVirtualizer({
      count: virtualizerCount,
      getScrollElement: () => parentRef.current,
      estimateSize: () => currentRowHeight,
      overscan: 10,
    });

    // Keep fresh refs so scroll handler never has stale closures
    const hasNextPageRef = useRef(hasNextPage);
    const isFetchingRef = useRef(isFetchingNextPage);
    const loadedRowCountRef = useRef(loadedRowCount);
    const onLoadMoreRef = useRef(onLoadMore);
    hasNextPageRef.current = hasNextPage;
    isFetchingRef.current = isFetchingNextPage;
    loadedRowCountRef.current = loadedRowCount;
    onLoadMoreRef.current = onLoadMore;

    // Trigger fetch when scroll position is within 20 rows of unloaded territory
    const triggerLoadIfNeeded = useCallback(() => {
      const el = parentRef.current;
      if (!el || !hasNextPageRef.current || isFetchingRef.current) return;
      const loadedPx = loadedRowCountRef.current * currentRowHeight;
      const scrollBottom = el.scrollTop + el.clientHeight;
      if (scrollBottom >= loadedPx - currentRowHeight * 20) {
        onLoadMoreRef.current?.();
      }
    }, [currentRowHeight]);

    // Attach scroll listener
    useEffect(() => {
      const el = parentRef.current;
      if (!el) return;
      el.addEventListener("scroll", triggerLoadIfNeeded, { passive: true });
      return () => el.removeEventListener("scroll", triggerLoadIfNeeded);
    }, [triggerLoadIfNeeded]);

    // Chain: after each page load, check if we're still in unloaded territory
    useEffect(() => {
      if (!isFetchingNextPage) {
        triggerLoadIfNeeded();
      }
    }, [loadedRowCount, isFetchingNextPage, triggerLoadIfNeeded]);

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

          if (newIdx === 0) columnMutations.handleReorderColumn(activeId, null, all[0]!.id);
          else if (oldIdx < newIdx)
            columnMutations.handleReorderColumn(activeId, all[newIdx]!.id, null);
          else columnMutations.handleReorderColumn(activeId, null, all[newIdx]!.id);
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
      [columns, rows, columnMutations, onReorderRow, selectedRowIds],
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
                    const row = tableRows[virtualRow.index];

                    // Placeholder for rows not yet loaded
                    if (!row) {
                      return (
                        <div
                          key={`placeholder-${virtualRow.index}`}
                          className="absolute flex w-full border-b border-gray-200 bg-white"
                          style={{
                            top: virtualRow.start,
                            height: currentRowHeight,
                            minWidth: "fit-content",
                          }}
                        >
                          <div
                            className="sticky left-0 z-10 flex shrink-0 items-center border-r-2 border-gray-300"
                            style={{ width: frozenWidth }}
                          >
                            <div className="flex h-full w-[34px] items-center justify-center">
                              <div className="h-3 w-5 animate-pulse rounded bg-gray-100" />
                            </div>
                            <div className="flex-1 px-2">
                              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
                            </div>
                          </div>
                          <div className="flex" style={{ width: totalScrollableWidth }}>
                            {nonPrimaryColumns.map((col) => (
                              <div
                                key={col.id}
                                className="flex items-center border-r border-gray-200 px-2"
                                style={{ width: columnSizing[String(col.id)] ?? col.width }}
                              >
                                <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

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
                        selectedCells={selectedCells}
                        isMultiSelect={isMultiSelect}
                        handleMouseDown={handleMouseDown}
                        handleMouseEnter={handleMouseEnter}
                        handleCellChange={handleCellChange}
                        setEditingCell={setEditingCell}
                        setHoveredRowId={setHoveredRowId}
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
                  onClick={rowMutations.handleAddRow}
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
