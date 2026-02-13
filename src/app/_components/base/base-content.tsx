"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { GridView } from "./grid-view";
import { ViewSidebar } from "./view-sidebar";
import { BaseHeader } from "./base-header";

interface Table {
  id: number;
  name: string;
  baseId: string;
}

interface BaseContentProps {
  baseId: string;
  tables: Table[];
  initialTableId: number;
  base: { id: string; name: string; icon: string };
  user: { name?: string | null; email?: string | null; image?: string | null };
}

type ToolbarDropdown =
  | "hideFields"
  | "filter"
  | "group"
  | "sort"
  | "rowHeight"
  | "search"
  | null;

export function BaseContent({
  baseId,
  tables: initialTables,
  initialTableId,
  base,
  user,
}: BaseContentProps) {
  const [activeTableId, setActiveTableId] = useState(initialTableId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<ToolbarDropdown>(null);
  const [hideFieldsSearch, setHideFieldsSearch] = useState("");
  const [sortSearch, setSortSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();

  // Fetch tables list (falls back to initial data from server)
  const tablesQuery = api.table.getAllByBase.useQuery(
    { baseId },
    { initialData: initialTables as never },
  );

  const tables = useMemo(() => {
    if (tablesQuery.data) {
      return (tablesQuery.data as Table[]).map((t) => ({
        id: t.id,
        name: t.name,
        baseId: t.baseId,
      }));
    }
    return initialTables;
  }, [tablesQuery.data, initialTables]);

  // Fetch active table details (columns, views)
  const tableQuery = api.table.getById.useQuery(
    { id: activeTableId },
    { enabled: !!activeTableId },
  );

  // Fetch rows with cursor-based pagination
  const rowsQuery = api.row.getRows.useInfiniteQuery(
    { tableId: activeTableId, limit: 50 },
    {
      enabled: !!activeTableId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Mutations
  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      void utils.row.getRows.invalidate({ tableId: activeTableId });
    },
  });

  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      void utils.table.getById.invalidate({ id: activeTableId });
      void utils.row.getRows.invalidate({ tableId: activeTableId });
    },
  });

  const updateCell = api.cell.update.useMutation();

  const createTable = api.table.create.useMutation({
    onSuccess: (newTable) => {
      void utils.table.getAllByBase.invalidate({ baseId });
      setActiveTableId(newTable.id);
    },
  });

  const deleteTable = api.table.delete.useMutation({
    onSuccess: () => {
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  // Flatten paginated rows
  const rows = useMemo(() => {
    if (!rowsQuery.data) return [];
    return rowsQuery.data.pages.flatMap((page) => page.rows);
  }, [rowsQuery.data]);

  // Map columns from table query
  const columns = useMemo(() => {
    if (!tableQuery.data) return [];
    return tableQuery.data.columns.map((col) => ({
      id: col.id,
      name: col.name,
      type: col.type,
      width: col.primary ? 250 : 200,
    }));
  }, [tableQuery.data]);

  // Map rows to GridView format — row.cells is already a JSONB object
  const gridRows = useMemo(() => {
    return rows.map((row) => ({
      id: row.id,
      cells: Object.fromEntries(
        columns.map((col) => {
          const val = (row.cells as Record<string, string | number | null>)[String(col.id)];
          return [col.id, val != null ? String(val) : ""];
        }),
      ),
    }));
  }, [rows, columns]);

  const handleCellUpdate = useCallback(
    (rowId: number, columnId: number, value: string) => {
      const col = tableQuery.data?.columns.find((c) => c.id === columnId);
      if (!col) return;

      if (col.type === "NUMBER") {
        const num = parseFloat(value);
        updateCell.mutate({
          rowId,
          columnId,
          value: isNaN(num) ? null : num,
        });
      } else {
        updateCell.mutate({
          rowId,
          columnId,
          value,
        });
      }
    },
    [tableQuery.data?.columns, updateCell],
  );

  const handleAddRow = useCallback(() => {
    createRow.mutate({ tableId: activeTableId });
  }, [activeTableId, createRow]);

  const handleAddColumn = useCallback(() => {
    createColumn.mutate({ tableId: activeTableId });
  }, [activeTableId, createColumn]);

  const handleTableChange = useCallback((tableId: number) => {
    setActiveTableId(tableId);
  }, []);

  const handleAddTable = useCallback(() => {
    createTable.mutate({ baseId });
  }, [baseId, createTable]);

  const handleDeleteTable = useCallback(
    (tableId: number) => {
      deleteTable.mutate(
        { id: tableId },
        {
          onSuccess: () => {
            // Switch to the first remaining table if we deleted the active one
            if (tableId === activeTableId) {
              const remaining = tables.filter((t) => t.id !== tableId);
              if (remaining.length > 0) {
                setActiveTableId(remaining[0]!.id);
              }
            }
          },
        },
      );
    },
    [activeTableId, deleteTable, tables],
  );

  const toggleDropdown = useCallback(
    (dropdown: ToolbarDropdown) => {
      if (activeDropdown === dropdown) {
        setActiveDropdown(null);
      } else {
        setActiveDropdown(dropdown);
        setHideFieldsSearch("");
        setSortSearch("");
        setGroupSearch("");
        setTableSearchQuery("");
      }
    },
    [activeDropdown],
  );

  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  // Auto-focus search input when search dropdown opens
  useEffect(() => {
    if (activeDropdown === "search" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeDropdown]);

  // Filter columns for hide fields / sort / group dropdowns
  const filteredHideColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(hideFieldsSearch.toLowerCase()),
  );
  const filteredSortColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(sortSearch.toLowerCase()),
  );
  const filteredGroupColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(groupSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header: top bar + table tabs */}
      <BaseHeader
        base={base}
        user={user}
        tables={tables}
        activeTableId={activeTableId}
        onTableChange={handleTableChange}
        onAddTable={handleAddTable}
        onDeleteTable={handleDeleteTable}
      />

      {/* Toolbar row: hamburger + grid view selector + field controls */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2">
        {/* Hamburger toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-md bg-none p-1.5 hover:bg-gray-100"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Grid view selector */}
        <div className="relative">
          <button
            onClick={() => setViewMenuOpen(!viewMenuOpen)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
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
                d="M3 10h18M3 14h18M3 6h18M3 18h18"
              />
            </svg>
            Grid view
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* View dropdown menu */}
          {viewMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setViewMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-40 mt-1 w-96 rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-lg">
                <div className="px-3 py-1.5 text-sm text-gray-500">
                  Collaborative view
                  <div className="text-xs text-gray-500">
                    Editors and up can edit the view configuration
                  </div>
                </div>

                <div className="mx-4 my-1 border-t border-gray-200" />
                <button
                  onClick={() => setViewMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Rename view
                </button>
                <button
                  onClick={() => setViewMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Edit view description
                </button>
                <div className="mx-4 my-1 border-t border-gray-200" />
                <button
                  onClick={() => setViewMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Duplicate view
                </button>
                <div className="mx-4 my-1 border-t border-gray-200" />
                <button
                  onClick={() => setViewMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </button>
                <button
                  onClick={() => setViewMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print view
                </button>
                <button
                  onClick={() => setViewMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete view
                </button>
              </div>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-gray-200" />

        {/* Right side - Field controls */}
        <div className="ml-auto flex items-center gap-1">
          {/* Hide fields */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("hideFields")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                activeDropdown === "hideFields"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Hide fields
            </button>

            {activeDropdown === "hideFields" && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeDropdown} />
                <div className="absolute right-0 top-full z-40 mt-1 w-72 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={hideFieldsSearch}
                        onChange={(e) => setHideFieldsSearch(e.target.value)}
                        placeholder="Find a field"
                        className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredHideColumns.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-9 items-center rounded-full bg-green-500 px-0.5">
                            <div className="h-4 w-4 translate-x-4 rounded-full bg-white shadow transition-transform" />
                          </div>
                          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                          </svg>
                          <span className="text-sm text-gray-700">{col.name}</span>
                        </div>
                        <svg className="h-4 w-4 cursor-grab text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex border-t border-gray-200 px-3 pt-2">
                    <button className="flex-1 rounded-md border border-gray-200 py-1 text-xs text-gray-600 hover:bg-gray-50">
                      Hide all
                    </button>
                    <button className="flex-1 rounded-md border border-gray-200 py-1 text-xs text-gray-600 hover:bg-gray-50 ml-2">
                      Show all
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("filter")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                activeDropdown === "filter"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </button>

            {activeDropdown === "filter" && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeDropdown} />
                <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-lg border border-gray-200 bg-white py-3 shadow-lg">
                  <div className="px-3 pb-2">
                    <h3 className="text-sm font-medium text-gray-900">Filter</h3>
                  </div>
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Describe what you want to see"
                        className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No filter conditions are applied
                  </div>
                  <div className="flex items-center gap-2 px-3 pt-1">
                    <button className="rounded-md border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                      + Add condition
                    </button>
                    <button className="rounded-md px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100">
                      + Add condition group
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Group */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("group")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                activeDropdown === "group"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Group
            </button>

            {activeDropdown === "group" && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeDropdown} />
                <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                  <div className="px-3 pb-2">
                    <h3 className="text-sm font-medium text-gray-900">Group by</h3>
                  </div>
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        placeholder="Find a field"
                        className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredGroupColumns.map((col) => (
                      <button
                        key={col.id}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("sort")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                activeDropdown === "sort"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort
            </button>

            {activeDropdown === "sort" && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeDropdown} />
                <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                  <div className="px-3 pb-2">
                    <h3 className="text-sm font-medium text-gray-900">Sort by</h3>
                  </div>
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={sortSearch}
                        onChange={(e) => setSortSearch(e.target.value)}
                        placeholder="Find a field"
                        className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredSortColumns.map((col) => (
                      <button
                        key={col.id}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Color */}
          <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Color
          </button>

          {/* Row height */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("rowHeight")}
              className={`rounded-md p-1 ${
                activeDropdown === "rowHeight"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>

            {activeDropdown === "rowHeight" && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeDropdown} />
                <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                  <div className="px-3 pb-1.5 text-xs font-medium text-gray-500">
                    Select a row height
                  </div>
                  {[
                    { label: "Short", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
                    { label: "Medium", icon: "M4 5h16M4 11h16M4 17h16" },
                    { label: "Tall", icon: "M4 4h16M4 12h16M4 20h16" },
                    { label: "Extra Tall", icon: "M4 3h16M4 13h16" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={closeDropdown}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-gray-50 ${
                        option.label === "Short" ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                      </svg>
                      {option.label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={closeDropdown}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16" />
                    </svg>
                    Wrap headers
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Share and sync */}
          <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share and sync
          </button>

          {/* Search */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("search")}
              className={`rounded-md p-1.5 ${
                activeDropdown === "search"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {activeDropdown === "search" && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeDropdown} />
                <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                  <div className="px-3">
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        placeholder="Search in this table..."
                        className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                      />
                      {tableSearchQuery && (
                        <button
                          onClick={() => setTableSearchQuery("")}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-3 py-2 text-xs text-gray-500">
                    Search across all fields in this view
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* View sidebar + Grid side by side */}
      <div className="flex flex-1 overflow-hidden">
        <ViewSidebar isOpen={isSidebarOpen} />

        {/* Grid View */}
        {tableQuery.isLoading || rowsQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        ) : (
          <GridView
            columns={columns}
            rows={gridRows}
            onCellUpdate={handleCellUpdate}
            onAddRow={handleAddRow}
            onAddColumn={handleAddColumn}
          />
        )}
      </div>

      {/* Footer: record count + add buttons */}
      <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3 py-1">
        <span className="text-xs text-gray-500">
          {gridRows.length} {gridRows.length === 1 ? "record" : "records"}
        </span>
      </div>
    </div>
  );
}
