"use client";

import { useState, useCallback } from "react";
import type { GridColumn } from "~/types/grid";
import type {
  ViewConfig,
  FilterConfig,
  SortConfig,
} from "~/server/api/routers/view";
import { FilterDropdown } from "./filter-dropdown";
import { SortDropdown } from "./sort-dropdown";
import { HideFieldsDropdown } from "./hide-fields-dropdown";
import { SearchDropdown } from "./search-dropdown";
import { api } from "~/trpc/react";
import {
  MenuIcon,
  GridIcon,
  ChevronDownIcon,
  UsersIcon,
  UserIcon,
  HideIcon,
  PlusIcon,
  FilterIcon,
  GroupIcon,
  SortIcon,
  ColorIcon,
  ShareIcon,
  SearchIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon,
  GalleryIcon,
  DownloadIcon,
  PrintIcon,
  DuplicateIcon,
  ClipboardIcon,
} from "~/components/icons";

type ToolbarDropdown =
  | "hideFields"
  | "filter"
  | "group"
  | "sort"
  | "rowHeight"
  | "search"
  | "viewMenu"
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
  onHighlight: (
    cells: Map<number, Set<number>>,
    activeCell?: { rowId: number; columnId: number },
    searchQuery?: string,
  ) => void;
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
  const [isSeeding, setIsSeeding] = useState(false);

  const utils = api.useUtils();
  const bulkCreateMutation = api.row.bulkCreate.useMutation({
    onMutate: () => {
      setIsSeeding(true);
    },
    onSuccess: (data) => {
      setIsSeeding(false);
      // Invalidate row queries to refetch with new data
      void utils.row.getRows.invalidate({ tableId });
      void utils.view.getData.invalidate();
      alert(`Successfully created ${data.count.toLocaleString()} rows!`);
    },
    onError: (error) => {
      setIsSeeding(false);
      alert(`Failed to create rows: ${error.message}`);
    },
  });

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

  const handleBulkSeed = useCallback(
    (count: number) => {
      if (isSeeding) return;
      bulkCreateMutation.mutate({ tableId, count });
    },
    [tableId, bulkCreateMutation, isSeeding],
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
        <MenuIcon className="h-4 w-4" />
      </button>

      {/* Grid view label */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown("viewMenu")}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ${
            activeDropdown === "viewMenu"
              ? "bg-blue-50 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <GridIcon className="h-3.5 w-3.5" />
          {activeViewName}
          <ChevronDownIcon className="h-3 w-3" />
        </button>

        {/* View menu dropdown */}
        {activeDropdown === "viewMenu" && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeDropdown} />
            <div className="absolute top-full left-0 z-40 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <UsersIcon className="h-4 w-4" />
                Collaborative view
              </button>
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <UserIcon className="h-4 w-4" />
                Assign as personal view
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4" />
                Rename view
              </button>
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <GalleryIcon className="h-4 w-4" />
                Edit view description
              </button>
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <DuplicateIcon className="h-4 w-4" />
                Duplicate view
              </button>
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ClipboardIcon className="h-4 w-4" />
                Copy another views configuration
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <DownloadIcon className="h-4 w-4" />
                Download csv
              </button>
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <PrintIcon className="h-4 w-4" />
                Print view
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                <TrashIcon className="h-4 w-4" />
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
                : hiddenCount > 0
                  ? "bg-yellow-50 text-yellow-700"
                  : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <HideIcon className="h-3.5 w-3.5" />
            Hide fields
            {hiddenCount > 0 && (
              <span className="rounded-full bg-yellow-200 px-1.5 text-[10px] font-medium">
                {hiddenCount}
              </span>
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

        {/* Bulk Seed Buttons */}
        <button
          onClick={() => handleBulkSeed(1000)}
          disabled={isSeeding}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Add 1,000 rows"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          +1K
        </button>

        <button
          onClick={() => handleBulkSeed(100000)}
          disabled={isSeeding}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Add 100,000 rows"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          +100K
        </button>

        <button
          onClick={() => handleBulkSeed(1000000)}
          disabled={isSeeding}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Add 1,000,000 rows"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          +1M
        </button>

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
            <FilterIcon className="h-3.5 w-3.5" />
            Filter
            {filterCount > 0 && (
              <span className="rounded-full bg-green-200 px-1.5 text-[10px] font-medium">
                {filterCount}
              </span>
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
            <GroupIcon className="h-3.5 w-3.5" />
            Group
          </button>
          {activeDropdown === "group" && (
            <>
              <div className="fixed inset-0 z-30" onClick={closeDropdown} />
              <div className="absolute top-full right-0 z-40 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-3 shadow-lg">
                <div className="px-3 pb-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    Group by
                  </h3>
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
            <SortIcon className="h-3.5 w-3.5" />
            Sort
            {sortCount > 0 && (
              <span className="rounded-full bg-orange-200 px-1.5 text-[10px] font-medium">
                {sortCount}
              </span>
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
          <ColorIcon className="h-3.5 w-3.5" />
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
            <GroupIcon className="h-3.5 w-3.5" />
          </button>
          {activeDropdown === "rowHeight" && (
            <>
              <div className="fixed inset-0 z-30" onClick={closeDropdown} />
              <div className="absolute top-full right-0 z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                <div className="px-3 pb-1.5 text-xs font-medium text-gray-500">
                  Select a row height
                </div>
                {[
                  {
                    label: "Short",
                    value: "short" as RowHeightOption,
                  },
                  {
                    label: "Medium",
                    value: "medium" as RowHeightOption,
                  },
                  {
                    label: "Tall",
                    value: "tall" as RowHeightOption,
                  },
                  {
                    label: "Extra Tall",
                    value: "extraTall" as RowHeightOption,
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleUpdateRowHeight(option.value)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-gray-50 ${
                      activeRowHeight === option.value
                        ? "text-blue-600"
                        : "text-gray-700"
                    }`}
                  >
                    <GroupIcon className="h-4 w-4" />
                    {option.label}
                    {activeRowHeight === option.value && (
                      <CheckIcon className="ml-auto h-3.5 w-3.5" />
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
          <ShareIcon className="h-3.5 w-3.5" />
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
            <SearchIcon className="h-4 w-4" />
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
