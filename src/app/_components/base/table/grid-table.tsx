"use client";

/**
 * GridTable — the virtualized data grid rendering layer.
 *
 * Responsibility:
 *   Receives the sparse `rows` array (GridRow | null)[] from BaseContent and renders
 *   only the rows currently in the viewport via TanStack Virtual, with PlaceholderRow
 *   for null slots. Owns all interaction state that lives at the grid boundary:
 *   cell selection, editing mode, column sizing, frozen column count, and DnD.
 *
 * Layout model — two-section rows:
 *   Each row renders as two absolute siblings: a sticky frozen section and a
 *   fixed-width scrollable section. This avoids per-cell sticky calculations and
 *   means frozen column logic is O(1) regardless of row count. The FrozenColumnOverlay
 *   lives outside the scroll container so it never scrolls horizontally.
 *
 * Frozen column persistence:
 *   `frozenExtraCount` is local state that updates immediately on drag; a 400ms
 *   debounce timer (`frozenSaveTimerRef`) persists it to ViewConfig. `savedFrozenRef`
 *   tracks the last-saved value so the effect can distinguish user changes from
 *   prop-driven resets (e.g., switching views).
 *
 * Cell edit focus:
 *   After `editingCell` is set, a useEffect queries the DOM for `input` inside
 *   `#cell-{rowId}-{columnId}` and calls focus() + setSelectionRange(). This
 *   is the only direct DOM manipulation in the grid; it runs after React has
 *   committed the `readOnly={false}` change to the input.
 *
 * Auto-scroll during drag-select:
 *   A rAF loop runs only while `isSelecting` is true. It reads the last known
 *   mouse X position and applies proportional scroll deltas near the frozen and
 *   right edges. Using a ref for mouse position avoids adding mousemove to the
 *   component's dependency array.
 *
 * Performance boundaries:
 *   - SortableRow and GridCell are both memo'd — DO NOT pass object literals or
 *     inline functions as props, as this defeats memoization and causes every
 *     visible row to re-render on each keystroke.
 *   - handleCellChange is debounced 300ms here before propagating to useCellMutations,
 *     preventing a tRPC mutation on every character typed.
 *   - columnDefs are memoized on nonPrimaryColumns identity; avoid rebuilding them
 *     by ensuring upstream column arrays use stable references.
 */

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  forwardRef,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { DndContext, closestCenter } from "@dnd-kit/core";
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
  MAX_SAFE_HEIGHT,
} from "../constants";

import { SortableRow } from "./components/sortable-row";
import { GridHeader } from "./components/grid-header";

// Custom Hooks
import { useGridSelection } from "../hooks/useGridSelection";
import { useGridNavigation } from "../hooks/useGridNavigation";
import { PlusIcon } from "~/app/_components/ui/icons";
import type { CellAddress } from "~/types/cell";
import type { GridTableHandle } from "~/types/table";
import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { PlaceholderRow } from "./components/placeholder-row";
import { FrozenColumnOverlay } from "./components/frozen-column-overlay";
import { useOptimisticIds } from "../hooks/useOptimisticIds";
import { useGridDnd } from "../hooks/useGridDnd";
import { useTableVirtualizer } from "../hooks/useTableVirtualizer";
import { useGridResizing } from "../hooks/useGridResizing";
import React from "react";

interface GridTableProps {
  columns: GridColumn[];
  rows: (GridRow | null)[];
  onCellUpdate: (rowId: number, columnId: number, value: string) => void;
  onReorderRow?: (draggedRowIds: number[], targetRowId: number) => void;
  onReorderColumns?: (newOrder: number[]) => void;
  onFrozenColumnsChange?: (count: number) => void;
  initialFrozenColumns?: number;
  onRequestPage: (pageIndex: number) => void;
  rowHeight?: "short" | "medium" | "tall" | "extraTall";
  filteredColumnIds: Set<number>;
  sortedColumnIds: Set<number>;
}

export const GridTable = forwardRef<GridTableHandle, GridTableProps>(
  function GridTable(
    {
      columns,
      rows,
      onCellUpdate,
      onReorderRow,
      onReorderColumns,
      onFrozenColumnsChange,
      initialFrozenColumns,
      onRequestPage,
      rowHeight = "short",
      filteredColumnIds,
      sortedColumnIds,
    },
    ref,
  ) {
    const { activeTableId, setContextMenu } = useBase();
    const rowMutations = useRowMutations(activeTableId);

    const currentRowHeight = ROW_HEIGHT_MAP[rowHeight] ?? 36;
    const parentRef = useRef<HTMLDivElement>(null);
    const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // --- 1. Core State ---
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>(
      {},
    );
    const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
      {},
    );
    const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
    const [showLastRowTooltip, setShowLastRowTooltip] = useState(false);
    const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
    const [primaryColumnWidth, setPrimaryColumnWidth] = useState(PRIMARY_WIDTH);
    const [frozenExtraCount, setFrozenExtraCount] = useState(
      initialFrozenColumns ?? 0,
    );
    const freezeOverlayRef = useRef<HTMLDivElement>(null);
    // Tracks the last value that was either synced from the prop or saved to DB,
    // so we can distinguish user-driven changes from prop-driven resets.
    const savedFrozenRef = useRef(initialFrozenColumns ?? 0);
    const frozenSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    const isDraggingFreezeRef = useRef(false);
    const [freezeLineHoverY, setFreezeLineHoverY] = useState<number | null>(
      null,
    );

    // --- 2. Derived State ---
    const primaryColumn = useMemo(
      () => columns.find((c) => c.primary) ?? null,
      [columns],
    );
    const nonPrimaryColumns = useMemo(
      () => columns.filter((c) => !c.primary),
      [columns],
    );
    const clampedFrozenExtraCount = Math.min(
      frozenExtraCount,
      Math.max(0, nonPrimaryColumns.length - 1),
    );
    const scrollableColumns = useMemo(
      () => nonPrimaryColumns.slice(clampedFrozenExtraCount),
      [nonPrimaryColumns, clampedFrozenExtraCount],
    );
    const selectedRowIds = useMemo(() => {
      const set = new Set<string>();
      for (const [key, val] of Object.entries(rowSelection)) {
        if (val) set.add(key);
      }
      return set;
    }, [rowSelection]);

    const nonNullRows = useMemo(
      () => rows.filter((r): r is GridRow => r !== null),
      [rows],
    );

    // Calculate frozen width early so it can be passed into useGridNavigation
    const extraFrozenWidth = useMemo(() => {
      return nonPrimaryColumns
        .slice(0, clampedFrozenExtraCount)
        .reduce(
          (sum, col) =>
            sum + Math.max(80, columnSizing[String(col.id)] ?? col.width),
          0,
        );
    }, [nonPrimaryColumns, clampedFrozenExtraCount, columnSizing]);

    const frozenWidth =
      CHECKBOX_WIDTH +
      (primaryColumn ? primaryColumnWidth : 0) +
      extraFrozenWidth;

    // --- 3. Custom Hooks ---
    const {
      selectedCell,
      setSelectedCell,
      selectedCells,
      selectedRowIdsFromCells,
      handleMouseDown,
      handleMouseEnter,
      isSelecting,
      isMultiSelect,
    } = useGridSelection(nonNullRows, columns, setEditingCell);

    useGridNavigation({
      rows: nonNullRows,
      primaryColumn,
      nonPrimaryColumns,
      selectedCell,
      setSelectedCell,
      editingCell,
      setEditingCell,
      setShowLastRowTooltip,
      onCellUpdate,
      frozenWidth,
    });

    // --- Stable Context Menu Ref ---
    const selectedRowIdsRef = useRef(selectedRowIds);
    const selectedRowIdsFromCellsRef = useRef(selectedRowIdsFromCells);

    useEffect(() => {
      selectedRowIdsRef.current = selectedRowIds;
      selectedRowIdsFromCellsRef.current = selectedRowIdsFromCells;
    }, [selectedRowIds, selectedRowIdsFromCells]);

    // Sync frozen count when the active view changes (initialFrozenColumns prop updates).
    useEffect(() => {
      const val = initialFrozenColumns ?? 0;
      savedFrozenRef.current = val;
      setFrozenExtraCount(val);
    }, [initialFrozenColumns]);

    // Debounced persist: save to DB 400ms after the user stops dragging the freeze border.
    useEffect(() => {
      if (frozenExtraCount === savedFrozenRef.current) return;
      if (frozenSaveTimerRef.current) clearTimeout(frozenSaveTimerRef.current);
      frozenSaveTimerRef.current = setTimeout(() => {
        savedFrozenRef.current = frozenExtraCount;
        onFrozenColumnsChange?.(frozenExtraCount);
      }, 400);
      return () => {
        if (frozenSaveTimerRef.current)
          clearTimeout(frozenSaveTimerRef.current);
      };
    }, [frozenExtraCount, onFrozenColumnsChange]);

    const handleRowContextMenu = useCallback(
      (rowId: number, rowIndex: number, e: React.MouseEvent) => {
        e.preventDefault();

        const currentCheckboxSelected = selectedRowIdsRef.current;
        const currentCellRowSelected = selectedRowIdsFromCellsRef.current;

        let ids: number[] = [rowId];

        if (currentCheckboxSelected.has(String(rowId))) {
          // If row is part of a checkbox selection
          ids = [...currentCheckboxSelected]
            .map(Number)
            .filter((n) => !isNaN(n));
        } else if (currentCellRowSelected.has(rowId)) {
          // If row is part of a cell multi-selection
          ids = Array.from(currentCellRowSelected);
        }

        setContextMenu({
          type: "record",
          position: { x: e.clientX, y: e.clientY },
          data: { rowId, rowIndex, selectedRowIds: ids },
        });
      },
      [setContextMenu],
    );

    const { columnKeyMap, stableKeyMapRef: stableKeyMapRef } = useOptimisticIds(
      {
        setSelectedCell,
        setEditingCell,
        nonPrimaryColumns,
      },
    );

    // --- 5. Helpers ---
    // Per-cell debounce map: each cell key gets its own timer so rapid edits to
    // different cells don't reset each other's debounce window. The 300ms delay
    // balances perceived latency against write amplification for fast typists.
    // PERF: This callback is passed as a prop to every SortableRow. Wrapping in
    // useCallback with a stable [onCellUpdate] dep ensures it stays referentially
    // stable across renders.
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

    const { handlePrimaryResizeStart, handleFrozenBorderDragStart } =
      useGridResizing({
        nonPrimaryColumns,
        columnSizing,
        setFrozenExtraCount,
        primaryColumnWidth,
        setPrimaryColumnWidth,
        clampedFrozenExtraCount,
        parentRef,
        freezeOverlayRef,
        isDraggingFreezeRef,
        setFreezeLineHoverY,
      });

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

    useEffect(() => {
      const initial: Record<string, number> = {};
      nonPrimaryColumns.forEach((c) => (initial[String(c.id)] = c.width));
      setColumnSizing((prev) =>
        Object.keys(prev).length === 0 ? initial : prev,
      );
    }, [nonPrimaryColumns]);

    const table = useReactTable({
      data: nonNullRows,
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

    const allHeaders = table.getHeaderGroups()[0]?.headers ?? [];
    const totalScrollableWidth = allHeaders
      .filter((_, i) => i >= clampedFrozenExtraCount)
      .reduce((sum, h) => sum + h.getSize(), 0);

    // --- 6. Virtualization ---
    const {
      tableRowById,
      rowToSelectedColumns,
      rowVirtualizer,
      scrollScaleRef,
    } = useTableVirtualizer({
      table,
      rows,
      currentRowHeight,
      parentRef,
      onRequestPage,
      selectedCells,
      isMultiSelect,
      setRowSelection,
      ref,
    });

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

    const { sensors, handleDragEnd } = useGridDnd({
      columns,
      nonNullRows,
      selectedRowIds,
      frozenWidth,
      parentRef,
      isSelecting,
      onReorderColumns,
      onReorderRow,
    });

    const columnOrder = useMemo(
      () => scrollableColumns.map((c) => `col-${c.id}`),
      [scrollableColumns],
    );

    const rowOrder = useMemo(
      () => nonNullRows.map((r) => `row-${r.id}`),
      [nonNullRows],
    );

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
          if (el.type !== "checkbox") {
            el.setSelectionRange(el.value.length, el.value.length);
          }
        }
      }
    }, [editingCell]);

    const activeRowId = selectedCell?.rowId ?? null;

    // --- Pre-calculate anchor for accurate unscaled rendering
    const virtualItems = rowVirtualizer.getVirtualItems();
    const firstItemStart = virtualItems[0]?.start ?? 0;
    const scaledAnchorStart = firstItemStart * scrollScaleRef.current;

    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-100">
        <div className="relative flex flex-1 overflow-hidden">
          {/* aria-rowcount reflects the full sparse array size (totalRowCount),
              not just rendered rows — essential for the virtualizer model where
              rows.length equals the full dataset even if most slots are null. */}
          <div
            ref={parentRef}
            role="grid"
            aria-label="Data table"
            aria-rowcount={rows.length}
            aria-colcount={columns.length + 1}
            className="force-scrollbar flex-1 overflow-x-auto overflow-y-scroll"
          >
            <div
              className="flex min-h-full flex-col"
              style={{ minWidth: "fit-content" }}
            >
              <GridHeader
                frozenWidth={frozenWidth}
                totalScrollableWidth={totalScrollableWidth}
                primaryColumn={primaryColumn}
                nonPrimaryColumns={nonPrimaryColumns}
                frozenNonPrimaryCount={clampedFrozenExtraCount}
                primaryColumnWidth={primaryColumnWidth}
                handlePrimaryResizeStart={handlePrimaryResizeStart}
                isAllSelected={table.getIsAllRowsSelected()}
                onToggleAllSelected={table.getToggleAllRowsSelectedHandler()}
                columnOrder={columnOrder}
                sensors={sensors}
                handleDragEnd={handleDragEnd}
                headerGroups={table.getHeaderGroups()[0]?.headers ?? []}
                filteredColumnIds={filteredColumnIds}
                sortedColumnIds={sortedColumnIds}
              />

              {rows.length > 0 && (
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
                      role="rowgroup"
                      style={{
                        height: `${Math.min(rowVirtualizer.getTotalSize(), MAX_SAFE_HEIGHT)}px`,
                        position: "relative",
                        minWidth: "fit-content",
                      }}
                    >
                      {virtualItems.map((virtualRow) => {
                        const rowData = rows[virtualRow.index];

                        // Apply the unscaled offset to the scaled anchor
                        const unscaledOffset =
                          virtualRow.start - firstItemStart;
                        const correctedVirtualStart =
                          scaledAnchorStart + unscaledOffset;

                        if (!rowData) {
                          return (
                            <PlaceholderRow
                              key={`placeholder-${virtualRow.index}`}
                              virtualRow={virtualRow}
                              virtualStart={correctedVirtualStart}
                              currentRowHeight={currentRowHeight}
                              frozenWidth={frozenWidth}
                              totalScrollableWidth={totalScrollableWidth}
                              nonPrimaryColumns={nonPrimaryColumns}
                              columnSizing={columnSizing}
                            />
                          );
                        }

                        const tableRow = tableRowById.get(rowData.id);
                        if (!tableRow) return null;

                        const selectedColumnId =
                          selectedCell?.rowId === rowData.id
                            ? selectedCell.columnId
                            : null;
                        const editingColumnId =
                          editingCell?.rowId === rowData.id
                            ? editingCell.columnId
                            : null;
                        const multiSelectColumnIds = isMultiSelect
                          ? (rowToSelectedColumns.get(rowData.id) ?? null)
                          : null;

                        if (rowData.id < 0) {
                          if (!stableKeyMapRef.current.has(rowData.id)) {
                            stableKeyMapRef.current.set(
                              rowData.id,
                              `temp-${rowData.id}`,
                            );
                          }
                        }
                        const rowKey =
                          rowData.id < 0
                            ? stableKeyMapRef.current.get(rowData.id)!
                            : (stableKeyMapRef.current.get(rowData.id) ??
                              tableRow.id);

                        return (
                          <SortableRow
                            key={rowKey}
                            rowId={rowData.id}
                            virtualStart={correctedVirtualStart}
                            virtualIndex={virtualRow.index}
                            currentRowHeight={currentRowHeight}
                            isRowSelected={selectedRowIds.has(
                              String(rowData.id),
                            )}
                            rowBg={
                              selectedRowIds.has(String(rowData.id))
                                ? "bg-blue-50"
                                : rowData.id === activeRowId ||
                                    rowData.id === hoveredRowId
                                  ? "bg-gray-50"
                                  : "bg-white"
                            }
                            rowData={rowData}
                            row={tableRow}
                            frozenWidth={frozenWidth}
                            primaryColumn={primaryColumn}
                            primaryColumnWidth={primaryColumnWidth}
                            nonPrimaryColumns={nonPrimaryColumns}
                            frozenNonPrimaryCount={clampedFrozenExtraCount}
                            columnSizing={columnSizing}
                            selectedColumnId={selectedColumnId}
                            editingColumnId={editingColumnId}
                            multiSelectColumnIds={multiSelectColumnIds}
                            handleMouseDown={handleMouseDown}
                            handleMouseEnter={handleMouseEnter}
                            handleCellChange={handleCellChange}
                            setEditingCell={setEditingCell}
                            setHoveredRowId={setHoveredRowId}
                            totalScrollableWidth={totalScrollableWidth}
                            showLastRowTooltip={showLastRowTooltip}
                            columnKeyMap={columnKeyMap}
                            onContextMenu={handleRowContextMenu}
                            filteredColumnIds={filteredColumnIds}
                            sortedColumnIds={sortedColumnIds}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <div
                className="group flex shrink-0 bg-gray-100"
                style={{ minWidth: "fit-content" }}
              >
                <button
                  className="sticky left-0 z-10 flex border-b border-gray-200 bg-white group-hover:bg-gray-50"
                  style={{
                    width: frozenWidth,
                    height: HEADER_HEIGHT,
                    borderRight: "2px solid rgb(209, 213, 219)",
                  }}
                  onClick={rowMutations.handleAddRow}
                >
                  <div
                    aria-label="Add row"
                    className="ml-6 flex items-center gap-2 px-3 py-2 text-gray-400 group-hover:text-gray-600"
                  >
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                  </div>
                </button>

                <button
                  className="flex border-r border-b border-gray-200 bg-white group-hover:bg-gray-50"
                  style={{ width: totalScrollableWidth }}
                  onClick={rowMutations.handleAddRow}
                />
              </div>

              {rows.length === 0 ? (
                <div
                  role="status"
                  className="flex flex-1 items-center py-20 text-gray-400"
                  style={{
                    width: frozenWidth + totalScrollableWidth,
                    minWidth: "100%",
                  }}
                >
                  <div className="text-md sticky left-1/2 w-max -translate-x-1/2">
                    All records are filtered
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-1 bg-gray-100"
                  style={{ minWidth: "fit-content", minHeight: 125 }}
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
              )}
            </div>
          </div>

          <FrozenColumnOverlay
            frozenWidth={frozenWidth}
            handleFrozenBorderDragStart={handleFrozenBorderDragStart}
            isDraggingFreezeRef={isDraggingFreezeRef}
            freezeLineHoverY={freezeLineHoverY}
            setFreezeLineHoverY={setFreezeLineHoverY}
          />
        </div>

        {/* Fixed-position ghost line shown while dragging the frozen-column border */}
        <div
          ref={freezeOverlayRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            display: "none",
            width: 2,
            backgroundColor: "#99a1af",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        />
      </div>
    );
  },
);
