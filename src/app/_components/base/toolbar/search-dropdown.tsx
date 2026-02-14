"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { api } from "~/trpc/react";

interface SearchDropdownProps {
  tableId: number;
  onHighlight: (cells: Map<number, Set<number>>) => void;
  onScrollToRow?: (rowId: number) => void;
  onClose: () => void;
}

export function SearchDropdown({
  tableId,
  onHighlight,
  onScrollToRow,
  onClose,
}: SearchDropdownProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  // Debounce search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(0);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const searchResults = api.cell.search.useQuery(
    { tableId, query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );

  // Build highlight map from results
  useEffect(() => {
    if (!searchResults.data || debouncedQuery.length === 0) {
      onHighlight(new Map());
      return;
    }

    const highlights = new Map<number, Set<number>>();
    for (const row of searchResults.data) {
      const cells = row.cells as Record<string, string | number | null>;
      const matchingCols = new Set<number>();
      for (const [key, value] of Object.entries(cells)) {
        if (
          value != null &&
          String(value)
            .toLowerCase()
            .includes(debouncedQuery.toLowerCase())
        ) {
          matchingCols.add(Number(key));
        }
      }
      if (matchingCols.size > 0) {
        highlights.set(row.id, matchingCols);
      }
    }
    onHighlight(highlights);
  }, [searchResults.data, debouncedQuery, onHighlight]);

  const resultRows = useMemo(() => searchResults.data ?? [], [searchResults.data]);

  // Count total matching cells
  const totalCellCount = useMemo(() => {
    if (!searchResults.data || debouncedQuery.length === 0) return 0;
    let count = 0;
    for (const row of searchResults.data) {
      const cells = row.cells as Record<string, string | number | null>;
      for (const [, value] of Object.entries(cells)) {
        if (
          value != null &&
          String(value).toLowerCase().includes(debouncedQuery.toLowerCase())
        ) {
          count++;
        }
      }
    }
    return count;
  }, [searchResults.data, debouncedQuery]);

  const goToResult = useCallback(
    (index: number) => {
      if (resultRows[index]) {
        setActiveIndex(index);
        onScrollToRow?.(resultRows[index].id);
      }
    },
    [resultRows, onScrollToRow],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          goToResult(Math.max(0, activeIndex - 1));
        } else {
          goToResult(Math.min(resultRows.length - 1, activeIndex + 1));
        }
      }
    },
    [activeIndex, resultRows.length, goToResult],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clear highlights on unmount
  useEffect(() => {
    return () => onHighlight(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute top-full right-0 z-40 mt-1 w-80 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
        <div className="px-3">
          <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
            <svg
              className="h-3.5 w-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search in this table..."
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                  onHighlight(new Map());
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {debouncedQuery && (
          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {searchResults.isLoading
                  ? "Searching..."
                  : `${totalCellCount} cell${totalCellCount === 1 ? "" : "s"}`}
              </span>
              {resultRows.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      goToResult(Math.max(0, activeIndex - 1))
                    }
                    disabled={activeIndex <= 0}
                    className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <span>
                    {activeIndex + 1}/{resultRows.length}
                  </span>
                  <button
                    onClick={() =>
                      goToResult(
                        Math.min(resultRows.length - 1, activeIndex + 1),
                      )
                    }
                    disabled={activeIndex >= resultRows.length - 1}
                    className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
