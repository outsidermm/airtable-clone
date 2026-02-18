"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/app/_components/ui/toast";
import { GridTable } from "./table/grid-table";
import type { GridTableHandle } from "~/types/table";
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
import type { ViewConfig } from "~/server/api/routers/view";
import type { GridColumn, GridRow } from "~/types/grid";
import type { Base } from "~/types/base";
import { useBase } from "./base-context";
import { PAGE_SIZE } from "./constants";

interface Table {
  id: number;
  name: string;
  baseId: string;
}

interface BaseContentProps {
  baseId: string;
  tables: Table[];
  base: Base;
}

const DEFAULT_VIEW_CONFIG: ViewConfig = {
  sorts: [],
  filters: [],
  hiddenColumns: [],
  rowHeight: "short",
};

export function BaseContent({
  baseId,
  tables: initialTables,
  base,
}: BaseContentProps) {
  const {
    activeTableId,
    setActiveTableId,
    activeViewId,
    setActiveViewId,
    setIsSidebarOpen,
    isSidebarPersistent,
    setIsSidebarPersistent,
    activeModal,
    modalAnchor,
    contextMenu,
    setContextMenu,
  } = useBase();

  const gridTableRef = useRef<GridTableHandle>(null);
  const sidebarHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const utils = api.useUtils();
  const toast = useToast();

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

  const tableMutations = useTableMutations(
    baseId,
    tables,
    activeTableId,
    setActiveTableId,
  );

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
      hiddenColumns: cfg.hiddenColumns ?? [],
      rowHeight: cfg.rowHeight ?? "short",
    };
  }, [viewQuery.data?.config]);

  const activeViewName = useMemo(() => {
    return views.find((v) => v.id === activeViewId)?.name ?? "Grid view";
  }, [views, activeViewId]);

  // --- Rows: random-access page store ---
  // Each page is fetched independently by index, enabling jump-to-position.
  // row.getRows uses subquery seek (fast on int PK); view.getData uses OFFSET.
  const pageStoreRef = useRef<Map<number, GridRow[]>>(new Map());
  const loadingPagesRef = useRef<Set<number>>(new Set());
  const fetchKeyRef = useRef(0); // increments on reset to discard stale fetches
  const [pageStore, setPageStore] = useState<Map<number, GridRow[]>>(new Map());
  const [totalRowCount, setTotalRowCount] = useState<number | undefined>();

  const fetchPage = useCallback(
    async (pageIndex: number) => {
      if (
        loadingPagesRef.current.has(pageIndex) ||
        pageStoreRef.current.has(pageIndex)
      )
        return;

      loadingPagesRef.current.add(pageIndex);
      const myFetchKey = fetchKeyRef.current;

      try {
        const offset = pageIndex * PAGE_SIZE;
        let newRows: GridRow[];
        let fetchedTotalCount: number | undefined;

        if (activeViewId) {
          const data = await utils.view.getData.fetch({
            viewId: activeViewId,
            offset,
            limit: PAGE_SIZE,
          });
          newRows = data.rows.map((row) => ({
            id: row.id,
            cells: row.cells as Record<string, string | number | null>,
          }));
          fetchedTotalCount = data.totalCount;
        } else if (activeTableId) {
          const data = await utils.row.getRows.fetch({
            tableId: activeTableId,
            offset,
            limit: PAGE_SIZE,
          });
          newRows = data.rows.map((row) => ({
            id: row.id,
            cells: row.cells as Record<string, string | number | null>,
          }));
          fetchedTotalCount = data.totalCount;
        } else {
          return;
        }

        // Discard result if view/table changed while fetching
        if (fetchKeyRef.current !== myFetchKey) return;

        pageStoreRef.current.set(pageIndex, newRows);
        setPageStore(new Map(pageStoreRef.current));

        if (pageIndex === 0 && fetchedTotalCount !== undefined) {
          setTotalRowCount(fetchedTotalCount);
        }
      } finally {
        if (fetchKeyRef.current === myFetchKey) {
          loadingPagesRef.current.delete(pageIndex);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeViewId, activeTableId, utils],
  );

  // Reset page store and reload page 0 whenever view or table changes
  useEffect(() => {
    fetchKeyRef.current++;
    pageStoreRef.current = new Map();
    loadingPagesRef.current = new Set();
    setPageStore(new Map());
    setTotalRowCount(undefined);

    if (activeViewId ?? activeTableId) {
      void fetchPage(0);
    }
    // fetchPage intentionally omitted — it captures activeViewId/activeTableId via closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId, activeTableId]);

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

  // Filter out hidden columns
  const visibleColumns = useMemo(() => {
    const hiddenSet = new Set(viewConfig.hiddenColumns ?? []);
    return allColumns.filter((c) => !hiddenSet.has(c.id));
  }, [allColumns, viewConfig.hiddenColumns]);

  const columnMutations = useColumnMutations(activeTableId);

  // --- Cells ---
  const updateCell = api.cell.update.useMutation({
    onSuccess: () => {
      // Refetch all currently loaded pages to reflect the updated cell
      const loadedPageIndices = [...pageStoreRef.current.keys()];
      pageStoreRef.current = new Map();
      loadingPagesRef.current = new Set();
      setPageStore(new Map());
      for (const pageIndex of loadedPageIndices) {
        void fetchPage(pageIndex);
      }
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const handleCellUpdate = useCallback(
    (rowId: number, columnId: number, value: string) => {
      const col = allColumns.find((c) => c.id === columnId);
      if (!col) return;

      if (col.type === "NUMBER") {
        const num = parseFloat(value);
        updateCell.mutate({
          rowId,
          columnId,
          value: isNaN(num) ? null : num,
        });
      } else {
        updateCell.mutate({ rowId, columnId, value });
      }
    },
    [allColumns, updateCell],
  );

  // --- Grid rows: sparse array (null = not yet loaded, shows skeleton) ---
  const gridRows = useMemo<(GridRow | null)[]>(() => {
    if (!totalRowCount) return [];
    const sparse: (GridRow | null)[] = new Array(totalRowCount).fill(null);
    for (const [pageIndex, pageRows] of pageStore) {
      const startIdx = pageIndex * PAGE_SIZE;
      pageRows.forEach((row, i) => {
        const idx = startIdx + i;
        if (idx < totalRowCount) sparse[idx] = row;
      });
    }
    return sparse;
  }, [pageStore, totalRowCount, PAGE_SIZE]);

  // --- Context menu handlers ---

  // Column context menu actions
  const handleColumnRenameFromMenu = useCallback(
    (_columnId: number) => {
      // The GridTable handles inline header editing
      setContextMenu(null);
    },
    [setContextMenu],
  );

  const handleInsertColumnLeft = useCallback(
    (columnId: number) => {
      const colIdx = allColumns.findIndex((c) => c.id === columnId);
      const beforeId = columnId;
      const afterId = colIdx > 0 ? allColumns[colIdx - 1]!.id : null;
      columnMutations.handleAddColumn({
        afterColumnId: afterId ?? undefined,
        beforeColumnId: beforeId,
      });
    },
    [allColumns, columnMutations],
  );

  const handleInsertColumnRight = useCallback(
    (columnId: number) => {
      const colIdx = allColumns.findIndex((c) => c.id === columnId);
      const afterId = columnId;
      const beforeId =
        colIdx < allColumns.length - 1 ? allColumns[colIdx + 1]!.id : null;
      columnMutations.handleAddColumn({
        afterColumnId: afterId,
        beforeColumnId: beforeId ?? undefined,
      });
    },
    [allColumns, columnMutations],
  );

  // Scroll to row (for search)
  const handleScrollToRow = useCallback((rowId: number) => {
    gridTableRef.current?.scrollToRow(rowId);
  }, []);

  // Sidebar hover handlers
  const handleSidebarHoverEnter = useCallback(() => {
    if (sidebarHoverTimeoutRef.current) {
      clearTimeout(sidebarHoverTimeoutRef.current);
      sidebarHoverTimeoutRef.current = null;
    }
    // Only open on hover if not in persistent mode
    if (!isSidebarPersistent) {
      setIsSidebarOpen(true);
    }
  }, [isSidebarPersistent, setIsSidebarOpen]);

  const handleSidebarHoverLeave = useCallback(() => {
    // Only close on hover leave if not in persistent mode
    if (!isSidebarPersistent) {
      sidebarHoverTimeoutRef.current = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 300);
    }
  }, [isSidebarPersistent, setIsSidebarOpen]);

  const handleToggleSidebar = useCallback(() => {
    if (sidebarHoverTimeoutRef.current) {
      clearTimeout(sidebarHoverTimeoutRef.current);
      sidebarHoverTimeoutRef.current = null;
    }

    if (isSidebarPersistent) {
      // Currently persistent - exit persistent mode and close
      setIsSidebarPersistent(false);
      setIsSidebarOpen(false);
    } else {
      // Not persistent - enter persistent mode and ensure open
      setIsSidebarPersistent(true);
      setIsSidebarOpen(true);
    }
  }, [isSidebarPersistent, setIsSidebarPersistent, setIsSidebarOpen]);

  // Reset active view when switching tables
  useEffect(() => {
    setActiveViewId(null);
  }, [activeTableId, setActiveViewId]);

  const isLoading = tableQuery.isLoading || (pageStore.size === 0 && totalRowCount === undefined);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <BaseHeader base={base} tables={tables} />

      {/* Toolbar */}
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

      {/* View sidebar + Grid + Footer */}
      <div className="flex flex-1 overflow-hidden">
        <ViewSidebar
          views={views}
          // onDuplicateView={viewMutations.handleDuplicateView}
          // onReorderViews={viewMutations.handleReorderViews}
          onMouseEnter={handleSidebarHoverEnter}
          onMouseLeave={handleSidebarHoverLeave}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-sm text-gray-500">Loading...</div>
            </div>
          ) : (
            <GridTable
              ref={gridTableRef}
              columns={visibleColumns}
              rows={gridRows}
              onCellUpdate={handleCellUpdate}
              onRequestPage={fetchPage}
              sorts={viewConfig.sorts ?? []}
              rowHeight={viewConfig.rowHeight ?? "short"}
            />
          )}

          {/* Footer — right of sidebar */}
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3 py-1">
            <span className="text-xs text-gray-500">
              {totalRowCount != null
                ? `${totalRowCount} ${totalRowCount === 1 ? "record" : "records"}`
                : "Loading..."}
            </span>
          </div>
        </div>
      </div>

      {/* Context Menus */}
      {contextMenu?.type === "record" && <RecordContextMenu />}

      {contextMenu?.type === "column" && contextMenu.data.columnId != null && (
        <ColumnContextMenu
          column={allColumns.find((c) => c.id === contextMenu.data.columnId)!}
          viewConfig={viewConfig}
          onRename={handleColumnRenameFromMenu}
          onInsertLeft={handleInsertColumnLeft}
          onInsertRight={handleInsertColumnRight}
        />
      )}

      {/* Set Primary Modal */}
      {activeModal === "set-primary" && (
        <SetPrimaryModal
          columns={allColumns}
          currentPrimaryId={
            allColumns.find((c) => c.primary)?.id ?? allColumns[0]!.id
          }
        />
      )}

      {/* Add Table Modal */}
      {activeModal === "add-table" && (
        <AddTableModal
          anchorEl={modalAnchor}
          onAddTable={() => {
            tableMutations.handleAddTable();
          }}
        />
      )}

      {/* Add Column Modal */}
      {activeModal === "add-column" && (
        <AddColumnModal anchorEl={modalAnchor} />
      )}
    </div>
  );
}
