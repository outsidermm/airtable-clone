"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "~/app/_components/ui/icons";
import { api } from "~/trpc/react";
import { useBase } from "../base-context";
import type { GridColumn } from "~/types/grid";
import type { FilterConfig } from "~/server/api/routers/view";

interface SearchDropdownProps {
  columns: GridColumn[];
  filters: FilterConfig[];
  onUpdateFilters: (filters: FilterConfig[], filterGroupLogic?: "AND" | "OR") => void;
  onScrollToRow?: (rowId: number) => void;
  onClose: () => void;
}

export function SearchDropdown({
  columns,
  filters,
  onUpdateFilters,
  onScrollToRow,
  onClose,
}: SearchDropdownProps) {
  const { activeTableId, setSearchQuery, setHighlightedCells, setActiveSearchCell} = useBase();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  // Snapshot the filters that existed before this search box was opened.
  // All search-derived filters are appended after this snapshot index.
  const initialFiltersRef = useRef<FilterConfig[]>(filters);

  // Always-current reference to apply a filter — avoids stale closure in the timeout
  const applyFilterRef = useRef<(value: string) => void>(() => undefined);
  applyFilterRef.current = (value: string) => {
    if (!columns.length) return;
    const numValue = parseFloat(value);
    const isValidNum = !isNaN(numValue) && value.trim() !== "";

    // Build one filter condition per visible column, matched to its data type.
    // The view is updated with OR logic so any column match shows the row.
    const searchFilters: FilterConfig[] = columns.reduce<FilterConfig[]>((acc, col) => {
      if (col.type === "NUMBER") {
        if (isValidNum) acc.push({ columnId: col.id, operator: "equals", value: numValue });
      } else {
        acc.push({ columnId: col.id, operator: "contains", value });
      }
      return acc;
    }, []);

    if (searchFilters.length === 0) return;
    onUpdateFilters([...initialFiltersRef.current, ...searchFilters], "OR");
  };

  // Debounce search — also applies a view filter when typing stops
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(0);
      if (query.trim()) {
        applyFilterRef.current(query.trim());
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const searchResults = api.cell.search.useQuery(
    { tableId: activeTableId, query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );

  // Derive matching cell locations from returned rows: each cell whose extracted
  // text contains the query (checked client-side since the server returns full rows).
  const matchingCells = useMemo(() => {
    const rows = searchResults.data?.rows;
    if (!rows || !debouncedQuery) return [];
    const lower = debouncedQuery.toLowerCase();
    const result: Array<{ rowId: number; columnId: number }> = [];
    for (const row of rows) {
      const cells = row.cells as Record<string, unknown>;
      for (const [colId, val] of Object.entries(cells)) {
        const strVal = typeof val === "string" ? val : typeof val === "number" ? String(val) : "";
        if (strVal.toLowerCase().includes(lower)) {
          result.push({ rowId: row.id, columnId: Number(colId) });
        }
      }
    }
    return result;
  }, [searchResults.data, debouncedQuery]);

  // Build highlight map from results and sync to context
  useEffect(() => {
    if (!searchResults.data || debouncedQuery.length === 0 || matchingCells.length === 0) {
      setHighlightedCells(new Map());
      setActiveSearchCell(undefined);
      setSearchQuery("");
      return;
    }

    const highlights = new Map<number, Set<number>>();
    for (const cell of matchingCells) {
      if (!highlights.has(cell.rowId)) {
        highlights.set(cell.rowId, new Set());
      }
      highlights.get(cell.rowId)!.add(cell.columnId);
    }

    setHighlightedCells(highlights);
    setActiveSearchCell(matchingCells[activeIndex]);
    setSearchQuery(debouncedQuery);
  }, [searchResults.data, debouncedQuery, matchingCells, activeIndex,
      setHighlightedCells, setActiveSearchCell, setSearchQuery]);

  const goToResult = useCallback(
    (index: number) => {
      const cell = matchingCells[index];
      if (cell) {
        setActiveIndex(index);
        onScrollToRow?.(cell.rowId);
      }
    },
    [matchingCells, onScrollToRow],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Immediately commit current query as a filter (bypasses the debounce timer)
        if (query.trim()) {
          if (timerRef.current) clearTimeout(timerRef.current);
          setDebouncedQuery(query);
          applyFilterRef.current(query.trim());
        }
        if (e.shiftKey) {
          goToResult(Math.max(0, activeIndex - 1));
        } else {
          goToResult(Math.min(matchingCells.length - 1, activeIndex + 1));
        }
      }
    },
    [query, activeIndex, matchingCells.length, goToResult],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clear highlights on unmount
  useEffect(() => {
    return () => {
      setHighlightedCells(new Map());
      setActiveSearchCell(undefined);
      setSearchQuery("");
    }
  }, [setHighlightedCells, setActiveSearchCell, setSearchQuery]);

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute top-full right-0 z-50 mt-1 flex w-80 items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 shadow-lg">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in view..."
          className="w-full flex-2 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
        />

        {debouncedQuery && (
          <div className="w-full flex-1 px-3 py-0.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              {matchingCells.length > 0 && (
                <div className="flex items-center gap-1">
                  <span>
                    {activeIndex + 1} of {matchingCells.length}
                  </span>
                  <button
                    onClick={() => goToResult(Math.max(0, activeIndex - 1))}
                    disabled={activeIndex <= 0}
                    className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronUpIcon className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      goToResult(
                        Math.min(matchingCells.length - 1, activeIndex + 1),
                      )
                    }
                    disabled={activeIndex >= matchingCells.length - 1}
                    className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {query && (
          <button
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setHighlightedCells(new Map());
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </>
  );
}
