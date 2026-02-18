"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  NumberIcon,
  PlusIcon,
  QuestionIcon,
  SearchIcon,
  TextIcon,
  XIcon,
} from "~/app/_components/ui/icons";
import type { SortConfig } from "~/server/api/routers/view";
import type { GridColumn } from "~/types/grid";

interface SortDropdownProps {
  columns: GridColumn[];
  sorts: SortConfig[];
  onUpdateSorts: (sorts: SortConfig[]) => void;
  onClose: () => void;
}

interface ColumnPickerMenuProps {
  columns: GridColumn[];
  onSelect: (id: number) => void;
  onClose: () => void;
  localSorts: LocalSortConfig[]; // To filter out already selected columns
}

// Internal type to handle the "unselected" state locally
type LocalSortConfig = {
  columnId: number | null;
  direction: "asc" | "desc";
};

export function SortDropdown({
  columns,
  sorts,
  onUpdateSorts,
  onClose,
}: SortDropdownProps) {
  // Initialize with existing sorts, or empty array
  const [localSorts, setLocalSorts] = useState<LocalSortConfig[]>(sorts);

  // Track which dropdown menu is currently open: { index: 0, type: 'column' | 'direction' }
  const [openMenu, setOpenMenu] = useState<{
    index: number;
    type: "column" | "direction";
  } | null>(null);

  // Search state for the "Empty State" initial view
  const [globalSearch, setGlobalSearch] = useState("");

  // Helper: Filter columns for the initial empty state
  const filteredGlobalColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(globalSearch.toLowerCase()),
  );

  // 1. ADD SORT: Handles both "Click from list" (withId) and "Add Another" (no Id)
  const addSort = useCallback(
    (columnId?: number) => {
      const newSort: LocalSortConfig = {
        columnId: columnId ?? null, // specific ID or null if "Add another"
        direction: "asc",
      };

      const updated = [...localSorts, newSort];
      setLocalSorts(updated);

      // Only notify parent if the sort is valid (has a columnId)
      if (columnId) {
        onUpdateSorts(updated as SortConfig[]);
      } else {
        // If we added an empty row, automatically open its column selector
        setOpenMenu({ index: updated.length - 1, type: "column" });
      }
    },
    [localSorts, onUpdateSorts],
  );

  // 2. UPDATE SORT: Patches a specific row
  const updateSort = useCallback(
    (index: number, patch: Partial<LocalSortConfig>) => {
      const updated = localSorts.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      );
      setLocalSorts(updated);

      // Filter out incomplete sorts before sending to parent
      const validSorts = updated.filter(
        (s) => s.columnId !== null,
      ) as SortConfig[];

      onUpdateSorts(validSorts);

      // Close menus on selection
      setOpenMenu(null);
    },
    [localSorts, onUpdateSorts],
  );

  // 3. REMOVE SORT
  const removeSort = useCallback(
    (index: number) => {
      const updated = localSorts.filter((_, i) => i !== index);
      setLocalSorts(updated);

      const validSorts = updated.filter(
        (s) => s.columnId !== null,
      ) as SortConfig[];
      onUpdateSorts(validSorts);
    },
    [localSorts, onUpdateSorts],
  );

  // Helper to get Label for Direction
  const getDirectionLabel = (colId: number | null, dir: "asc" | "desc") => {
    if (!colId) return "Ascending";
    const col = columns.find((c) => c.id === colId);
    if (col?.type === "NUMBER") return dir === "asc" ? "1 → 9" : "9 → 1";
    return dir === "asc" ? "A → Z" : "Z → A";
  };

  return (
    <>
      {/* Backdrop to close everything */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      <div className="absolute top-full right-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white pt-3 pb-2 shadow-lg">
        {/* Header */}
        <div className="mx-3 flex flex-row items-center gap-1 border-b border-gray-100 pb-2">
          <h3 className="text-sm text-gray-900">Sort by</h3>
          <QuestionIcon className="ml-1 inline h-3.5 w-3.5 text-gray-400" />
        </div>

        {/* --- STATE A: NO SORTS (Search List) --- */}
        {localSorts.length === 0 ? (
          <div className="px-3 text-sm text-gray-500">
            <div className="mt-1 flex max-h-3/4 flex-col items-start justify-center gap-1 overflow-y-visible rounded px-2 py-1.5">
              <div className="mb-1 flex w-full flex-row items-center gap-2">
                <SearchIcon className="h-3.5 w-3.5 text-blue-300" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Find a field"
                  className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                  autoFocus
                />
              </div>
              {filteredGlobalColumns.map((col) => (
                <button
                  key={col.id}
                  onClick={() => addSort(col.id)} // Pass ID directly
                  className="flex w-full items-center gap-1.5 rounded px-1 py-1 hover:bg-gray-50"
                >
                  {col.type === "NUMBER" ? (
                    <NumberIcon className="h-3.5 w-3.5 text-gray-400" />
                  ) : (
                    <TextIcon className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-700">{col.name}</span>
                </button>
              ))}
              {filteredGlobalColumns.length === 0 && (
                <span className="py-2 text-xs text-gray-400">
                  No fields found
                </span>
              )}
            </div>
          </div>
        ) : (
          /* --- STATE B: LIST OF SORTS --- */
          <div className="mt-3 max-h-3/4 overflow-y-visible px-3 pb-1">
            <div className="space-y-3">
              {localSorts.map((sort, index) => {
                const selectedColumn = columns.find(
                  (c) => c.id === sort.columnId,
                );

                return (
                  <div
                    key={index}
                    className="flex w-full items-center justify-between gap-2"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      {/* --- Custom Column Dropdown --- */}
                      <div className="relative flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(
                              openMenu?.index === index &&
                                openMenu.type === "column"
                                ? null
                                : { index, type: "column" },
                            );
                          }}
                          className="flex w-full items-center justify-between rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <span className="truncate">
                            {selectedColumn
                              ? selectedColumn.name
                              : "Select a field..."}
                          </span>
                          <ChevronDownIcon className="ml-1 h-2 w-2 text-gray-400" />
                        </button>

                        {/* Column Menu Popup */}
                        {openMenu?.index === index &&
                          openMenu.type === "column" && (
                            <ColumnPickerMenu
                              columns={columns}
                              onSelect={(colId) =>
                                updateSort(index, { columnId: colId })
                              }
                              onClose={() => setOpenMenu(null)}
                              localSorts={localSorts}
                            />
                          )}
                      </div>

                      {/* --- Custom Direction Dropdown --- */}
                      {/* Only show direction if a column is selected */}
                      {sort.columnId !== null && (
                        <div className="relative w-24 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenu(
                                openMenu?.index === index &&
                                  openMenu.type === "direction"
                                  ? null
                                  : { index, type: "direction" },
                              );
                            }}
                            className="flex w-full items-center justify-between rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            <span>
                              {getDirectionLabel(sort.columnId, sort.direction)}
                            </span>
                            <ChevronDownIcon className="h-2 w-2 text-gray-500" />
                          </button>

                          {/* Direction Menu Popup */}
                          {openMenu?.index === index &&
                            openMenu.type === "direction" && (
                              <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-xl">
                                <button
                                  onClick={() =>
                                    updateSort(index, { direction: "asc" })
                                  }
                                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-gray-50"
                                >
                                  <span>
                                    {getDirectionLabel(sort.columnId, "asc")}
                                  </span>
                                </button>
                                <button
                                  onClick={() =>
                                    updateSort(index, { direction: "desc" })
                                  }
                                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-gray-50"
                                >
                                  <span>
                                    {getDirectionLabel(sort.columnId, "desc")}
                                  </span>
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeSort(index)}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add Another Sort Button */}
            <div className="mt-2 flex items-center gap-2 pt-2">
              <button
                onClick={() => addSort(undefined)} // Pass undefined for empty row
                disabled={localSorts.length >= columns.length}
                className="flex items-center rounded px-1 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <PlusIcon className="mr-1 h-3.5 w-3.5" />
                Add another sort
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// --- Sub-component for the searchable column menu ---
function ColumnPickerMenu({
  columns,
  onSelect,
  onClose,
  localSorts,
}: ColumnPickerMenuProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = columns.filter((c) => {
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      localSorts.every((s) => s.columnId !== c.id)
    );
  });

  return (
    <>
      {/* Click outside listener specifically for this menu level */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute top-full left-0 z-80 mt-1 w-48 rounded-md border border-gray-200 bg-white p-1 shadow-xl">
        <div className="mb-1 flex items-center gap-2 border-b border-gray-100 px-2 pb-1">
          <SearchIcon className="h-3 w-3 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-40 overflow-y-auto">
          {filtered.map((col) => (
            <button
              key={col.id}
              onClick={() => onSelect(col.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
            >
              {col.type === "NUMBER" ? (
                <NumberIcon className="h-3 w-3 text-gray-400" />
              ) : (
                <TextIcon className="h-3 w-3 text-gray-400" />
              )}
              <span className="truncate">{col.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-gray-400">No fields</div>
          )}
        </div>
      </div>
    </>
  );
}
