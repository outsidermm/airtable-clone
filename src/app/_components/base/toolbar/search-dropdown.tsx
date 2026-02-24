"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  XIcon,
} from "~/app/_components/ui/icons";
import { api } from "~/trpc/react";
import { useBase } from "../base-context";
import type { GridColumn } from "~/types/grid";
import type { FilterConfig } from "~/server/api/routers/view";
import { Popover } from "../../ui/popover";

interface SearchDropdownProps {
  columns: GridColumn[];
  filters: FilterConfig[];
  onUpdateFilters: (
    filters: FilterConfig[],
    filterGroupLogic?: "AND" | "OR",
  ) => void;
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
  const { activeTableId } = useBase();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  const initialFiltersRef = useRef<FilterConfig[]>(filters);

  const applyFilterRef = useRef<(value: string) => void>(() => undefined);
  applyFilterRef.current = (value: string) => {
    if (!columns.length) return;
    const numValue = parseFloat(value);
    const isValidNum = !isNaN(numValue) && value.trim() !== "";

    const searchFilters: FilterConfig[] = columns.reduce<FilterConfig[]>(
      (acc, col) => {
        if (col.type === "NUMBER") {
          if (isValidNum)
            acc.push({ columnId: col.id, operator: "equals", value: numValue });
        } else {
          acc.push({ columnId: col.id, operator: "contains", value });
        }
        return acc;
      },
      [],
    );

    if (searchFilters.length === 0) return;
    onUpdateFilters([...initialFiltersRef.current, ...searchFilters], "OR");
  };

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

  const matchingCells = useMemo(() => {
    const rows = searchResults.data?.rows;
    if (!rows || !debouncedQuery) return [];
    const lower = debouncedQuery.toLowerCase();
    const result: Array<{ rowId: number; columnId: number }> = [];
    for (const row of rows) {
      const cells = row.cells as Record<string, unknown>;
      for (const [colId, val] of Object.entries(cells)) {
        const strVal =
          typeof val === "string"
            ? val
            : typeof val === "number"
              ? String(val)
              : "";
        if (strVal.toLowerCase().includes(lower)) {
          result.push({ rowId: row.id, columnId: Number(colId) });
        }
      }
    }
    return result;
  }, [searchResults.data, debouncedQuery]);

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

  return (
    <Popover
      onClose={onClose}
      align="right"
      className="flex h-10 w-96 items-center justify-between gap-3 px-4 py-2"
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in view..."
        className="h-full flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
      />

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex w-10 items-center justify-end">
          {debouncedQuery && matchingCells.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] leading-none text-gray-500">
              <span className="whitespace-nowrap">
                {activeIndex + 1} of {matchingCells.length}
              </span>

              <div className="flex gap-1">
                <button
                  onClick={() =>
                    setActiveIndex(
                      (activeIndex - 1 + matchingCells.length) %
                        matchingCells.length,
                    )
                  }
                  className="rounded p-0.5 hover:bg-gray-100"
                >
                  <ChevronUpIcon className="h-3 w-3" />
                </button>

                <button
                  onClick={() =>
                    setActiveIndex((activeIndex + 1) % matchingCells.length)
                  }
                  className="rounded p-0.5 hover:bg-gray-100"
                >
                  <ChevronDownIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="rounded-md bg-black px-2 py-1 text-xs whitespace-nowrap text-white">
          Ask Omni
        </button>

        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </Popover>
  );
}
