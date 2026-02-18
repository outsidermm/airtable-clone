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
  HideIcon,
  PlusIcon,
  FilterIcon,
  GroupIcon,
  SortIcon,
  ColorIcon,
  ShareIcon,
  SearchIcon,
  TrashIcon,
  PencilIcon,
  GalleryIcon,
  DownloadIcon,
  PrintIcon,
  DuplicateIcon,
  ChevronRightIcon,
  RowHeightShortIcon,
} from "~/app/_components/ui/icons";
import { useViewMutations } from "../../hooks/use-view-mutations";
import type { RowHeightOption } from "~/types/row";
import { RowHeightDropdown } from "./row-height-dropdown";
import { useBase } from "../base-context";

type ToolbarDropdown =
  | "hideFields"
  | "filter"
  | "group"
  | "sort"
  | "rowHeight"
  | "search"
  | "viewMenu"
  | null;

interface BaseToolbarProps {
  columns: GridColumn[];
  viewCount: number;
  viewConfig: ViewConfig;
  onToggleSidebar: () => void;
  onSidebarHoverEnter?: () => void;
  onSidebarHoverLeave?: () => void;
  activeViewName: string;
  onScrollToRow?: (rowId: number) => void;
}

export function BaseToolbar({
  columns,
  viewCount,
  viewConfig,
  onToggleSidebar,
  onSidebarHoverEnter,
  onSidebarHoverLeave,
  activeViewName,
  onScrollToRow,
}: BaseToolbarProps) {
  const { activeTableId, activeViewId, setActiveViewId } = useBase();
  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );
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
      void utils.row.getRows.invalidate({ tableId: activeTableId });
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
      if (!activeViewId) return;
      viewMutations.handleUpdateView(activeViewId, { ...viewConfig, filters });
    },
    [viewConfig, viewMutations, activeViewId],
  );

  const handleUpdateSorts = useCallback(
    (sorts: SortConfig[]) => {
      if (!activeViewId) return;
      viewMutations.handleUpdateView(activeViewId, { ...viewConfig, sorts });
    },
    [viewConfig, viewMutations, activeViewId],
  );

  const handleUpdateHiddenColumns = useCallback(
    (ids: number[]) => {
      if (!activeViewId) return;
      viewMutations.handleUpdateView(activeViewId, {
        ...viewConfig,
        hiddenColumns: ids,
      });
    },
    [viewConfig, viewMutations, activeViewId],
  );

  const handleUpdateRowHeight = useCallback(
    (rowHeight: RowHeightOption) => {
      if (!activeViewId) return;

      viewMutations.handleUpdateView(activeViewId, {
        ...viewConfig,
        rowHeight,
      });
      closeDropdown();
    },
    [viewConfig, viewMutations, closeDropdown, activeViewId],
  );

  const handleBulkSeed = useCallback(
    (count: number) => {
      if (isSeeding) return;
      bulkCreateMutation.mutate({ tableId: activeTableId, count });
    },
    [activeTableId, bulkCreateMutation, isSeeding],
  );

  const filterCount = viewConfig.filters?.length ?? 0;
  const sortCount = viewConfig.sorts?.length ?? 0;
  const hiddenCount = viewConfig.hiddenColumns?.length ?? 0;
  const activeRowHeight: RowHeightOption = viewConfig.rowHeight ?? "short";

  let hiddenFieldMsg = "Hide fields";
  if (hiddenCount > 1) {
    hiddenFieldMsg = `${hiddenCount} hidden fields`;
  } else if (hiddenCount === 1) {
    hiddenFieldMsg = "1 hidden field";
  }

  let filterFieldMsg = "Filter";
  const filteredCols = viewConfig.filters?.map((f) => {
    const col = columns.find((c) => c.id === f.columnId);
    return col?.name ?? "Unknown column";
  });
  const filteredUniqueCols = [...new Set(filteredCols)];
  if (filteredUniqueCols.length > 3) {
    const primaryColumn = columns.find((c) => c.primary === true);
    filterFieldMsg = `Filtered by ${primaryColumn?.name} and ${filteredUniqueCols.length - 1} other fields`;
  } else if (filteredUniqueCols.length !== 0) {
    filterFieldMsg = `Filtered by ${filteredUniqueCols?.join(", ")}`;
  }

  let sortFieldMsg = "Sort";
  if (sortCount > 1) {
    sortFieldMsg = `Sorted by ${sortCount} fields`;
  } else if (sortCount === 1) {
    sortFieldMsg = `Sorted by ${sortCount} field`;
  }

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
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          <GridIcon className="h-3.5 w-3.5 text-blue-700" />
          {activeViewName}
          <ChevronDownIcon className="h-3 w-3" />
        </button>

        {/* View menu dropdown */}
        {activeDropdown === "viewMenu" && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeDropdown} />
            <div className="absolute top-full left-0 z-45 mt-1 w-91 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
              <button
                className="flex w-full flex-col items-start justify-between gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
                onClick={closeDropdown}
              >
                <div className="flex w-full items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <UsersIcon className="h-4 w-4" />
                    Collaborative view
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                </div>
                <label className="text-xs text-gray-500">
                  Editors and up can edit the view configuration
                </label>
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

              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={closeDropdown}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <DuplicateIcon className="h-4 w-4" />
                Duplicate view
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
              <button
                onClick={() => {
                  if (viewCount <= 1) {
                    alert("You must have at least one view");
                    return;
                  }
                  if (activeViewId) {
                    viewMutations.handleDeleteView(activeViewId);
                  }
                  closeDropdown();
                }}
                disabled={viewCount <= 1}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-gray-50 ${viewCount <= 1 ? "opacity-50" : "opacity-100"}`}
              >
                <TrashIcon className="h-4 w-4 text-gray-700" />
                Delete view
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right side - Field controls */}
      <div className="ml-auto flex items-center gap-1">
        {/* Bulk Seed Buttons */}
        <button
          onClick={() => handleBulkSeed(1000)}
          disabled={isSeeding}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Add 1,000 rows"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          1K
        </button>

        <button
          onClick={() => handleBulkSeed(100000)}
          disabled={isSeeding}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Add 100,000 rows"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          100K
        </button>

        <button
          onClick={() => handleBulkSeed(1000000)}
          disabled={isSeeding}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Add 1,000,000 rows"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          1M
        </button>

        {/* Hide fields */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("hideFields")}
            className={`flex items-center gap-1.5 rounded-md border border-white px-2 py-1 text-xs text-gray-600 ${
              hiddenCount > 0
                ? "border-blue-100 bg-blue-100 hover:border-blue-200"
                : "hover:bg-gray-100"
            }`}
          >
            <HideIcon className="h-3.5 w-3.5" />
            {hiddenFieldMsg}
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
            className={`flex items-center gap-1.5 rounded border border-white px-2 py-1 text-xs text-gray-600 ${
              filterCount > 0
                ? "bg-green-50 hover:border-gray-200 hover:bg-green-100"
                : "bg-white hover:border-gray-100 hover:bg-gray-100"
            }`}
          >
            <FilterIcon className="h-3.5 w-3.5" />
            {filterFieldMsg}
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
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          >
            <GroupIcon className="h-3.5 w-3.5" />
            Group
          </button>
          {activeDropdown === "group" && (
            <>
              <div className="fixed inset-0 z-50" onClick={closeDropdown} />
              <div className="absolute top-full right-0 z-60 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-3 shadow-lg">
                <div className="border-b border-gray-100 px-3 pb-2">
                  <h3 className="text-sm text-gray-700">Group by</h3>
                </div>
                <div className="px-3 py-2 text-xs text-gray-500">
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
            className={`flex items-center gap-1.5 rounded border border-white px-2 py-1 text-xs text-gray-600 ${
              sortCount > 0
                ? "bg-orange-50 hover:border-orange-100"
                : "hover:bg-gray-100"
            }`}
          >
            <SortIcon className="h-3.5 w-3.5" />
            {sortFieldMsg}
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
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            <RowHeightShortIcon className="h-3.5 w-3.5" />
          </button>
          {activeDropdown === "rowHeight" && (
            <RowHeightDropdown
              activeRowHeight={activeRowHeight}
              onUpdateRowHeight={handleUpdateRowHeight}
              onClose={closeDropdown}
            />
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
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          {activeDropdown === "search" && (
            <SearchDropdown
              onScrollToRow={onScrollToRow}
              onClose={closeDropdown}
            />
          )}
        </div>
      </div>
    </div>
  );
}
