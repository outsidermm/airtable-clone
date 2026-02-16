"use client";

import { useState } from "react";
import { NumberIcon, QuestionIcon, TextIcon } from "~/components/icons";
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

  const filteredColumns = columns.filter((c) => {
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) && c.primary === false
    );
  });

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
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute top-full right-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-md border-b border-gray-200 px-2 py-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a field"
              className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
              autoFocus
            />
            <QuestionIcon className="h-3.5 w-3.5 text-gray-400" />
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
                    className={`flex h-2 w-3 items-center rounded-full px-0.5 transition-colors ${
                      isVisible ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`h-1 w-1 rounded-full bg-white shadow transition-transform ${
                        isVisible ? "translate-x-1" : "translate-x-0"
                      }`}
                    />
                  </button>
                  {col.type === "NUMBER" ? (
                    <NumberIcon className="h-3 w-3 text-gray-400" />
                  ) : (
                    <TextIcon className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-700">{col.name}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex px-3 pt-2">
          <button
            onClick={hideAll}
            className="flex-1 rounded bg-gray-100 py-1 text-xs text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-800"
          >
            Hide all
          </button>
          <button
            onClick={showAll}
            className="ml-2 flex-1 rounded bg-gray-100 py-1 text-xs text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-800"
          >
            Show all
          </button>
        </div>
      </div>
    </>
  );
}
