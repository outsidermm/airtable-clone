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
  arrayMove,
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
import { PAGE_SIZE } from "../constants";

interface GridTableProps {
  columns: GridColumn[];
  // Sparse array: null slots are unloaded rows (render as skeleton)
  rows: (GridRow | null)[];
  onCellUpdate: (rowId: number, columnId: number, value: string) => void;
  onReorderRow?: (draggedRowIds: number[], targetRowId: number) => void;
  // Called when the user drags a column header to a new position.
  // Receives the new ordered array of all column IDs (including primary).
  onReorderColumns?: (newOrder: number[]) => void;
  onRequestPage: (pageIndex: number) => void;
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
      onReorderColumns,
      onRequestPage,
      sorts = [],
      rowHeight = "short",
    },
    ref,
  ) {
    const { activeTableId, registerRowIdSwapListener, registerColumnIdSwapListener } = useBase();
    const rowMutations = useRowMutations(activeTableId);

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

    // Dense array of loaded rows — used by hooks and DnD that need GridRow[] (not sparse)
    const nonNullRows = useMemo(
      () => rows.filter((r): r is GridRow => r !== null),
      [rows],
    );

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
    } = useGridSelection(nonNullRows, columns, setEditingCell);

    // Navigation Logic
    useGridNavigation({
      rows: nonNullRows,
      primaryColumn,
      nonPrimaryColumns,
      selectedCell,
      setSelectedCell,
      editingCell,
      setEditingCell,
      setShowLastRowTooltip,
    });

    // --- 4. Stable key map for optimistic rows ---
    // Maps rowId → stable React key string. When a temp row (negative ID) is first
    // rendered, it gets key "temp-N" stored here. On ID swap, the key is transferred
    // to the real row ID so React reuses the component instance instead of remounting.
    const stableKeyMapRef = useRef<Map<number, string>>(new Map());

    const handleRowIdSwap = useCallback(
      (tempId: number, realRowId: number) => {
        // Transfer the stable key so the post-swap render uses the same React key
        const stableKey = stableKeyMapRef.current.get(tempId);
        if (stableKey) {
          stableKeyMapRef.current.delete(tempId);
          stableKeyMapRef.current.set(realRowId, stableKey);
        }
        // Update local selection/editing state to reference the real ID
        setEditingCell((prev) =>
          prev?.rowId === tempId ? { ...prev, rowId: realRowId } : prev,
        );
        setSelectedCell((prev) =>
          prev?.rowId === tempId ? { ...prev, rowId: realRowId } : prev,
        );
      },
      [setSelectedCell],
    );

    useEffect(() => {
      registerRowIdSwapListener(handleRowIdSwap);
    }, [registerRowIdSwapListener, handleRowIdSwap]);

    // --- 4b. Stable key map for optimistic columns ---
    // Same pattern as rows: "temp-col-N" keys survive the tempId → realId swap.
    const stableColumnKeyMapRef = useRef<Map<number, string>>(new Map());

    const handleColumnIdSwap = useCallback(
      (tempId: number, realColId: number) => {
        const stableKey = stableColumnKeyMapRef.current.get(tempId);
        if (stableKey) {
          stableColumnKeyMapRef.current.delete(tempId);
          stableColumnKeyMapRef.current.set(realColId, stableKey);
        }
        setEditingCell((prev) =>
          prev?.columnId === tempId ? { ...prev, columnId: realColId } : prev,
        );
        setSelectedCell((prev) =>
          prev?.columnId === tempId ? { ...prev, columnId: realColId } : prev,
        );
      },
      [setSelectedCell],
    );

    useEffect(() => {
      registerColumnIdSwapListener(handleColumnIdSwap);
    }, [registerColumnIdSwapListener, handleColumnIdSwap]);

    // Build a stable-key map for GridCell keys in SortableRow.
    // Temp columns (id < 0) get "temp-col-N"; after the ID swap the real column ID
    // inherits the same key so React reuses the GridCell instance (no remount/blur).
    const columnKeyMap = useMemo(() => {
      const map = new Map<number, string>();
      nonPrimaryColumns.forEach((col, idx) => {
        if (col.id < 0) {
          const key = `temp-col-${idx}`;
          stableColumnKeyMapRef.current.set(col.id, key);
          map.set(col.id, key);
        } else {
          const stableKey = stableColumnKeyMapRef.current.get(col.id);
          if (stableKey) map.set(col.id, stableKey);
        }
      });
      return map;
    }, [nonPrimaryColumns]);

    // --- 5. Helpers ---

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
    // nonNullRows declared above (section 2) — TanStack Table uses it for column sizing & selection.
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

    const totalScrollableWidth =
      table
        .getHeaderGroups()[0]
        ?.headers.reduce((sum, h) => sum + h.getSize(), 0) ?? 0;

    // --- 6. Virtualization ---
    const tableRows = table.getRowModel().rows;
    // Build a fast lookup from row ID → TanStack Table row (for checkbox handler)
    const tableRowById = useMemo(
      () => new Map(tableRows.map((r) => [r.original.id, r])),
      [tableRows],
    );

    // Pre-compute per-row multi-select column sets so SortableRow gets a stable
    // null (no re-render) for rows outside the selection and a per-row Set for
    // rows inside it, rather than the full selectedCells Set on every prop.
    const rowToSelectedColumns = useMemo(() => {
      if (!isMultiSelect) return new Map<number, Set<number>>();
      const map = new Map<number, Set<number>>();
      for (const key of selectedCells) {
        const dashIdx = key.indexOf("-");
        const rId = Number(key.slice(0, dashIdx));
        const cId = Number(key.slice(dashIdx + 1));
        if (!map.has(rId)) map.set(rId, new Set());
        map.get(rId)!.add(cId);
      }
      return map;
    }, [selectedCells, isMultiSelect]);
    // rows.length === totalRowCount — the sparse array already has the right size
    const rowVirtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => currentRowHeight,
      overscan: 5,
    });

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

    // --- Request pages based on visible virtual range ---
    // Uses stable primitive indices to avoid re-render loops.
    const virtualItems = rowVirtualizer.getVirtualItems();
    const firstVirtualIndex = virtualItems[0]?.index ?? 0;
    const lastVirtualIndex = virtualItems[virtualItems.length - 1]?.index ?? 0;

    useEffect(() => {
      if (rows.length === 0) return;
      // Debounce page requests to avoid loading intermediate pages during fast scroll.
      // The cleanup function cancels the previous timer on each re-render, so only
      // the final scroll position within a 50ms window triggers actual fetches.
      const id = setTimeout(() => {
        const firstPage = Math.floor(firstVirtualIndex / PAGE_SIZE);
        const lastPage = Math.floor(lastVirtualIndex / PAGE_SIZE);
        const maxPage = Math.ceil(rows.length / PAGE_SIZE) - 1;
        // Request visible pages plus 1 page ahead for smooth scrolling
        for (let p = firstPage; p <= Math.min(lastPage + 1, maxPage); p++) {
          onRequestPage(p);
        }
      }, 50);
      return () => clearTimeout(id);
    }, [firstVirtualIndex, lastVirtualIndex, onRequestPage, rows.length]);

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
    const rowOrder = useMemo(
      () => nonNullRows.map((r) => `row-${r.id}`),
      [nonNullRows],
    );

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const activeStr = String(active.id);
        const overStr = String(over.id);

        if (activeStr.startsWith("col-") && overStr.startsWith("col-")) {
          if (onReorderColumns) {
            const activeId = Number(activeStr.replace("col-", ""));
            const overId = Number(overStr.replace("col-", ""));
            const oldIdx = columns.findIndex((c) => c.id === activeId);
            const newIdx = columns.findIndex((c) => c.id === overId);
            if (oldIdx !== -1 && newIdx !== -1) {
              const newOrderIds = arrayMove(columns.map((c) => c.id), oldIdx, newIdx);
              onReorderColumns(newOrderIds);
            }
          }
        } else if (
          activeStr.startsWith("row-") &&
          overStr.startsWith("row-") &&
          onReorderRow
        ) {
          const draggedId = Number(activeStr.replace("row-", ""));
          const targetId = Number(overStr.replace("row-", ""));
          const draggedIndex = nonNullRows.findIndex((r) => r.id === draggedId);

          if (
            draggedIndex !== -1 &&
            selectedRowIds.has(String(draggedIndex)) &&
            selectedRowIds.size > 1
          ) {
            const selected = nonNullRows
              .filter((_, i) => selectedRowIds.has(String(i)))
              .map((r) => r.id);
            onReorderRow(selected, targetId);
          } else {
            onReorderRow([draggedId], targetId);
          }
        }
      },
      [columns, nonNullRows, onReorderColumns, onReorderRow, selectedRowIds],
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
        {/* Bulk-action bar — visible when rows are checked */}
        {selectedRowIds.size > 0 && (
          <div className="flex shrink-0 items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-1.5">
            <span className="text-xs font-medium text-blue-700">
              {selectedRowIds.size} {selectedRowIds.size === 1 ? "record" : "records"} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRowSelection({})}
                className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
              >
                Deselect all
              </button>
              <button
                onClick={() => {
                  const ids = [...selectedRowIds].map(Number).filter((n) => !isNaN(n) && n > 0);
                  if (ids.length > 0) {
                    rowMutations.handleBulkDeleteRow(ids);
                    setRowSelection({});
                  }
                }}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
              >
                Delete {selectedRowIds.size} {selectedRowIds.size === 1 ? "record" : "records"}
              </button>
            </div>
          </div>
        )}
        <div
          ref={parentRef}
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
                    const rowData = rows[virtualRow.index];

                    // Placeholder for rows not yet loaded
                    if (!rowData) {
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
                            <div className="flex h-full w-8.5 items-center justify-center">
                              <div className="h-3 w-5 animate-pulse rounded bg-gray-100" />
                            </div>
                            <div className="flex-1 px-2">
                              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
                            </div>
                          </div>
                          <div
                            className="flex"
                            style={{ width: totalScrollableWidth }}
                          >
                            {nonPrimaryColumns.map((col) => (
                              <div
                                key={col.id}
                                className="flex items-center border-r border-gray-200 px-2"
                                style={{
                                  width:
                                    columnSizing[String(col.id)] ?? col.width,
                                }}
                              >
                                <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Look up the TanStack Table row by ID for checkbox handler
                    const tableRow = tableRowById.get(rowData.id);
                    if (!tableRow) return null;

                    // Narrow per-row props — only the 2 affected rows re-render on click
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

                    // Compute a stable React key: temp rows write "temp-N" into the map;
                    // after the ID swap the real row ID also resolves to "temp-N" so
                    // React reuses the component instance rather than remounting it.
                    if (rowData.id < 0) {
                      stableKeyMapRef.current.set(rowData.id, `temp-${virtualRow.index}`);
                    }
                    const rowKey =
                      rowData.id < 0
                        ? `temp-${virtualRow.index}`
                        : (stableKeyMapRef.current.get(rowData.id) ?? tableRow.id);

                    return (
                      <SortableRow
                        key={rowKey}
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
                        row={tableRow}
                        frozenWidth={frozenWidth}
                        primaryColumn={primaryColumn}
                        primaryColumnWidth={primaryColumnWidth}
                        nonPrimaryColumns={nonPrimaryColumns}
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
