"use client";

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
import type { SortConfig } from "~/server/api/routers/view";
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

interface GridTableProps {
  columns: GridColumn[];
  rows: (GridRow | null)[];
  onCellUpdate: (rowId: number, columnId: number, value: string) => void;
  onReorderRow?: (draggedRowIds: number[], targetRowId: number) => void;
  onReorderColumns?: (newOrder: number[]) => void;
  onRequestPage: (pageIndex: number) => void;
  sorts?: SortConfig[];
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
      onRequestPage,
      sorts = [],
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
    const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
    const [showLastRowTooltip, setShowLastRowTooltip] = useState(false);
    const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
    const [primaryColumnWidth, setPrimaryColumnWidth] = useState(PRIMARY_WIDTH);
    const [frozenExtraCount, setFrozenExtraCount] = useState(0);
    const freezeOverlayRef = useRef<HTMLDivElement>(null);

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
    });

    // --- Stable Context Menu Ref ---
    const selectedRowIdsRef = useRef(selectedRowIds);
    const selectedRowIdsFromCellsRef = useRef(selectedRowIdsFromCells);

    useEffect(() => {
      selectedRowIdsRef.current = selectedRowIds;
      selectedRowIdsFromCellsRef.current = selectedRowIdsFromCells;
    }, [selectedRowIds, selectedRowIdsFromCells]);

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
    const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
      {},
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
    const extraFrozenWidth = allHeaders
      .filter((_, i) => i < clampedFrozenExtraCount)
      .reduce((sum, h) => sum + h.getSize(), 0);
    const frozenWidth =
      CHECKBOX_WIDTH +
      (primaryColumn ? primaryColumnWidth : 0) +
      extraFrozenWidth;
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
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }
    }, [editingCell]);

    const activeRowId = selectedCell?.rowId ?? null;

    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-100">
        {/* Added wrapper for the overlay */}
        <div className="relative flex flex-1 overflow-hidden">
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
                frozenNonPrimaryCount={clampedFrozenExtraCount}
                primaryColumnWidth={primaryColumnWidth}
                handlePrimaryResizeStart={handlePrimaryResizeStart}
                isAllSelected={table.getIsAllRowsSelected()}
                onToggleAllSelected={table.getToggleAllRowsSelectedHandler()}
                sorts={sorts}
                columnOrder={columnOrder}
                sensors={sensors}
                handleDragEnd={handleDragEnd}
                headerGroups={table.getHeaderGroups()[0]?.headers ?? []}
                filteredColumnIds={filteredColumnIds}
                sortedColumnIds={sortedColumnIds}
              />

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
                      height: `${Math.min(rowVirtualizer.getTotalSize(), MAX_SAFE_HEIGHT)}px`,
                      position: "relative",
                      minWidth: "fit-content",
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const rowData = rows[virtualRow.index];

                      if (!rowData) {
                        return (
                          <PlaceholderRow
                            key={`placeholder-${virtualRow.index}`}
                            virtualRow={virtualRow}
                            scrollScaleRef={scrollScaleRef}
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
                          virtualStart={
                            virtualRow.start * scrollScaleRef.current
                          }
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

          {/* Global full-height overlay freeze drag handler, starting below the header row */}
          <FrozenColumnOverlay
            frozenWidth={frozenWidth}
            handleFrozenBorderDragStart={handleFrozenBorderDragStart}
            isDraggingFreezeRef={isDraggingFreezeRef}
            freezeLineHoverY={freezeLineHoverY}
            setFreezeLineHoverY={setFreezeLineHoverY}
          />
        </div>

        <div
          ref={freezeOverlayRef}
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
