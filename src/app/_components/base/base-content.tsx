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
import { useRowMutations } from "../hooks/use-row-mutations";
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
    activeViewId,
    setActiveViewId,
    setIsSidebarOpen,
    isSidebarPersistent,
    setIsSidebarPersistent,
    activeModal,
    modalAnchor,
    contextMenu,
    setContextMenu,
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

  const filteredColumnIds = useMemo(() => {
    return new Set(viewConfig.filters.map((f) => f.columnId));
  }, [viewConfig.filters]);

  const sortedColumnIds = useMemo(() => {
    return new Set(viewConfig.sorts.map((s) => s.columnId));
  }, [viewConfig.sorts]);

  // --- Rows: random-access page store ---
  const pageStoreRef = useRef<Map<number, GridRow[]>>(new Map());
  const loadingPagesRef = useRef<Set<number>>(new Set());
  const fetchKeyRef = useRef(0);
  const [pageStore, setPageStore] = useState<Map<number, GridRow[]>>(new Map());
  const [totalRowCount, setTotalRowCount] = useState<number | undefined>();
  const totalRowCountRef = useRef<number>(0);
  const pendingOptimisticEditsRef = useRef<
    Map<number, Record<string, string | number | null>>
  >(new Map());
  const pendingColumnEditsRef = useRef<
    Map<number, Map<number, string | number | null>>
  >(new Map());
  const [rowOrderOverride, setRowOrderOverride] = useState<number[] | null>(
    null,
  );
  const rowOrderOverrideRef = useRef<number[] | null>(null);

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
            { staleTime: 0 },
          );
          newRows = data.rows.map((row) => ({
            id: row.id,
            cells: row.cells as Record<string, string | number | null>,
          }));
          fetchedTotalCount = data.totalCount;
          pushQueryEntry({
            path: "view.getData",
            label: `viewId=${activeViewId} page=${pageIndex}`,
            sqlMs: data.sqlMs,
            totalMs: Date.now() - fetchStart,
            rowCount: newRows.length,
          });
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
          pushQueryEntry({
            path: "row.getRows",
            label: `tableId=${activeTableId} page=${pageIndex}`,
            sqlMs: data.sqlMs,
            totalMs: Date.now() - fetchStart,
            rowCount: newRows.length,
          });
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
      } finally {
        if (fetchKeyRef.current === myFetchKey) {
          loadingPagesRef.current.delete(pageIndex);
        }
      }
    },
    [activeViewId, activeTableId, utils],
  );

  useEffect(() => {
    rowOrderOverrideRef.current = rowOrderOverride;
  }, [rowOrderOverride]);

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

        if (pageIndex === 0) {
          setRowOrderOverride(null);

          if (fetchedTotalCount !== undefined) {
            const count = fetchedTotalCount;
            totalRowCountRef.current = count;
            setTotalRowCount(count);
          }
        }
      } catch {
        // Silently ignore errors
      }
    },
    [activeViewId, activeTableId, utils],
  );

  const refetchLoadedPages = useCallback(() => {
    const loadedPageIndices = [...pageStoreRef.current.keys()];
    loadingPagesRef.current = new Set();
    void silentRefetchPage(0);
    for (const pageIndex of loadedPageIndices) {
      if (pageIndex !== 0) void silentRefetchPage(pageIndex);
    }
  }, [silentRefetchPage]);

  useEffect(() => {
    registerRefetchRows(refetchLoadedPages);
  }, [registerRefetchRows, refetchLoadedPages]);

  // --- Optimistic row mutations ---
  const optimisticAddRowImpl = useCallback((): {
    tempId: number;
    revert: () => void;
  } => {
    const tempId = -Date.now();
    const tempRow: GridRow = { id: tempId, cells: {} };

    const prevCount = totalRowCountRef.current;
    const newCount = prevCount + 1;
    const lastPageIndex = Math.floor((newCount - 1) / PAGE_SIZE);

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
  }, []);

  const optimisticDeleteRowImpl = useCallback(
    (rowId: number): { revert: () => void } => {
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
        return {
          revert: () => {
            totalRowCountRef.current = prevCount;
            setTotalRowCount(prevCount);
          },
        };
      }

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
          const currentPage = [
            ...(pageStoreRef.current.get(capturedPageIndex) ?? []),
          ];
          currentPage.splice(capturedPosition, 0, capturedRow);
          pageStoreRef.current.set(capturedPageIndex, currentPage);
          setPageStore(new Map(pageStoreRef.current));
        },
      };
    },
    [],
  );

  const optimisticInsertRowNearImpl = useCallback(
    (
      tableId: number,
      beforeRowId?: number | null,
      afterRowId?: number | null,
    ): { tempId: number; revert: () => void } => {
      const tempId = -Date.now();
      const tempRow: GridRow = { id: tempId, cells: {} };

      const prevCount = totalRowCountRef.current;
      const newCount = prevCount + 1;
      totalRowCountRef.current = newCount;

      const preInsertFlatOrder: number[] = (() => {
        const sortedPageIndices = [...pageStoreRef.current.keys()].sort(
          (a, b) => a - b,
        );
        const flat: GridRow[] = [];
        for (const pi of sortedPageIndices)
          flat.push(...(pageStoreRef.current.get(pi) ?? []));
        return flat.map((r) => r.id);
      })();

      const lastPageIndex = Math.floor((newCount - 1) / PAGE_SIZE);
      const existingPage = pageStoreRef.current.get(lastPageIndex) ?? [];
      pageStoreRef.current.set(lastPageIndex, [...existingPage, tempRow]);
      setPageStore(new Map(pageStoreRef.current));
      setTotalRowCount(newCount);

      setRowOrderOverride((prev) => {
        const currentOrder = prev ?? preInsertFlatOrder;
        let insertIdx = -1;

        if (beforeRowId != null) {
          const targetIdx = currentOrder.indexOf(beforeRowId);
          if (targetIdx !== -1) insertIdx = targetIdx;
        } else if (afterRowId != null) {
          const targetIdx = currentOrder.indexOf(afterRowId);
          if (targetIdx !== -1) insertIdx = targetIdx + 1;
        }

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
            if (filtered.length === 0)
              pageStoreRef.current.delete(lastPageIndex);
            else pageStoreRef.current.set(lastPageIndex, filtered);
          }
          setPageStore(new Map(pageStoreRef.current));
          setTotalRowCount(prevCount);
          setRowOrderOverride(null);
        },
      };
    },
    [],
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
  }, [activeViewId, activeTableId, fetchPage]);

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

  // --- Cells ---
  const cellUpdateStartRef = useRef<Map<string, number>>(new Map());

  const updateCell = api.cell.update.useMutation({
    onMutate: (variables) => {
      cellUpdateStartRef.current.set(
        `${variables.rowId}:${variables.columnId}`,
        Date.now(),
      );
    },
    onSuccess: (data, variables) => {
      const key = `${variables.rowId}:${variables.columnId}`;
      const startTime = cellUpdateStartRef.current.get(key);
      cellUpdateStartRef.current.delete(key);
      pushQueryEntry({
        path: "cell.update",
        label: `row=${variables.rowId} col=${variables.columnId}`,
        sqlMs: data.sqlMs,
        totalMs: startTime !== undefined ? Date.now() - startTime : 0,
      });

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
          ? isNaN(parseFloat(value))
            ? null
            : parseFloat(value)
          : value;

      const isTempRow = rowId < 0;
      const isTempCol = columnId < 0;

      if (isTempRow || isTempCol) {
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
          const existing = pendingOptimisticEditsRef.current.get(rowId) ?? {};
          pendingOptimisticEditsRef.current.set(rowId, {
            ...existing,
            [colKey]: convertedValue,
          });
        } else if (isTempCol && !isTempRow) {
          const colEdits =
            pendingColumnEditsRef.current.get(columnId) ??
            new Map<number, string | number | null>();
          colEdits.set(rowId, convertedValue);
          pendingColumnEditsRef.current.set(columnId, colEdits);
        }
        return;
      }

      updateCell.mutate({ rowId, columnId, value: convertedValue });
    },
    [allColumns, updateCell],
  );

  const onRowCreatedImpl = useCallback(
    (
      tempId: number,
      realRowId: number,
      cells?: Record<string, string | number | null>,
    ) => {
      const pendingEdits = pendingOptimisticEditsRef.current.get(tempId);
      pendingOptimisticEditsRef.current.delete(tempId);

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

      setRowOrderOverride((prev) => {
        if (!prev) return prev;
        return prev.map((id) => (id === tempId ? realRowId : id));
      });

      if (pendingEdits) {
        for (const [colKey, value] of Object.entries(pendingEdits)) {
          updateCell.mutate({
            rowId: realRowId,
            columnId: Number(colKey),
            value,
          });
        }
      }
    },
    [updateCell, notifyRowIdSwap],
  );

  useEffect(() => {
    registerOnRowCreated(onRowCreatedImpl);
  }, [registerOnRowCreated, onRowCreatedImpl]);

  const onColumnCreatedImpl = useCallback(
    (tempColId: number, realColId: number) => {
      const pendingEdits = pendingColumnEditsRef.current.get(tempColId);
      pendingColumnEditsRef.current.delete(tempColId);

      const tempKey = String(tempColId);
      const realKey = String(realColId);
      let changed = false;
      for (const [pageIndex, pageRows] of pageStoreRef.current) {
        let pageChanged = false;
        const updatedRows = pageRows.map((row) => {
          if (tempKey in row.cells) {
            const { [tempKey]: val, ...rest } = row.cells;
            pageChanged = true;
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
  }, [pageStore, rowById, totalRowCount, rowOrderOverride]);

  const reorderRowMutation = api.row.reorder.useMutation({
    onSettled: () => refetchLoadedPages(),
  });

  const handleReorderRow = useCallback(
    (draggedRowIds: number[], targetRowId: number) => {
      const draggedId = draggedRowIds[0]!;

      const prev = rowOrderOverrideRef.current;
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
    [reorderRowMutation],
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

  const handleSidebarHoverEnter = useCallback(() => {
    if (sidebarHoverTimeoutRef.current) {
      clearTimeout(sidebarHoverTimeoutRef.current);
      sidebarHoverTimeoutRef.current = null;
    }
    if (!isSidebarPersistent) {
      setIsSidebarOpen(true);
    }
  }, [isSidebarPersistent, setIsSidebarOpen]);

  const handleSidebarHoverLeave = useCallback(() => {
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
      setIsSidebarPersistent(false);
      setIsSidebarOpen(false);
    } else {
      setIsSidebarPersistent(true);
      setIsSidebarOpen(true);
    }
  }, [isSidebarPersistent, setIsSidebarPersistent, setIsSidebarOpen]);

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
              filteredColumnIds={filteredColumnIds}
              sortedColumnIds={sortedColumnIds}
            />
          )}
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3 py-1">
            <span className="text-xs text-gray-500">
              {totalRowCount != null
                  ? `${totalRowCount} ${totalRowCount === 1 ? "record" : "records"}`
                  : "Loading..."}
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
    </div>
  );
}