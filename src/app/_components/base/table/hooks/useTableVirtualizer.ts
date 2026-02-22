import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import {
  useMemo,
  useRef,
  useCallback,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import { PAGE_SIZE, MAX_SAFE_HEIGHT } from "../../constants";
import type { GridRow } from "~/types/grid";
import type { Table } from "@tanstack/react-table";

interface UseTableVirtualizerProps {
  table: Table<GridRow>;
  rows: (GridRow | null)[];
  currentRowHeight: number;
  parentRef: React.RefObject<HTMLDivElement | null>;
  onRequestPage: (pageIndex: number) => void;
  selectedCells: Set<string>;
  isMultiSelect: boolean;
  setRowSelection: (selection: Record<number, boolean>) => void;
  ref: React.Ref<{
    scrollToRow: (rowId: number) => void;
    clearSelection: () => void;
  }>;
}

export function useTableVirtualizer({
  table,
  rows,
  currentRowHeight,
  parentRef,
  onRequestPage,
  selectedCells,
  isMultiSelect,
  setRowSelection,
  ref,
}: UseTableVirtualizerProps) {
  const [, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const tableRows = table.getRowModel().rows;
  const totalVirtualHeight = rows.length * currentRowHeight;
  const scrollScaleRef = useRef(1);
  scrollScaleRef.current =
    totalVirtualHeight > MAX_SAFE_HEIGHT
      ? MAX_SAFE_HEIGHT / totalVirtualHeight
      : 1;

  const tableRowById = useMemo(
    () => new Map(tableRows.map((r) => [r.original.id, r])),
    [tableRows],
  );

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

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => currentRowHeight,
    overscan: 5,
    observeElementOffset: useCallback(
      (
        instance: Virtualizer<HTMLDivElement, Element>,
        cb: (offset: number, isScrolling: boolean) => void,
      ) => {
        const el = instance.scrollElement as HTMLElement | null;
        if (!el) return;
        const onScroll = () => cb(el.scrollTop / scrollScaleRef.current, false);
        onScroll();
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
      },
      [],
    ),
    scrollToFn: useCallback(
      (
        offset: number,
        options: { adjustments?: number; behavior?: ScrollBehavior },
        instance: Virtualizer<HTMLDivElement, Element>,
      ) => {
        (instance.scrollElement as HTMLElement | null)?.scrollTo({
          top: offset * scrollScaleRef.current,
          behavior: options.behavior,
        });
      },
      [],
    ),
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToRow: (rowId: number) => {
        const index = tableRows.findIndex((r) => r.original.id === rowId);
        if (index !== -1)
          rowVirtualizer.scrollToIndex(index, { align: "center" });
      },
      clearSelection: () => setRowSelection({}),
    }),
    [tableRows, rowVirtualizer, setRowSelection],
  );

  useEffect(() => {
    rowVirtualizer.measure();
  }, [currentRowHeight, rowVirtualizer]);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const firstVirtualIndex = virtualItems[0]?.index ?? 0;
  const lastVirtualIndex = virtualItems[virtualItems.length - 1]?.index ?? 0;

  useEffect(() => {
    if (rows.length === 0) return;
    const id = setTimeout(() => {
      const firstPage = Math.floor(firstVirtualIndex / PAGE_SIZE);
      const lastPage = Math.floor(lastVirtualIndex / PAGE_SIZE);
      const maxPage = Math.ceil(rows.length / PAGE_SIZE) - 1;
      for (let p = firstPage; p <= Math.min(lastPage + 1, maxPage); p++) {
        onRequestPage(p);
      }
    }, 50);
    return () => clearTimeout(id);
  }, [firstVirtualIndex, lastVirtualIndex, onRequestPage, rows.length]);
  return {
    tableRowById,
    rowToSelectedColumns,
    rowVirtualizer,
    scrollScaleRef,
  };
}
