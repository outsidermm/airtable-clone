"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { api } from "~/trpc/react";
import { GridTable } from "./table/grid-table";
import type { GridTableHandle, Table } from "~/types/table";
import { ViewSidebar } from "./sidebar/view-sidebar";
import { BaseHeader } from "./header/base-header";
import { BaseToolbar } from "./toolbar/base-toolbar";
import { RecordContextMenu } from "./context-menu/record-context-menu";
import { ColumnContextMenu } from "./context-menu/column-context-menu";
import { SetPrimaryModal } from "./modals/set-primary-modal";
import { AddTableModal } from "./modals/add-table-modal";
import { AddColumnModal } from "./modals/add-column-modal";
import { useTableMutations } from "../hooks/use-table-mutations";
import { useColumnMutations } from "../hooks/use-column-mutations";
import { useRowMutations } from "../hooks/use-row-mutations";
import type { ViewConfig } from "~/server/api/routers/view";
import type { GridColumn, GridRow } from "~/types/grid";
import type { Base } from "~/types/base";
import { useBase } from "./base-context";
import { PAGE_SIZE } from "./constants";
import { useRowStore } from "./hooks/useRowStore";
import { useOptimisticGrid } from "./hooks/useOptimisticGrid";
import { useSidebarHover } from "./hooks/useSidebarHover";
import { useCellMutations } from "../hooks/use-cell-mutations";
import { AIIcon, PlusIcon, SpinnerIcon } from "../ui/icons";
import React from "react";

interface BaseContentProps {
  baseId: string;
  tables: Table[];
  base: Base;
}

const DEFAULT_VIEW_CONFIG: ViewConfig = {
  sorts: [],
  filters: [],
  filterGroupLogic: "AND",
  hiddenColumns: [],
  rowHeight: "short",
  frozenColumns: 0,
};

export function BaseContent({
  baseId,
  tables: initialTables,
  base,
}: BaseContentProps) {
  const {
    activeTableId,
    activeViewId,
    setActiveViewId,
    activeModal,
    modalAnchor,
    contextMenu,
    setContextMenu,
    registerRefetchRows,
    registerOnRowCreated,
    notifyRowIdSwap,
    registerOnColumnCreated,
    editingColumnId,
  } = useBase();

  const gridTableRef = useRef<GridTableHandle>(null);

  const utils = api.useUtils();

  // --- Base: keep live data for header (name, starred) ---
  const baseQuery = api.base.getById.useQuery(
    { id: baseId },
    { initialData: base as never },
  );
  const liveBase = (baseQuery.data ?? base) as Base;

  // --- Tables ---
  const tablesQuery = api.table.getAllByBase.useQuery(
    { baseId },
    { initialData: initialTables as never },
  );

  const tables = useMemo(() => {
    if (tablesQuery.data) {
      return (tablesQuery.data as Table[]).map((t) => ({
        id: t.id,
        name: t.name,
        baseId: t.baseId,
      }));
    }
    return initialTables;
  }, [tablesQuery.data, initialTables]);

  const tableQuery = api.table.getById.useQuery(
    { id: activeTableId },
    { enabled: !!activeTableId },
  );

  const tableMutations = useTableMutations(baseId, tables);

  // --- Views ---
  const views = useMemo(() => {
    if (!tableQuery.data?.views) return [];
    return tableQuery.data.views.map((v) => ({
      id: v.id,
      name: v.name,
      config: v.config,
    }));
  }, [tableQuery.data?.views]);

  // Initialize activeViewId from first view
  useEffect(() => {
    if (views.length > 0 && !activeViewId) {
      setActiveViewId(views[0]!.id);
    }
    // If active view was deleted, pick the first remaining
    if (activeViewId && !views.find((v) => v.id === activeViewId)) {
      setActiveViewId(views[0]?.id ?? null);
    }
  }, [views, activeViewId, setActiveViewId]);

  const viewQuery = api.view.getById.useQuery(
    { id: activeViewId! },
    { enabled: !!activeViewId },
  );

  const viewConfig = useMemo<ViewConfig>(() => {
    if (!viewQuery.data?.config) return DEFAULT_VIEW_CONFIG;
    const cfg = viewQuery.data.config as ViewConfig;
    return {
      sorts: cfg.sorts ?? [],
      filters: cfg.filters ?? [],
      filterGroupLogic: cfg.filterGroupLogic ?? "AND",
      hiddenColumns: cfg.hiddenColumns ?? [],
      rowHeight: cfg.rowHeight ?? "short",
      columnOrder: cfg.columnOrder,
      frozenColumns: cfg.frozenColumns,
    };
  }, [viewQuery.data?.config]);

  const activeViewName = useMemo(() => {
    return views.find((v) => v.id === activeViewId)?.name ?? "Grid view";
  }, [views, activeViewId]);

  const filteredColumnIds = useMemo(() => {
    return new Set(viewConfig.filters.map((f) => f.columnId));
  }, [viewConfig.filters]);

  const sortedColumnIds = useMemo(() => {
    return new Set(viewConfig.sorts.map((s) => s.columnId));
  }, [viewConfig.sorts]);

  // --- Row ordering override (shared between useRowStore and useOptimisticGrid) ---
  const [rowOrderOverride, setRowOrderOverride] = useState<
    (number | null)[] | null
  >(null);
  const rowOrderOverrideRef = useRef<(number | null)[] | null>(null);

  useEffect(() => {
    rowOrderOverrideRef.current = rowOrderOverride;
  }, [rowOrderOverride]);

  // --- Rows: random-access page store ---
  const pendingOptimisticEditsRef = useRef<
    Map<number, Record<string, string | number | null>>
  >(new Map());
  const pendingColumnEditsRef = useRef<
    Map<number, Map<number, string | number | null>>
  >(new Map());

  const {
    pageStore,
    setPageStore,
    pageStoreRef,
    totalRowCount,
    setTotalRowCount,
    totalRowCountRef,
    fetchPage,
    refetchLoadedPages,
  } = useRowStore({
    setRowOrderOverride,
    registerRefetchRows,
  });

  // --- Optimistic row mutations ---
  useOptimisticGrid({
    pageStoreRef,
    setPageStore,
    totalRowCountRef,
    setTotalRowCount,
    pendingOptimisticEditsRef,
    setRowOrderOverride,
  });

  // --- Columns ---
  const allColumns = useMemo<GridColumn[]>(() => {
    if (!tableQuery.data) return [];
    return tableQuery.data.columns.map((col) => ({
      id: col.id,
      name: col.name,
      type: col.type,
      width: col.primary ? 250 : 200,
      primary: col.primary,
      order: col.order,
    }));
  }, [tableQuery.data]);

  const visibleColumns = useMemo(() => {
    const hiddenSet = new Set(viewConfig.hiddenColumns ?? []);
    const filtered = allColumns.filter((c) => !hiddenSet.has(c.id));

    const colOrder = viewConfig.columnOrder;
    if (!colOrder?.length) return filtered;

    const orderMap = new Map(colOrder.map((id, idx) => [id, idx]));
    return [...filtered].sort((a, b) => {
      const ai = orderMap.get(a.id) ?? Infinity;
      const bi = orderMap.get(b.id) ?? Infinity;
      return ai - bi;
    });
  }, [allColumns, viewConfig.hiddenColumns, viewConfig.columnOrder]);

  const columnMutations = useColumnMutations(activeTableId);
  const rowMutations = useRowMutations(activeTableId);

  const updateViewConfigMutation = api.view.update.useMutation({
    onSuccess: () => {
      if (activeViewId)
        void utils.view.getById.invalidate({ id: activeViewId });
    },
  });

  const handleReorderColumns = useCallback(
    (newOrder: number[]) => {
      if (!activeViewId) return;
      updateViewConfigMutation.mutate({
        id: activeViewId,
        config: { ...viewConfig, columnOrder: newOrder },
      });
    },
    [activeViewId, viewConfig, updateViewConfigMutation],
  );

  const handleFrozenColumnsChange = useCallback(
    (count: number) => {
      if (!activeViewId) return;
      updateViewConfigMutation.mutate({
        id: activeViewId,
        config: { ...viewConfig, frozenColumns: count },
      });
    },
    [activeViewId, viewConfig, updateViewConfigMutation],
  );

  // --- Cells ---
  const { handleCellUpdate } = useCellMutations({
    allColumns,
    registerOnRowCreated,
    registerOnColumnCreated,
    setRowOrderOverride,
    notifyRowIdSwap,
    pageStoreRef,
    setPageStore,
    pendingOptimisticEditsRef,
    pendingColumnEditsRef,
  });

  const rowById = useMemo(() => {
    const map = new Map<number, GridRow>();
    for (const pageRows of pageStore.values()) {
      for (const row of pageRows) map.set(row.id, row);
    }
    return map;
  }, [pageStore]);

  const gridRows = useMemo<(GridRow | null)[]>(() => {
    if (!totalRowCount) return [];
    const sparse = new Array<GridRow | null>(totalRowCount).fill(null);

    if (rowOrderOverride !== null) {
      const overrideSet = new Set<number>();

      // 1. Apply the explicit override mapping
      rowOrderOverride.forEach((id, i) => {
        if (i < totalRowCount && id !== null) {
          sparse[i] = rowById.get(id) ?? null;
          overrideSet.add(id);
        }
      });

      // 2. Safely merge pageStore data (e.g. newly fetched pages) without creating ghost rows
      for (const [pageIndex, pageRows] of pageStore) {
        const startIdx = pageIndex * PAGE_SIZE;
        pageRows.forEach((row, i) => {
          const idx = startIdx + i;
          if (
            idx < totalRowCount &&
            !overrideSet.has(row.id) &&
            sparse[idx] === null
          ) {
            sparse[idx] = row;
          }
        });
      }
    } else {
      // Standard mapping when no drag/insert override is active
      for (const [pageIndex, pageRows] of pageStore) {
        const startIdx = pageIndex * PAGE_SIZE;
        pageRows.forEach((row, i) => {
          const idx = startIdx + i;
          if (idx < totalRowCount) sparse[idx] = row;
        });
      }
    }
    return sparse;
  }, [pageStore, rowById, totalRowCount, rowOrderOverride]);

  const reorderRowMutation = api.row.reorder.useMutation({
    onSettled: () => refetchLoadedPages(),
  });

  const handleReorderRow = useCallback(
    (draggedRowIds: number[], targetRowId: number) => {
      const draggedId = draggedRowIds[0]!;

      const prev = rowOrderOverrideRef.current;
      let currentOrder: (number | null)[];

      if (prev !== null) {
        currentOrder = prev;
      } else {
        // BUILD A SPARSE ARRAY preserving null gaps
        currentOrder = new Array<number | null>(
          totalRowCountRef.current ?? 0,
        ).fill(null);
        for (const [pageIndex, pageRows] of pageStoreRef.current.entries()) {
          const startIdx = pageIndex * PAGE_SIZE;
          pageRows.forEach((row, i) => {
            if (startIdx + i < currentOrder.length)
              currentOrder[startIdx + i] = row.id;
          });
        }
      }

      const oldIdx = currentOrder.indexOf(draggedId);
      const newIdx = currentOrder.indexOf(targetRowId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const newOrder = arrayMove(currentOrder, oldIdx, newIdx);
      setRowOrderOverride(newOrder);
      rowOrderOverrideRef.current = newOrder;

      const draggedNewIdx = newOrder.indexOf(draggedId);
      const prevId =
        draggedNewIdx > 0 ? (newOrder[draggedNewIdx - 1] ?? null) : null;
      const nextId =
        draggedNewIdx < newOrder.length - 1
          ? (newOrder[draggedNewIdx + 1] ?? null)
          : null;
      reorderRowMutation.mutate({ id: draggedId, prevId, nextId });
    },
    [reorderRowMutation, pageStoreRef, totalRowCountRef],
  );

  const handleColumnRenameFromMenu = useCallback(
    (_columnId: number) => {
      setContextMenu(null);
    },
    [setContextMenu],
  );

  const handleScrollToRow = useCallback((rowId: number) => {
    gridTableRef.current?.scrollToRow(rowId);
  }, []);

  const {
    handleSidebarHoverEnter,
    handleSidebarHoverLeave,
    handleToggleSidebar,
  } = useSidebarHover();

  useEffect(() => {
    setActiveViewId(null);
  }, [activeTableId, setActiveViewId]);

  const isLoading = tableQuery.isLoading;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <BaseHeader base={liveBase} tables={tables} />
      <BaseToolbar
        columns={allColumns}
        viewCount={views.length}
        viewConfig={viewConfig}
        onToggleSidebar={handleToggleSidebar}
        onSidebarHoverEnter={handleSidebarHoverEnter}
        onSidebarHoverLeave={handleSidebarHoverLeave}
        activeViewName={activeViewName}
        onScrollToRow={handleScrollToRow}
      />
      <div className="flex flex-1 overflow-hidden">
        <ViewSidebar
          views={views}
          onMouseEnter={handleSidebarHoverEnter}
          onMouseLeave={handleSidebarHoverLeave}
        />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div role="status" aria-label="Loading table data" className="flex flex-1 flex-col items-center justify-center gap-3">
              <SpinnerIcon className="h-8 w-8 animate-spin text-blue-500" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-500">
                Loading table data...
              </p>
            </div>
          ) : (
            <GridTable
              ref={gridTableRef}
              columns={visibleColumns}
              rows={gridRows}
              onCellUpdate={handleCellUpdate}
              onReorderRow={handleReorderRow}
              onReorderColumns={handleReorderColumns}
              onFrozenColumnsChange={handleFrozenColumnsChange}
              initialFrozenColumns={viewConfig.frozenColumns}
              onRequestPage={fetchPage}
              rowHeight={viewConfig.rowHeight ?? "short"}
              filteredColumnIds={filteredColumnIds}
              sortedColumnIds={sortedColumnIds}
            />
          )}

          {/* Floating Actions Tab */}
          <div className="absolute bottom-10 left-4 z-60 flex items-center rounded-full border border-gray-300 bg-white">
            <button
              className="flex items-center justify-center rounded-l-full px-2.5 py-1.5 transition-colors hover:bg-gray-100"
              title="Add record"
              aria-label="Add record"
            >
              <PlusIcon className="h-4 w-4 text-gray-600" aria-hidden="true" />
            </button>
            <div className="h-8 w-px bg-gray-300" aria-hidden="true" />
            <button
              className="flex items-center justify-center rounded-r-full px-3 py-1.5 transition-colors hover:bg-gray-100"
              title="Add more"
              aria-label="Add records with AI"
            >
              <AIIcon className="h-4 w-4 text-green-700" aria-hidden="true" />
              <span className="mx-1 text-xs text-gray-700">Add...</span>
            </button>
          </div>

          {/* Record count bar — aria-live re-announces when totalRowCount changes
              after filters/sorts mutate the view query result from view.getData. */}
          <div
            className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3 py-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="flex items-center gap-2 text-xs text-gray-500">
              {totalRowCount != null ? (
                <React.Fragment>
                  {`${totalRowCount} ${totalRowCount === 1 ? "record" : "records"}`}
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <SpinnerIcon className="h-3 w-3 animate-spin text-gray-400" aria-hidden="true" />
                  Loading records...
                </React.Fragment>
              )}
            </span>
          </div>
        </div>
      </div>
      {contextMenu?.type === "record" && (
        <RecordContextMenu
          rowMutations={rowMutations}
          onClearSelection={() => gridTableRef.current?.clearSelection()}
        />
      )}
      {contextMenu?.type === "column" && contextMenu.data.columnId != null && (
        <ColumnContextMenu
          column={allColumns.find((c) => c.id === contextMenu.data.columnId)!}
          viewConfig={viewConfig}
          onRename={handleColumnRenameFromMenu}
          onDuplicate={columnMutations.handleDuplicateColumn}
        />
      )}
      {activeModal === "set-primary" && (
        <SetPrimaryModal
          columns={allColumns}
          currentPrimaryId={
            allColumns.find((c) => c.primary)?.id ?? allColumns[0]!.id
          }
        />
      )}
      {activeModal === "add-table" && (
        <AddTableModal
          anchorEl={modalAnchor}
          onAddTable={() => {
            tableMutations.handleAddTable();
          }}
        />
      )}
      {activeModal === "add-column" && (
        <AddColumnModal anchorEl={modalAnchor} />
      )}
      {activeModal === "edit-column" && (
        <AddColumnModal
          anchorEl={modalAnchor}
          editColumnId={editingColumnId}
          columns={allColumns}
        />
      )}
    </div>
  );
}
