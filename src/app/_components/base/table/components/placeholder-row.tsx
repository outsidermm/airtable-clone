"use client";
import type { VirtualItem } from "@tanstack/react-virtual";
import type { GridColumn } from "~/types/grid";

interface PlaceholderRowProps {
  virtualRow: VirtualItem;
  virtualStart: number;
  currentRowHeight: number;
  frozenWidth: number;
  totalScrollableWidth: number;
  nonPrimaryColumns: GridColumn[];
  columnSizing: Record<string, number>;
}

export function PlaceholderRow({
  virtualRow,
  virtualStart,
  currentRowHeight,
  frozenWidth,
  totalScrollableWidth,
  nonPrimaryColumns,
  columnSizing,
}: PlaceholderRowProps) {
  return (
    // role="row" + aria-busy keeps placeholder rows in the grid's ARIA model
    // while signalling to AT that content is still loading for this index.
    <div
      key={`placeholder-${virtualRow.index}`}
      role="row"
      aria-rowindex={virtualRow.index + 1}
      aria-busy="true"
      className="absolute flex w-full border-b border-gray-200 bg-white"
      style={{
        top: virtualStart,
        height: currentRowHeight,
        minWidth: "fit-content",
      }}
    >
      <div
        role="none"
        className="sticky left-0 z-10 flex shrink-0 items-center border-r-2 border-gray-300"
        style={{ width: frozenWidth }}
      >
        <div aria-hidden="true" className="flex h-full w-8.5 items-center justify-center">
          <div className="h-3 w-5 animate-pulse rounded bg-gray-100" />
        </div>
        <div aria-hidden="true" className="flex-1 px-2">
          <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div role="none" className="flex" style={{ width: totalScrollableWidth }}>
        {nonPrimaryColumns.map((col) => (
          <div
            key={col.id}
            aria-hidden="true"
            className="flex items-center border-r border-gray-200 px-2"
            style={{
              width: columnSizing[String(col.id)] ?? col.width,
            }}
          >
            <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
