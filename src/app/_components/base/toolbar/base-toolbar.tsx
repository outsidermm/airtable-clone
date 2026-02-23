"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { pushQueryEntry } from "~/lib/query-log";
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
  HideIcon,
  PlusIcon,
  FilterIcon,
  GroupIcon,
  SortIcon,
  ColorIcon,
  ShareIcon,
  SearchIcon,
  RowHeightShortIcon,
  SpinnerIcon,
} from "~/app/_components/ui/icons";
import { useViewMutations } from "../../hooks/use-view-mutations";
import type { RowHeightOption } from "~/types/row";
import { RowHeightDropdown } from "./row-height-dropdown";
import { PerformancePanel } from "./performance-panel";
import { useBase } from "../base-context";
import { ViewDetailDropdown } from "./view-detail-dropdown";

type ToolbarDropdown =
  | "hideFields"
  | "filter"
  | "group"
  | "sort"
  | "rowHeight"
  | "search"
  | "perf"
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
  const { activeTableId, activeViewId, setActiveViewId, refetchRows } =
    useBase();
  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );
  const [activeDropdown, setActiveDropdown] = useState<ToolbarDropdown>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [pendingAction, setPendingAction] = useState<"filter" | "sort" | null>(
    null,
  );
  const seedStartRef = useRef(0);

  const bulkCreateMutation = api.row.bulkCreate.useMutation({
    onMutate: () => {
      setIsSeeding(true);
      seedStartRef.current = Date.now();
    },
    onSuccess: (data) => {
      setIsSeeding(false);
      pushQueryEntry({
        path: "row.bulkCreate",
        label: `count=${data.count.toLocaleString()}`,
        sqlMs: data.sqlMs,
        totalMs: Date.now() - seedStartRef.current,
        rowCount: data.count,
      });
      refetchRows();
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
    (filters: FilterConfig[], filterGroupLogic?: "AND" | "OR") => {
      if (!activeViewId) return;
      setPendingAction("filter");
      // Filters change which rows are visible — row data must be refetched
      viewMutations.handleUpdateView(
        activeViewId,
        {
          ...viewConfig,
          filters,
          filterGroupLogic:
            filterGroupLogic ?? viewConfig.filterGroupLogic ?? "AND",
        },
        { refetchRows: true },
      );
    },
    [viewConfig, viewMutations, activeViewId],
  );

  const handleUpdateSorts = useCallback(
    (sorts: SortConfig[]) => {
      if (!activeViewId) return;
      setPendingAction("sort");
      // Sorts change row ordering — row data must be refetched
      viewMutations.handleUpdateView(
        activeViewId,
        { ...viewConfig, sorts },
        { refetchRows: true },
      );
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

  useEffect(() => {
    if (!viewMutations.isUpdatingView) {
      const timeout = setTimeout(() => setPendingAction(null), 300);
      return () => clearTimeout(timeout);
    }
  }, [viewMutations.isUpdatingView]);

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
          onContextMenu={(e) => {
            e.preventDefault();
            toggleDropdown("viewMenu");
          }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          <GridIcon className="h-3.5 w-3.5 text-blue-700" />
          {activeViewName}
          <ChevronDownIcon className="h-3 w-3" />
        </button>

        {/* View menu dropdown */}
        {activeDropdown === "viewMenu" && (
          <ViewDetailDropdown
            viewCount={viewCount}
            closeDropdown={closeDropdown}
          />
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
            <span className="hidden lg:inline">{hiddenFieldMsg}</span>
          </button>
          {activeDropdown === "hideFields" && (
            <HideFieldsDropdown
              columns={columns}
              hiddenColumnIds={viewConfig.hiddenColumns ?? []}
              viewConfig={viewConfig}
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
            {pendingAction === "filter" ? (
              <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FilterIcon className="h-3.5 w-3.5" />
            )}
            <span className="hidden lg:inline">{filterFieldMsg}</span>
          </button>
          {activeDropdown === "filter" && (
            <FilterDropdown
              columns={columns}
              filters={viewConfig.filters ?? []}
              filterGroupLogic={viewConfig.filterGroupLogic ?? "AND"}
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
            <span className="hidden lg:inline">Group</span>
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
            {pendingAction === "sort" ? (
              <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SortIcon className="h-3.5 w-3.5" />
            )}
            <span className="hidden lg:inline">{sortFieldMsg}</span>
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
          <span className="hidden lg:inline">Color</span>
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
          <span className="hidden lg:inline">Share and sync</span>
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
              columns={columns}
              filters={viewConfig.filters ?? []}
              onUpdateFilters={handleUpdateFilters}
              onScrollToRow={onScrollToRow}
              onClose={closeDropdown}
            />
          )}
        </div>

        {/* Performance panel */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("perf")}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 ${
              activeDropdown === "perf" ? "bg-gray-100 font-medium" : ""
            }`}
            title="Query performance"
          >
            Perf
          </button>
          {activeDropdown === "perf" && (
            <PerformancePanel onClose={closeDropdown} />
          )}
        </div>
      </div>
    </div>
  );
}
