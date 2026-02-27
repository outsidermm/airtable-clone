/**
 * useOptimisticGrid — wires concrete optimistic mutation implementations into
 * the BaseContext callback registry.
 *
 * Why this hook exists (instead of living in useRowMutations):
 * useRowMutations calls BaseContext callbacks (optimisticAddRow, etc.) but
 * cannot own their implementations — those implementations require access to
 * `pageStoreRef`, which lives in BaseContent's scope. This hook bridges the two
 * via BaseContext's register pattern: BaseContent creates the ref, passes it here,
 * and this hook registers closures that capture it.
 *
 * Temp ID convention:
 * Optimistic rows are assigned negative IDs (`-Date.now()`). Since the Row model
 * uses `Int @id @default(autoincrement())` (always positive), negative values are
 * impossible in the real DB and require no separate `isPending` flag on GridRow.
 *
 * rowOrderOverride interaction:
 * - optimisticAddRowImpl: appends to the override only if already active to avoid
 * an unnecessary O(n) array copy for the common append-to-end case.
 * - optimisticInsertRowNearImpl: always activates the override, building a sparse
 * index from the current pageStore entries to place the new row precisely.
 * - All revert() closures capture their pre-mutation state, enabling rollback
 * without any additional server round-trip.
 */

import { useCallback, useEffect } from "react";
import { PAGE_SIZE } from "../constants";
import type { GridRow } from "~/types/grid";
import { useBase } from "../base-context";

interface UseOptimisticGridProps {
  pageStoreRef: React.RefObject<Map<number, GridRow[]>>;
  setPageStore: React.Dispatch<React.SetStateAction<Map<number, GridRow[]>>>;
  totalRowCountRef: React.RefObject<number>;
  setTotalRowCount: React.Dispatch<React.SetStateAction<number | undefined>>;
  pendingOptimisticEditsRef: React.RefObject<
    Map<number, Record<string, string | number | boolean | null>>
  >;
  setRowOrderOverride: React.Dispatch<
    React.SetStateAction<(number | null)[] | null>
  >;
}

export function useOptimisticGrid({
  pageStoreRef,
  setPageStore,
  totalRowCountRef,
  setTotalRowCount,
  pendingOptimisticEditsRef,
  setRowOrderOverride,
}: UseOptimisticGridProps) {
  const {
    registerOptimisticAddRow,
    registerOptimisticDeleteRow,
    registerOptimisticInsertRowNear,
  } = useBase();

  const optimisticAddRowImpl = useCallback((): {
    tempId: number;
    revert: () => void;
  } => {
    // Negative timestamp guarantees uniqueness and DB-impossibility (autoincrement IDs > 0).
    const tempId = -Date.now();
    const tempRow: GridRow = { id: tempId, cells: {} };

    const prevCount = totalRowCountRef.current ?? 0;
    const newCount = prevCount + 1;
    const lastPageIndex = Math.floor((newCount - 1) / PAGE_SIZE);

    totalRowCountRef.current = newCount;

    const existingPage = pageStoreRef.current?.get(lastPageIndex) ?? [];
    pageStoreRef.current?.set(lastPageIndex, [...existingPage, tempRow]);
    setPageStore(new Map(pageStoreRef.current));
    setTotalRowCount(newCount);

    // Only sync the override if it's already active — otherwise the
    // page-store direct-render path handles it and we avoid an O(n) copy.
    setRowOrderOverride((prev) => {
      if (prev === null) return null;
      return [...prev, tempId];
    });

    return {
      tempId,
      revert: () => {
        pendingOptimisticEditsRef.current?.delete(tempId);
        totalRowCountRef.current = prevCount;
        const page = pageStoreRef.current?.get(lastPageIndex);
        if (page) {
          const filtered = page.filter((r) => r.id !== tempId);
          if (filtered.length === 0) {
            pageStoreRef.current?.delete(lastPageIndex);
          } else {
            pageStoreRef.current?.set(lastPageIndex, filtered);
          }
        }
        setPageStore(new Map(pageStoreRef.current));
        setTotalRowCount(prevCount);
      },
    };
  }, [
    pageStoreRef,
    setPageStore,
    totalRowCountRef,
    setTotalRowCount,
    pendingOptimisticEditsRef,
    setRowOrderOverride,
  ]);

  const optimisticDeleteRowImpl = useCallback(
    (rowId: number): { revert: () => void } => {
      let foundPageIndex = -1;
      let foundPosition = -1;
      let foundRow: GridRow | undefined;

      for (const [pageIndex, pageRows] of pageStoreRef.current ?? []) {
        const pos = pageRows.findIndex((r) => r.id === rowId);
        if (pos !== -1) {
          foundPageIndex = pageIndex;
          foundPosition = pos;
          foundRow = pageRows[pos];
          break;
        }
      }

      const prevCount = totalRowCountRef.current ?? 0;
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

      const page = [...(pageStoreRef.current?.get(foundPageIndex) ?? [])];
      page.splice(foundPosition, 1);
      pageStoreRef.current?.set(foundPageIndex, page);
      setPageStore(new Map(pageStoreRef.current));

      const capturedRow = foundRow;
      const capturedPageIndex = foundPageIndex;
      const capturedPosition = foundPosition;
      return {
        revert: () => {
          totalRowCountRef.current = prevCount;
          setTotalRowCount(prevCount);
          const currentPage = [
            ...(pageStoreRef.current?.get(capturedPageIndex) ?? []),
          ];
          currentPage.splice(capturedPosition, 0, capturedRow);
          pageStoreRef.current?.set(capturedPageIndex, currentPage);
          setPageStore(new Map(pageStoreRef.current));
        },
      };
    },
    [pageStoreRef, setPageStore, totalRowCountRef, setTotalRowCount],
  );

  const optimisticInsertRowNearImpl = useCallback(
    (
      _tableId: number,
      beforeRowId?: number | null,
      afterRowId?: number | null,
    ): { tempId: number; revert: () => void } => {
      const tempId = -Date.now();
      const tempRow: GridRow = { id: tempId, cells: {} };

      const prevCount = totalRowCountRef.current ?? 0;
      const newCount = prevCount + 1;
      totalRowCountRef.current = newCount;

      const lastPageIndex = Math.floor((newCount - 1) / PAGE_SIZE);
      const existingPage = pageStoreRef.current?.get(lastPageIndex) ?? [];
      pageStoreRef.current?.set(lastPageIndex, [...existingPage, tempRow]);
      setPageStore(new Map(pageStoreRef.current));
      setTotalRowCount(newCount);

      setRowOrderOverride((prev) => {
        let currentOrder: (number | null)[] = prev ?? [];

        // Materialise a sparse override from pageStore entries when activating for
        // the first time. null slots represent pages not yet fetched — they must be
        // preserved so the virtualizer's placeholder rows remain at their correct indices.
        if (!prev) {
          currentOrder = new Array<number | null>(prevCount).fill(null);
          for (const [pageIndex, pageRows] of pageStoreRef.current?.entries() ??
            []) {
            const startIdx = pageIndex * PAGE_SIZE;
            pageRows.forEach((row, i) => {
              if (startIdx + i < prevCount) currentOrder[startIdx + i] = row.id;
            });
          }
        }

        let insertIdx = -1;
        if (beforeRowId != null) {
          insertIdx = currentOrder.indexOf(beforeRowId);
          // Fallback if rowOrderOverride is acting as a stale snapshot that missed a newly fetched page
          if (insertIdx === -1) {
            for (const [
              pageIndex,
              pageRows,
            ] of pageStoreRef.current?.entries() ?? []) {
              const idxInPage = pageRows.findIndex((r) => r.id === beforeRowId);
              if (idxInPage !== -1) {
                insertIdx = pageIndex * PAGE_SIZE + idxInPage;
                break;
              }
            }
          }
        } else if (afterRowId != null) {
          let targetIdx = currentOrder.indexOf(afterRowId);
          // Fallback if rowOrderOverride is acting as a stale snapshot that missed a newly fetched page
          if (targetIdx === -1) {
            for (const [
              pageIndex,
              pageRows,
            ] of pageStoreRef.current?.entries() ?? []) {
              const idxInPage = pageRows.findIndex((r) => r.id === afterRowId);
              if (idxInPage !== -1) {
                targetIdx = pageIndex * PAGE_SIZE + idxInPage;
                break;
              }
            }
          }
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
          pendingOptimisticEditsRef.current?.delete(tempId);
          totalRowCountRef.current = prevCount;
          const page = pageStoreRef.current?.get(lastPageIndex);
          if (page) {
            const filtered = page.filter((r) => r.id !== tempId);
            if (filtered.length === 0)
              pageStoreRef.current?.delete(lastPageIndex);
            else pageStoreRef.current?.set(lastPageIndex, filtered);
          }
          setPageStore(new Map(pageStoreRef.current));
          setTotalRowCount(prevCount);
          setRowOrderOverride(null);
        },
      };
    },
    [
      pageStoreRef,
      setPageStore,
      totalRowCountRef,
      setTotalRowCount,
      pendingOptimisticEditsRef,
      setRowOrderOverride,
    ],
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
}
