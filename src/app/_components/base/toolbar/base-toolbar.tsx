"use client";

import { useState, useCallback } from "react";
import type { GridColumn } from "~/types/grid";
import type { ViewConfig, FilterConfig, SortConfig } from "~/server/api/routers/view";
import { FilterDropdown } from "./filter-dropdown";
import { SortDropdown } from "./sort-dropdown";
import { HideFieldsDropdown } from "./hide-fields-dropdown";
import { SearchDropdown } from "./search-dropdown";

type ToolbarDropdown =
  | "hideFields"
  | "filter"
  | "group"
  | "sort"
  | "rowHeight"
  | "search"
  | null;

type RowHeightOption = "short" | "medium" | "tall" | "extraTall";

interface BaseToolbarProps {
  columns: GridColumn[];
  activeViewId: number | null;
  viewConfig: ViewConfig;
  tableId: number;
  onUpdateViewConfig: (config: ViewConfig) => void;
  onToggleSidebar: () => void;
  onSidebarHoverEnter?: () => void;
  onSidebarHoverLeave?: () => void;
  activeViewName: string;
  onHighlight: (cells: Map<number, Set<number>>, activeCell?: { rowId: number; columnId: number }, searchQuery?: string) => void;
  onScrollToRow?: (rowId: number) => void;
}

export function BaseToolbar({
  columns,
  viewConfig,
  tableId,
  onUpdateViewConfig,
  onToggleSidebar,
  onSidebarHoverEnter,
  onSidebarHoverLeave,
  activeViewName,
  onHighlight,
  onScrollToRow,
}: BaseToolbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<ToolbarDropdown>(null);

  const toggleDropdown = useCallback(
    (dropdown: ToolbarDropdown) => {
      setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
    },
    [activeDropdown],
  );

  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  const handleUpdateFilters = useCallback(
    (filters: FilterConfig[]) => {
      onUpdateViewConfig({ ...viewConfig, filters });
    },
    [viewConfig, onUpdateViewConfig],
  );

  const handleUpdateSorts = useCallback(
    (sorts: SortConfig[]) => {
      onUpdateViewConfig({ ...viewConfig, sorts });
    },
    [viewConfig, onUpdateViewConfig],
  );

  const handleUpdateHiddenColumns = useCallback(
    (ids: number[]) => {
      onUpdateViewConfig({ ...viewConfig, hiddenColumns: ids });
    },
    [viewConfig, onUpdateViewConfig],
  );

  const handleUpdateRowHeight = useCallback(
    (rowHeight: RowHeightOption) => {
      onUpdateViewConfig({ ...viewConfig, rowHeight });
      closeDropdown();
    },
    [viewConfig, onUpdateViewConfig, closeDropdown],
  );

  const filterCount = viewConfig.filters?.length ?? 0;
  const sortCount = viewConfig.sorts?.length ?? 0;
  const hiddenCount = viewConfig.hiddenColumns?.length ?? 0;
  const activeRowHeight: RowHeightOption = viewConfig.rowHeight ?? "short";

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2">
      {/* Hamburger toggle */}
      <button
        onClick={onToggleSidebar}
        onMouseEnter={onSidebarHoverEnter}
        onMouseLeave={onSidebarHoverLeave}
        className="rounded-md bg-none p-1.5 hover:bg-gray-100"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Grid view label */}
      <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
        </svg>
        {activeViewName}
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
                : hiddenCount > 0
                  ? "bg-yellow-50 text-yellow-700"
                  : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Hide fields
            {hiddenCount > 0 && (
              <span className="rounded-full bg-yellow-200 px-1.5 text-[10px] font-medium">{hiddenCount}</span>
            )}
          </button>
          {activeDropdown === "hideFields" && (
            <HideFieldsDropdown
              columns={columns}
              hiddenColumnIds={viewConfig.hiddenColumns ?? []}
              onUpdateHiddenColumns={handleUpdateHiddenColumns}
              onClose={closeDropdown}
            />
          )}
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("filter")}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
              activeDropdown === "filter"
                ? "bg-blue-50 text-blue-700"
                : filterCount > 0
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {filterCount > 0 && (
              <span className="rounded-full bg-green-200 px-1.5 text-[10px] font-medium">{filterCount}</span>
            )}
          </button>
          {activeDropdown === "filter" && (
            <FilterDropdown
              columns={columns}
              filters={viewConfig.filters ?? []}
              onUpdateFilters={handleUpdateFilters}
              onClose={closeDropdown}
            />
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
              <div className="absolute top-full right-0 z-40 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-3 shadow-lg">
                <div className="px-3 pb-2">
                  <h3 className="text-sm font-medium text-gray-900">Group by</h3>
                </div>
                <div className="px-3 py-2 text-sm text-gray-500">
                  No grouping applied
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
                : sortCount > 0
                  ? "bg-orange-50 text-orange-700"
                  : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Sort
            {sortCount > 0 && (
              <span className="rounded-full bg-orange-200 px-1.5 text-[10px] font-medium">{sortCount}</span>
            )}
          </button>
          {activeDropdown === "sort" && (
            <SortDropdown
              columns={columns}
              sorts={viewConfig.sorts ?? []}
              onUpdateSorts={handleUpdateSorts}
              onClose={closeDropdown}
            />
          )}
        </div>

        {/* Color */}
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Color
        </button>

        {/* Row height (icon only) */}
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
              <div className="absolute top-full right-0 z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                <div className="px-3 pb-1.5 text-xs font-medium text-gray-500">
                  Select a row height
                </div>
                {([
                  { label: "Short", value: "short" as RowHeightOption, icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
                  { label: "Medium", value: "medium" as RowHeightOption, icon: "M4 5h16M4 11h16M4 17h16" },
                  { label: "Tall", value: "tall" as RowHeightOption, icon: "M4 4h16M4 12h16M4 20h16" },
                  { label: "Extra Tall", value: "extraTall" as RowHeightOption, icon: "M4 3h16M4 13h16" },
                ]).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleUpdateRowHeight(option.value)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-gray-50 ${
                      activeRowHeight === option.value
                        ? "text-blue-600"
                        : "text-gray-700"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                    </svg>
                    {option.label}
                    {activeRowHeight === option.value && (
                      <svg className="ml-auto h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
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
            <SearchDropdown
              tableId={tableId}
              onHighlight={onHighlight}
              onScrollToRow={onScrollToRow}
              onClose={closeDropdown}
            />
          )}
        </div>
      </div>
    </div>
  );
}
