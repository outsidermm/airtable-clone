"use client";

import { useState } from "react";
import type { GridColumn } from "~/types/grid";

interface HideFieldsDropdownProps {
  columns: GridColumn[];
  hiddenColumnIds: number[];
  onUpdateHiddenColumns: (ids: number[]) => void;
  onClose: () => void;
}

export function HideFieldsDropdown({
  columns,
  hiddenColumnIds,
  onUpdateHiddenColumns,
  onClose,
}: HideFieldsDropdownProps) {
  const [search, setSearch] = useState("");

  const filteredColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const hiddenSet = new Set(hiddenColumnIds);

  const toggleColumn = (colId: number) => {
    const col = columns.find((c) => c.id === colId);
    if (col?.primary) return; // Cannot hide primary

    const updated = hiddenSet.has(colId)
      ? hiddenColumnIds.filter((id) => id !== colId)
      : [...hiddenColumnIds, colId];
    onUpdateHiddenColumns(updated);
  };

  const hideAll = () => {
    const ids = columns.filter((c) => !c.primary).map((c) => c.id);
    onUpdateHiddenColumns(ids);
  };

  const showAll = () => {
    onUpdateHiddenColumns([]);
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute top-full right-0 z-40 mt-1 w-72 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
        <div className="px-3 pb-2">
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
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a field"
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filteredColumns.map((col) => {
            const isHidden = hiddenSet.has(col.id);
            const isVisible = !isHidden;

            return (
              <div
                key={col.id}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleColumn(col.id)}
                    disabled={col.primary}
                    className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
                      col.primary
                        ? "cursor-not-allowed bg-green-500 opacity-60"
                        : isVisible
                          ? "bg-green-500"
                          : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        isVisible ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
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
                      d={
                        col.type === "NUMBER"
                          ? "M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                          : "M4 6h16M4 12h16m-7 6h7"
                      }
                    />
                  </svg>
                  <span className="text-sm text-gray-700">{col.name}</span>
                  {col.primary && (
                    <span className="text-xs text-gray-400">(primary)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex border-t border-gray-200 px-3 pt-2">
          <button
            onClick={hideAll}
            className="flex-1 rounded-md border border-gray-200 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Hide all
          </button>
          <button
            onClick={showAll}
            className="ml-2 flex-1 rounded-md border border-gray-200 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Show all
          </button>
        </div>
      </div>
    </>
  );
}
