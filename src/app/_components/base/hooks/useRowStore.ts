"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GridRow } from "~/types/grid";
import { PAGE_SIZE } from "../constants";
import { useBase } from "../base-context";
import { api } from "~/trpc/react";
import { pushQueryEntry } from "~/lib/query-log";

interface UseRowStoreProps {
  setRowOrderOverride: (order: (number | null)[] | null) => void;
  registerRefetchRows: (refetchFn: () => void) => void;
}

export function useRowStore({
  setRowOrderOverride,
  registerRefetchRows,
}: UseRowStoreProps) {
  const { activeViewId, activeTableId } = useBase();
  const utils = api.useUtils();

  const pageStoreRef = useRef<Map<number, GridRow[]>>(new Map());
  const loadingPagesRef = useRef<Set<number>>(new Set());
  const fetchKeyRef = useRef(0);
  const [pageStore, setPageStore] = useState<Map<number, GridRow[]>>(new Map());
  const [totalRowCount, setTotalRowCount] = useState<number | undefined>();
  const totalRowCountRef = useRef<number>(0);

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
    [activeViewId, activeTableId, utils, setRowOrderOverride],
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

  return {
    pageStore,
    setPageStore,
    pageStoreRef,
    totalRowCount,
    setTotalRowCount,
    totalRowCountRef,
    fetchPage,
    refetchLoadedPages,
  };
}
