/**
 * useTableVirtualizer — scroll-scaled TanStack Virtual configuration for 1M-row grids.
 *
 * The scroll-scaling problem:
 * CSS layout engines cap element heights at ~33.5M pixels (MAX_SAFE_HEIGHT).
 * At 36px per row, this limit is hit at ~930k rows. Beyond that, setting the
 * container to `rows.length × rowHeight` pixels causes browser layout failure.
 * The solution is a scale factor: the DOM height is capped at MAX_SAFE_HEIGHT,
 * and a `scrollScaleRef` ratio (MAX_SAFE_HEIGHT / totalVirtualHeight) is applied
 * bidirectionally:
 * - `observeElementOffset` divides raw scrollTop by the scale, so the virtualizer
 * operates in unscaled coordinate space (same as if the DOM were full-height).
 * - `scrollToFn` multiplies the requested offset before calling element.scrollTo(),
 * mapping virtualizer coordinates back to real CSS pixels.
 *
 * Dynamic Overscan:
 * Because TanStack uses the physical `clientHeight` to determine how many items to render,
 * scaling the container < 1 means the virtualizer renders fewer items than the physical
 * viewport actually requires. We calculate this "compression gap" dynamically and pad
 * the `overscan` value to prevent a permanent empty gap from flickering at the bottom.
 */

import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import {
  useMemo,
  useRef,
  useCallback,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import { PAGE_SIZE, MAX_SAFE_HEIGHT } from "../constants";
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
  // Force a re-render after mount so the parentRef is attached and the virtualizer
  // can read the scroll container's real dimensions on the first layout pass.
  const [, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const tableRows = table.getRowModel().rows;
  const totalVirtualHeight = rows.length * currentRowHeight;

  // scrollScaleRef is written on every render (not in a useEffect) so it is always
  // current when observeElementOffset / scrollToFn read it during scroll events.
  const scrollScaleRef = useRef(1);
  scrollScaleRef.current =
    totalVirtualHeight > MAX_SAFE_HEIGHT
      ? MAX_SAFE_HEIGHT / totalVirtualHeight
      : 1;

  // Dynamically calculate overscan to compensate for the scaled-down physical viewport.
  // When scale < 1, 1 physical pixel covers >1 virtual pixel, leading the virtualizer
  // to render too few rows for the physical screen size. This calculates exactly how
  // many extra rows are needed to fill that invisible gap.
  const clientHeight =
    parentRef.current?.clientHeight ??
    (typeof window !== "undefined" ? window.innerHeight : 1000);

  const viewportItemGap =
    scrollScaleRef.current < 1
      ? Math.ceil(
          (clientHeight / scrollScaleRef.current - clientHeight) /
            currentRowHeight,
        )
      : 0;

  const calculatedOverscan = Math.min(250, Math.max(5, viewportItemGap + 5));

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
    overscan: calculatedOverscan,
    observeElementOffset: useCallback(
      (
        instance: Virtualizer<HTMLDivElement, Element>,
        cb: (offset: number, isScrolling: boolean) => void,
      ) => {
        const el = instance.scrollElement as HTMLElement | null;
        if (!el) return;

        const onScroll = () => {
          const scale = scrollScaleRef.current;

          // 1. Calculate the raw unscaled offset
          let unscaledOffset = el.scrollTop / scale;

          // 2. Correct coordinate space clamp:
          // We must scale the physical viewport height UP to virtual space before subtracting.
          const unscaledClientHeight = el.clientHeight / scale;
          const maxUnscaledOffset = totalVirtualHeight - unscaledClientHeight;

          // 3. Clamp the value to prevent floating-point overshoot flickering
          // when scrolling perfectly into the 125px padding or header.
          if (maxUnscaledOffset > 0 && unscaledOffset > maxUnscaledOffset) {
            unscaledOffset = maxUnscaledOffset;
          }

          cb(unscaledOffset, false);
        };

        onScroll();
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
      },
      [totalVirtualHeight],
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

  // Debounced prefetch: coalesces burst scroll events into a single batch request
  // window. The +1 lookahead page loads the next page before the user reaches it.
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
