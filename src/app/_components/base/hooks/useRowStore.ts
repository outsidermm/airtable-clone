"use client";

/**
 * useRowStore — random-access, cursor-paginated row data layer.
 *
 * The store is intentionally two-tiered:
 *   - `pageStoreRef`  — a mutable `Map<pageIndex, GridRow[]>`. All optimistic writes
 *     (cell edits, add/delete) go here first, at zero re-render cost.
 *   - `pageStore` state — a snapshot of the ref, copied shallowly and set via
 *     `setPageStore(new Map(pageStoreRef.current))` only when a structural change
 *     must be reflected in the UI (page loaded, row added/removed). Cell-level edits
 *     never trigger this copy path; they land directly in the ref via useCellMutations.
 *
 * Fetch deduplication:
 *   `loadingPagesRef` prevents concurrent duplicate requests for the same page.
 *   `fetchKeyRef` is a monotonically incrementing generation counter; if the view or
 *   table changes while a fetch is in flight, the stale response is discarded on
 *   the `fetchKeyRef.current !== myFetchKey` guard.
 *
 * totalRowCount:
 *   Derived from the page 0 response only (the server runs COUNT(*) there).
 *   Subsequent page fetches skip the COUNT query entirely. The ref twin
 *   (`totalRowCountRef`) allows synchronous reads in callbacks that must not
 *   close over a stale state value.
 *
 * refetchLoadedPages vs. full reset:
 *   `refetchLoadedPages` re-fetches every loaded page in-place and clears
 *   rowOrderOverride once page 0 settles. Used by mutations that may change sort
 *   order (reorder, bulk delete). A full reset (`fetchKeyRef++`) only happens on
 *   view/table change.
 */

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

  // pageStoreRef is the authoritative mutable source; pageStore state is its
  // snapshot twin. Never write to pageStore directly — always mutate the ref
  // first, then call setPageStore(new Map(pageStoreRef.current)) to trigger render.
  const pageStoreRef = useRef<Map<number, GridRow[]>>(new Map());
  const loadingPagesRef = useRef<Set<number>>(new Set());
  // Generation counter: incremented on view/table change to invalidate in-flight fetches.
  const fetchKeyRef = useRef(0);
  const [pageStore, setPageStore] = useState<Map<number, GridRow[]>>(new Map());
  const [totalRowCount, setTotalRowCount] = useState<number | undefined>();
  // Ref twin of totalRowCount for synchronous reads inside callbacks/effects
  // that would otherwise close over a stale state value.
  const totalRowCountRef = useRef<number>(0);

  const fetchPage = useCallback(
    async (pageIndex: number) => {
      // Early-exit guards: already in-flight or already cached.
      // loadingPagesRef prevents parallel requests for the same page (e.g., rapid
      // scroll can trigger onRequestPage multiple times before the first response).
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

        // totalRowCount is populated from page 0 only; all other pages skip COUNT(*).
        // The server is designed to include totalCount only in the first response.
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

  // Refetches every loaded page without resetting the store. Called by structural
  // mutations (reorder, bulk-delete) that change server-side order/count but should
  // not blank the viewport. Page 0 runs first and clears rowOrderOverride on completion,
  // signalling that the authoritative server order has replaced the optimistic override.
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

  // Full reset on view/table switch: bump the generation counter, clear all caches,
  // and eagerly fetch page 0 so the grid is never blank during tab transitions.
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
