"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
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
import { pushQueryEntry } from "~/lib/query-log";

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
  filterGroupLogic: "AND",
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
    searchQuery,
    registerRefetchRows,
    registerOptimisticAddRow,
    registerOptimisticDeleteRow,
    registerOptimisticInsertRowNear,
    registerOnRowCreated,
    notifyRowIdSwap,
    registerOnColumnCreated,
  } = useBase();

  const gridTableRef = useRef<GridTableHandle>(null);
  const sidebarHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const utils = api.useUtils();
  const toast = useToast();

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
      filterGroupLogic: cfg.filterGroupLogic ?? "AND",
      hiddenColumns: cfg.hiddenColumns ?? [],
      rowHeight: cfg.rowHeight ?? "short",
      columnOrder: cfg.columnOrder,
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
  // Ref always tracks the latest totalRowCount for use in optimistic callbacks
  // (avoids stale-closure issues during rapid successive mutations)
  const totalRowCountRef = useRef<number>(0);
  // Stores cell edits typed into temp (optimistic) rows — keyed by negative tempRowId.
  // Flushed to the server in onRowCreatedImpl when the real row ID arrives.
  const pendingOptimisticEditsRef = useRef<Map<number, Record<string, string | number | null>>>(new Map());

  // Stores cell edits typed into temp (optimistic) columns — keyed by negative tempColId,
  // then by rowId. Flushed in onColumnCreatedImpl when the real column ID arrives.
  const pendingColumnEditsRef = useRef<Map<number, Map<number, string | number | null>>>(new Map());

  // Local row reorder override — ordered list of row IDs to display instead of
  // the page-store's natural server order.  Avoids touching the page store so
  // no skeleton flash occurs.  Reset whenever the page store is refetched.
  const [rowOrderOverride, setRowOrderOverride] = useState<number[] | null>(null);

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

        const fetchStart = Date.now();
        if (activeViewId) {
          const data = await utils.view.getData.fetch(
            { viewId: activeViewId, offset, limit: PAGE_SIZE },
            { staleTime: 0 }, // always bypass 30s cache — mutations don't invalidate this query
          );
          newRows = data.rows.map((row) => ({
            id: row.id,
            cells: row.cells as Record<string, string | number | null>,
          }));
          fetchedTotalCount = data.totalCount;
          pushQueryEntry({ path: "view.getData", label: `viewId=${activeViewId} page=${pageIndex}`, sqlMs: data.sqlMs, totalMs: Date.now() - fetchStart, rowCount: newRows.length });
        } else if (activeTableId) {
          const data = await utils.row.getRows.fetch(
            { tableId: activeTableId, offset, limit: PAGE_SIZE },
            { staleTime: 0 }, // always bypass 30s cache
          );
          newRows = data.rows.map((row) => ({
            id: row.id,
            cells: row.cells as Record<string, string | number | null>,
          }));
          fetchedTotalCount = data.totalCount;
          pushQueryEntry({ path: "row.getRows", label: `tableId=${activeTableId} page=${pageIndex}`, sqlMs: data.sqlMs, totalMs: Date.now() - fetchStart, rowCount: newRows.length });
        } else {
          return;
        }

        // Discard result if view/table changed while fetching
        if (fetchKeyRef.current !== myFetchKey) return;

        pageStoreRef.current.set(pageIndex, newRows);
        setPageStore(new Map(pageStoreRef.current));

        if (pageIndex === 0 && fetchedTotalCount !== undefined) {
          const count = fetchedTotalCount;
          totalRowCountRef.current = count;
          setTotalRowCount(count);
        }
      } finally {
        if (fetchKeyRef.current === myFetchKey) {
          loadingPagesRef.current.delete(pageIndex);
        }
      }
    },
    [activeViewId, activeTableId, utils],
  );

  // Force-refetch a page in the background without clearing the page store.
  // Unlike fetchPage, this bypasses the dedup check so already-loaded pages
  // are refreshed in place. Data updates smoothly with no skeleton flash.
  const silentRefetchPage = useCallback(
    async (pageIndex: number) => {
      const myFetchKey = fetchKeyRef.current;
      try {
        const offset = pageIndex * PAGE_SIZE;
        let newRows: GridRow[];
        let fetchedTotalCount: number | undefined;

        if (activeViewId) {
          const data = await utils.view.getData.fetch(
            { viewId: activeViewId, offset, limit: PAGE_SIZE },
            { staleTime: 0 },
          );
          newRows = data.rows.map((row) => ({
            id: row.id,
            cells: row.cells as Record<string, string | number | null>,
          }));
          fetchedTotalCount = data.totalCount;
        } else if (activeTableId) {
          const data = await utils.row.getRows.fetch(
            { tableId: activeTableId, offset, limit: PAGE_SIZE },
            { staleTime: 0 },
          );
          newRows = data.rows.map((row) => ({
            id: row.id,
            cells: row.cells as Record<string, string | number | null>,
          }));
          fetchedTotalCount = data.totalCount;
        } else {
          return;
        }

        if (fetchKeyRef.current !== myFetchKey) return;

        pageStoreRef.current.set(pageIndex, newRows);
        setPageStore(new Map(pageStoreRef.current));

        if (pageIndex === 0 && fetchedTotalCount !== undefined) {
          const count = fetchedTotalCount;
          totalRowCountRef.current = count;
          setTotalRowCount(count);
        }
      } catch {
        // Silently ignore errors — this is a background sync
      }
    },
    [activeViewId, activeTableId, utils],
  );

  // Exposed to mutation hooks via base-context.
  // Refreshes all loaded pages in-place (no page store clearing) so the grid
  // never flashes to an all-skeleton state. Data updates smoothly as pages arrive.
  const refetchLoadedPages = useCallback(() => {
    const loadedPageIndices = [...pageStoreRef.current.keys()];
    // Clear loading locks so silentRefetchPage can re-fetch these pages
    loadingPagesRef.current = new Set();
    setRowOrderOverride(null);
    void silentRefetchPage(0);
    for (const pageIndex of loadedPageIndices) {
      if (pageIndex !== 0) void silentRefetchPage(pageIndex);
    }
  }, [silentRefetchPage]);

  useEffect(() => {
    registerRefetchRows(refetchLoadedPages);
  }, [registerRefetchRows, refetchLoadedPages]);

  // --- Optimistic row mutations ---
  // These functions directly mutate the page store for instant visual feedback,
  // returning a revert function in case the server mutation fails.

  const optimisticAddRowImpl = useCallback((): { tempId: number; revert: () => void } => {
    const tempId = -(Date.now());
    const tempRow: GridRow = { id: tempId, cells: {} };

    // Use ref to always read the current count, even during rapid successive calls
    const prevCount = totalRowCountRef.current;
    const newCount = prevCount + 1;
    const lastPageIndex = Math.floor((newCount - 1) / PAGE_SIZE);

    // Update ref immediately so the next optimistic call sees the correct count
    totalRowCountRef.current = newCount;

    const existingPage = pageStoreRef.current.get(lastPageIndex) ?? [];
    pageStoreRef.current.set(lastPageIndex, [...existingPage, tempRow]);
    setPageStore(new Map(pageStoreRef.current));
    setTotalRowCount(newCount);

    return {
      tempId,
      revert: () => {
        pendingOptimisticEditsRef.current.delete(tempId);
        totalRowCountRef.current = prevCount;
        const page = pageStoreRef.current.get(lastPageIndex);
        if (page) {
          const filtered = page.filter((r) => r.id !== tempId);
          if (filtered.length === 0) {
            pageStoreRef.current.delete(lastPageIndex);
          } else {
            pageStoreRef.current.set(lastPageIndex, filtered);
          }
        }
        setPageStore(new Map(pageStoreRef.current));
        setTotalRowCount(prevCount);
      },
    };
  }, []); // No dependencies — reads from refs

  const optimisticDeleteRowImpl = useCallback((rowId: number): { revert: () => void } => {
    // Find the row across all loaded pages
    let foundPageIndex = -1;
    let foundPosition = -1;
    let foundRow: GridRow | undefined;

    for (const [pageIndex, pageRows] of pageStoreRef.current) {
      const pos = pageRows.findIndex((r) => r.id === rowId);
      if (pos !== -1) {
        foundPageIndex = pageIndex;
        foundPosition = pos;
        foundRow = pageRows[pos];
        break;
      }
    }

    const prevCount = totalRowCountRef.current;
    const newCount = Math.max(0, prevCount - 1);
    totalRowCountRef.current = newCount;
    setTotalRowCount(newCount);

    if (foundPageIndex === -1 || !foundRow) {
      // Row not in any loaded page — just adjust the count
      return {
        revert: () => {
          totalRowCountRef.current = prevCount;
          setTotalRowCount(prevCount);
        },
      };
    }

    // Remove from page store
    const page = [...(pageStoreRef.current.get(foundPageIndex) ?? [])];
    page.splice(foundPosition, 1);
    pageStoreRef.current.set(foundPageIndex, page);
    setPageStore(new Map(pageStoreRef.current));

    const capturedRow = foundRow;
    const capturedPageIndex = foundPageIndex;
    const capturedPosition = foundPosition;
    return {
      revert: () => {
        totalRowCountRef.current = prevCount;
        setTotalRowCount(prevCount);
        const currentPage = [...(pageStoreRef.current.get(capturedPageIndex) ?? [])];
        currentPage.splice(capturedPosition, 0, capturedRow);
        pageStoreRef.current.set(capturedPageIndex, currentPage);
        setPageStore(new Map(pageStoreRef.current));
      },
    };
  }, []); // No dependencies — reads from refs

  // Inserts an optimistic temp row adjacent to a target row in the display order.
  // The temp row is placed in the last page (for ID lookup) but displayed via rowOrderOverride.
  const optimisticInsertRowNearImpl = useCallback(
    (targetRowId: number, position: "above" | "below"): { tempId: number; revert: () => void } => {
      const tempId = -(Date.now());
      const tempRow: GridRow = { id: tempId, cells: {} };

      const prevCount = totalRowCountRef.current;
      const newCount = prevCount + 1;
      totalRowCountRef.current = newCount;

      const lastPageIndex = Math.floor((newCount - 1) / PAGE_SIZE);
      const existingPage = pageStoreRef.current.get(lastPageIndex) ?? [];
      pageStoreRef.current.set(lastPageIndex, [...existingPage, tempRow]);
      setPageStore(new Map(pageStoreRef.current));
      setTotalRowCount(newCount);

      // Use functional update to read the latest rowOrderOverride without stale closure
      setRowOrderOverride((prev) => {
        let currentOrder: number[];
        if (prev !== null) {
          currentOrder = prev;
        } else {
          const sortedPageIndices = [...pageStoreRef.current.keys()].sort((a, b) => a - b);
          const flat: GridRow[] = [];
          for (const pi of sortedPageIndices) flat.push(...(pageStoreRef.current.get(pi) ?? []));
          currentOrder = flat.map((r) => r.id);
        }
        const targetIdx = currentOrder.indexOf(targetRowId);
        const insertIdx = position === "above" ? targetIdx : targetIdx + 1;
        const newOrder = [...currentOrder];
        if (insertIdx >= 0 && insertIdx <= newOrder.length) {
          newOrder.splice(insertIdx, 0, tempId);
        } else {
          newOrder.push(tempId);
        }
        return newOrder;
      });

      return {
        tempId,
        revert: () => {
          pendingOptimisticEditsRef.current.delete(tempId);
          totalRowCountRef.current = prevCount;
          const page = pageStoreRef.current.get(lastPageIndex);
          if (page) {
            const filtered = page.filter((r) => r.id !== tempId);
            if (filtered.length === 0) pageStoreRef.current.delete(lastPageIndex);
            else pageStoreRef.current.set(lastPageIndex, filtered);
          }
          setPageStore(new Map(pageStoreRef.current));
          setTotalRowCount(prevCount);
          setRowOrderOverride(null);
        },
      };
    },
    [], // No dependencies — reads from refs, uses functional state updates
  );

  useEffect(() => {
    registerOptimisticAddRow(optimisticAddRowImpl);
  }, [registerOptimisticAddRow, optimisticAddRowImpl]);

  useEffect(() => {
    registerOptimisticDeleteRow(optimisticDeleteRowImpl);
  }, [registerOptimisticDeleteRow, optimisticDeleteRowImpl]);

  useEffect(() => {
    registerOptimisticInsertRowNear(optimisticInsertRowNearImpl);
  }, [registerOptimisticInsertRowNear, optimisticInsertRowNearImpl]);

  // Reset page store and reload page 0 whenever view or table changes
  useEffect(() => {
    fetchKeyRef.current++;
    pageStoreRef.current = new Map();
    loadingPagesRef.current = new Set();
    setPageStore(new Map());
    setTotalRowCount(undefined);
    totalRowCountRef.current = 0;

    if (activeViewId ?? activeTableId) {
      void fetchPage(0);
    }
    // fetchPage intentionally omitted — it captures activeViewId/activeTableId via closure
  }, [activeViewId, activeTableId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Filter out hidden columns and apply per-view column order when set
  const visibleColumns = useMemo(() => {
    const hiddenSet = new Set(viewConfig.hiddenColumns ?? []);
    const filtered = allColumns.filter((c) => !hiddenSet.has(c.id));

    const colOrder = viewConfig.columnOrder;
    if (!colOrder?.length) return filtered;

    // Sort by the view's column order; columns not in the list go to the end
    const orderMap = new Map(colOrder.map((id, idx) => [id, idx]));
    return [...filtered].sort((a, b) => {
      const ai = orderMap.get(a.id) ?? Infinity;
      const bi = orderMap.get(b.id) ?? Infinity;
      return ai - bi;
    });
  }, [allColumns, viewConfig.hiddenColumns, viewConfig.columnOrder]);

  const columnMutations = useColumnMutations(activeTableId);

  // --- Per-view column ordering ---
  const updateViewConfigMutation = api.view.update.useMutation({
    onSuccess: () => {
      if (activeViewId) void utils.view.getById.invalidate({ id: activeViewId });
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

  // --- Cells ---
  // Tracks the start time of each in-flight cell update, keyed by "rowId:colId".
  const cellUpdateStartRef = useRef<Map<string, number>>(new Map());

  const updateCell = api.cell.update.useMutation({
    onMutate: (variables) => {
      cellUpdateStartRef.current.set(
        `${variables.rowId}:${variables.columnId}`,
        Date.now(),
      );
    },
    onSuccess: (data, variables) => {
      // Log to performance panel
      const key = `${variables.rowId}:${variables.columnId}`;
      const startTime = cellUpdateStartRef.current.get(key);
      cellUpdateStartRef.current.delete(key);
      pushQueryEntry({
        path: "cell.update",
        label: `row=${variables.rowId} col=${variables.columnId}`,
        sqlMs: data.sqlMs,
        totalMs: startTime !== undefined ? Date.now() - startTime : 0,
      });

      // Update the cell in the page store directly — avoids a full page refetch
      // and keeps the displayed value consistent after the user scrolls away and back.
      const colKey = String(variables.columnId);
      const savedValue = variables.value;
      for (const [pageIndex, pageRows] of pageStoreRef.current) {
        const rowIdx = pageRows.findIndex((r) => r.id === variables.rowId);
        if (rowIdx !== -1) {
          const newRows = [...pageRows];
          newRows[rowIdx] = {
            ...newRows[rowIdx]!,
            cells: { ...newRows[rowIdx]!.cells, [colKey]: savedValue },
          };
          pageStoreRef.current.set(pageIndex, newRows);
          setPageStore(new Map(pageStoreRef.current));
          break;
        }
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

      const colKey = String(columnId);
      const convertedValue: string | number | null =
        col.type === "NUMBER"
          ? (isNaN(parseFloat(value)) ? null : parseFloat(value))
          : value;

      const isTempRow = rowId < 0;
      const isTempCol = columnId < 0;

      if (isTempRow || isTempCol) {
        // Update the page store visually so the user sees their input immediately
        for (const [pageIndex, pageRows] of pageStoreRef.current) {
          const rowIdx = pageRows.findIndex((r) => r.id === rowId);
          if (rowIdx !== -1) {
            const newRows = [...pageRows];
            newRows[rowIdx] = {
              ...newRows[rowIdx]!,
              cells: { ...newRows[rowIdx]!.cells, [colKey]: convertedValue },
            };
            pageStoreRef.current.set(pageIndex, newRows);
            setPageStore(new Map(pageStoreRef.current));
            break;
          }
        }

        if (isTempRow && !isTempCol) {
          // Buffer by row: flushed when the row gets its real ID
          const existing = pendingOptimisticEditsRef.current.get(rowId) ?? {};
          pendingOptimisticEditsRef.current.set(rowId, { ...existing, [colKey]: convertedValue });
        } else if (isTempCol && !isTempRow) {
          // Buffer by column: flushed when the column gets its real ID
          const colEdits = pendingColumnEditsRef.current.get(columnId) ?? new Map<number, string | number | null>();
          colEdits.set(rowId, convertedValue);
          pendingColumnEditsRef.current.set(columnId, colEdits);
        }
        // Double-temp (both row and column are optimistic): visual update only
        return;
      }

      updateCell.mutate({ rowId, columnId, value: convertedValue });
    },
    [allColumns, updateCell],
  );

  // Called by createRow/duplicateRow.onSuccess: swaps temp ID for real ID in the page store,
  // then fires updateCell mutations for any edits typed before the server responded.
  // Pass `cells` to also update the stored cell data (used by row.duplicate).
  const onRowCreatedImpl = useCallback(
    (tempId: number, realRowId: number, cells?: Record<string, string | number | null>) => {
      const pendingEdits = pendingOptimisticEditsRef.current.get(tempId);
      pendingOptimisticEditsRef.current.delete(tempId);

      // Notify grid-table BEFORE swapping the page store so it can find the temp
      // row's virtual position while rows still contains the negative ID.
      notifyRowIdSwap(tempId, realRowId);

      for (const [pageIndex, pageRows] of pageStoreRef.current) {
        const rowIdx = pageRows.findIndex((r) => r.id === tempId);
        if (rowIdx !== -1) {
          const newRows = [...pageRows];
          newRows[rowIdx] = {
            ...newRows[rowIdx]!,
            id: realRowId,
            ...(cells !== undefined ? { cells } : {}),
          };
          pageStoreRef.current.set(pageIndex, newRows);
          setPageStore(new Map(pageStoreRef.current));
          break;
        }
      }

      // Swap tempId in rowOrderOverride so the inserted/duplicated row stays in position
      setRowOrderOverride((prev) => {
        if (!prev) return prev;
        return prev.map((id) => (id === tempId ? realRowId : id));
      });

      if (pendingEdits) {
        for (const [colKey, value] of Object.entries(pendingEdits)) {
          updateCell.mutate({ rowId: realRowId, columnId: Number(colKey), value });
        }
      }
    },
    [updateCell, notifyRowIdSwap],
  );

  useEffect(() => {
    registerOnRowCreated(onRowCreatedImpl);
  }, [registerOnRowCreated, onRowCreatedImpl]);

  // Called by createColumn.onSuccess: renames the temp column key in every page-store
  // row and flushes any cell edits the user typed before the server responded.
  const onColumnCreatedImpl = useCallback(
    (tempColId: number, realColId: number) => {
      const pendingEdits = pendingColumnEditsRef.current.get(tempColId);
      pendingColumnEditsRef.current.delete(tempColId);

      // Rename the cell key across all loaded pages (String(tempColId) → String(realColId))
      const tempKey = String(tempColId);
      const realKey = String(realColId);
      let changed = false;
      for (const [pageIndex, pageRows] of pageStoreRef.current) {
        let pageChanged = false;
        const updatedRows = pageRows.map((row) => {
          if (tempKey in row.cells) {
            const { [tempKey]: val, ...rest } = row.cells;
            pageChanged = true;
            // val could be undefined due to noUncheckedIndexedAccess — omit if so
            const newCells: Record<string, string | number | null> =
              val !== undefined ? { ...rest, [realKey]: val } : { ...rest };
            return { ...row, cells: newCells };
          }
          return row;
        });
        if (pageChanged) {
          pageStoreRef.current.set(pageIndex, updatedRows);
          changed = true;
        }
      }
      if (changed) setPageStore(new Map(pageStoreRef.current));

      // Flush buffered edits to the server now that the real column ID is known
      if (pendingEdits) {
        for (const [rowId, value] of pendingEdits) {
          updateCell.mutate({ rowId, columnId: realColId, value });
        }
      }
    },
    [updateCell],
  );

  useEffect(() => {
    registerOnColumnCreated(onColumnCreatedImpl);
  }, [registerOnColumnCreated, onColumnCreatedImpl]);

  // --- Search-as-filter: when a search query is active, show only matching rows ---
  const searchResultsQuery = api.cell.search.useQuery(
    { tableId: activeTableId, query: searchQuery, limit: 500 },
    { enabled: !!activeTableId && searchQuery.length > 0 },
  );

  // Log search queries to the performance panel whenever results arrive
  useEffect(() => {
    if (!searchResultsQuery.data) return;
    pushQueryEntry({
      path: "cell.search",
      label: `query="${searchQuery}"`,
      sqlMs: searchResultsQuery.data.sqlMs,
      totalMs: 0,
      rowCount: searchResultsQuery.data.rows.length,
    });
    // Intentionally only re-run when data reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResultsQuery.data]);

  const searchGridRows = useMemo<GridRow[] | null>(() => {
    if (!searchQuery || !searchResultsQuery.data) return null;
    return searchResultsQuery.data.rows.map((row) => ({
      id: row.id,
      cells: row.cells as Record<string, string | number | null>,
    }));
  }, [searchQuery, searchResultsQuery.data]);

  // Fast ID→row lookup used by rowOrderOverride
  const rowById = useMemo(() => {
    const map = new Map<number, GridRow>();
    for (const pageRows of pageStore.values()) {
      for (const row of pageRows) map.set(row.id, row);
    }
    return map;
  }, [pageStore]);

  // --- Grid rows: search mode (dense) or page-store mode (sparse) ---
  const gridRows = useMemo<(GridRow | null)[]>(() => {
    // Search mode — show matching rows as a dense array, no skeleton needed
    if (searchQuery && searchGridRows !== null) {
      return searchGridRows;
    }
    // Normal mode — sparse array where null = unloaded (renders as skeleton)
    if (!totalRowCount) return [];
    const sparse = new Array<GridRow | null>(totalRowCount).fill(null);

    if (rowOrderOverride !== null) {
      // Local-reorder mode: use the override for covered positions, page-store for the rest
      rowOrderOverride.forEach((id, i) => {
        if (i < totalRowCount) sparse[i] = rowById.get(id) ?? null;
      });
      for (const [pageIndex, pageRows] of pageStore) {
        const startIdx = pageIndex * PAGE_SIZE;
        pageRows.forEach((row, i) => {
          const idx = startIdx + i;
          if (idx >= rowOrderOverride.length && idx < totalRowCount) {
            sparse[idx] = row;
          }
        });
      }
    } else {
      for (const [pageIndex, pageRows] of pageStore) {
        const startIdx = pageIndex * PAGE_SIZE;
        pageRows.forEach((row, i) => {
          const idx = startIdx + i;
          if (idx < totalRowCount) sparse[idx] = row;
        });
      }
    }
    return sparse;
  }, [searchQuery, searchGridRows, pageStore, rowById, totalRowCount, rowOrderOverride]);

  // --- Row reorder (local only — no DB order column) ---
  // Uses a rowOrderOverride rather than rebuilding the page store, so no page
  // refetch is triggered and the grid never flashes blank.
  const handleReorderRow = useCallback(
    (draggedRowIds: number[], targetRowId: number) => {
      const draggedId = draggedRowIds[0]!;
      setRowOrderOverride((prev) => {
        // Build the base order from the current override or from the page store
        let currentOrder: number[];
        if (prev !== null) {
          currentOrder = prev;
        } else {
          const sortedPageIndices = [...pageStoreRef.current.keys()].sort(
            (a, b) => a - b,
          );
          const flat: GridRow[] = [];
          for (const pi of sortedPageIndices) {
            flat.push(...(pageStoreRef.current.get(pi) ?? []));
          }
          currentOrder = flat.map((r) => r.id);
        }

        const oldIdx = currentOrder.indexOf(draggedId);
        const newIdx = currentOrder.indexOf(targetRowId);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;

        return arrayMove(currentOrder, oldIdx, newIdx);
      });
    },
    [],
  );

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

  // Only block rendering on column schema — once columns are known the grid can
  // mount immediately and rows will fill in as pages load (sparse skeleton rows).
  const isLoading = tableQuery.isLoading;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <BaseHeader base={liveBase} tables={tables} />

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
              onReorderRow={handleReorderRow}
              onReorderColumns={handleReorderColumns}
              onRequestPage={fetchPage}
              sorts={viewConfig.sorts ?? []}
              rowHeight={viewConfig.rowHeight ?? "short"}
            />
          )}

          {/* Footer — right of sidebar */}
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3 py-1">
            <span className="text-xs text-gray-500">
              {searchQuery
                ? searchGridRows !== null
                  ? `${searchGridRows.length} matching ${searchGridRows.length === 1 ? "record" : "records"}`
                  : "Searching..."
                : totalRowCount != null
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
          onDuplicate={columnMutations.handleDuplicateColumn}
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
