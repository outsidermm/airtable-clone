"use client";

import { useState, useCallback } from "react";
import type { SortConfig } from "~/server/api/routers/view";
import type { GridColumn } from "~/types/grid";

interface SortDropdownProps {
  columns: GridColumn[];
  sorts: SortConfig[];
  onUpdateSorts: (sorts: SortConfig[]) => void;
  onClose: () => void;
}

export function SortDropdown({
  columns,
  sorts,
  onUpdateSorts,
  onClose,
}: SortDropdownProps) {
  const [localSorts, setLocalSorts] = useState<SortConfig[]>(sorts);

  const addSort = useCallback(() => {
    // Pick first column not already sorted
    const usedIds = new Set(localSorts.map((s) => s.columnId));
    const available = columns.find((c) => !usedIds.has(c.id));
    if (!available) return;

    const newSort: SortConfig = {
      columnId: available.id,
      direction: "asc",
    };
    const updated = [...localSorts, newSort];
    setLocalSorts(updated);
    onUpdateSorts(updated);
  }, [columns, localSorts, onUpdateSorts]);

  const updateSort = useCallback(
    (index: number, patch: Partial<SortConfig>) => {
      const updated = localSorts.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      );
      setLocalSorts(updated);
      onUpdateSorts(updated);
    },
    [localSorts, onUpdateSorts],
  );

  const removeSort = useCallback(
    (index: number) => {
      const updated = localSorts.filter((_, i) => i !== index);
      setLocalSorts(updated);
      onUpdateSorts(updated);
    },
    [localSorts, onUpdateSorts],
  );

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute top-full right-0 z-40 mt-1 w-80 rounded-lg border border-gray-200 bg-white py-3 shadow-lg">
        <div className="px-3 pb-2">
          <h3 className="text-sm font-medium text-gray-900">Sort by</h3>
        </div>

        {localSorts.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">
            No sort rules are applied
          </div>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto px-3">
            {localSorts.map((sort, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="shrink-0 text-xs text-gray-500">
                  {index === 0 ? "Sort by" : "then by"}
                </span>

                {/* Column select */}
                <select
                  value={sort.columnId}
                  onChange={(e) =>
                    updateSort(index, { columnId: Number(e.target.value) })
                  }
                  className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-700"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Direction */}
                <button
                  onClick={() =>
                    updateSort(index, {
                      direction: sort.direction === "asc" ? "desc" : "asc",
                    })
                  }
                  className="flex items-center gap-1 rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        sort.direction === "asc"
                          ? "M5 15l7-7 7 7"
                          : "M19 9l-7 7-7-7"
                      }
                    />
                  </svg>
                  {sort.direction === "asc" ? "A-Z" : "Z-A"}
                </button>

                {/* Remove */}
                <button
                  onClick={() => removeSort(index)}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
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
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 px-3 pt-2">
          <button
            onClick={addSort}
            disabled={localSorts.length >= columns.length}
            className="rounded-md border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            + Add sort
          </button>
        </div>
      </div>
    </>
  );
}
