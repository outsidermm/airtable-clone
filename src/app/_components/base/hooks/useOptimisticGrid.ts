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
    Map<number, Record<string, string | number | null>>
  >;
  setRowOrderOverride: React.Dispatch<React.SetStateAction<(number | null)[] | null>>;
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

        // BUILD A SPARSE ARRAY preserving null gaps
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
