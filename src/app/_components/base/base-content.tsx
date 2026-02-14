"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { api } from "~/trpc/react";
import { GridTable, type GridTableHandle } from "./grid-table";
import { ViewSidebar } from "./view-sidebar";
import { BaseHeader } from "./base-header";
import { BaseToolbar } from "./toolbar/base-toolbar";
import { CellContextMenu } from "./context-menu/cell-context-menu";
import { ColumnContextMenu } from "./context-menu/column-context-menu";
import { RowContextMenu } from "./context-menu/row-context-menu";
import { SetPrimaryModal } from "./set-primary-modal";
import { AddTableModal } from "./add-table-modal";
import { AddColumnModal } from "./add-column-modal";
import { useTableMutations } from "./hooks/use-table-mutations";
import { useRowMutations } from "./hooks/use-row-mutations";
import { useColumnMutations } from "./hooks/use-column-mutations";
import { useViewMutations } from "./hooks/use-view-mutations";
import type { ViewConfig } from "~/server/api/routers/view";
import type { GridColumn, GridRow, ContextMenuState } from "~/types/grid";
import type { ColumnType } from "generated/prisma/enums";

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

const DEFAULT_VIEW_CONFIG: ViewConfig = {
  sorts: [],
  filters: [],
  hiddenColumns: [],
  rowHeight: "short",
};

export function BaseContent({
  baseId,
  tables: initialTables,
  initialTableId,
  base,
  user,
}: BaseContentProps) {
  const [activeTableId, setActiveTableId] = useState(initialTableId);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState<
    Map<number, Set<number>>
  >(new Map());
  const [activeSearchCell, setActiveSearchCell] = useState<
    { rowId: number; columnId: number } | undefined
  >(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showPrimaryModal, setShowPrimaryModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [addColumnAnchor, setAddColumnAnchor] = useState<HTMLElement | null>(null);
  const [addTableAnchor, setAddTableAnchor] = useState<HTMLElement | null>(null);
  const [localRowOrder, setLocalRowOrder] = useState<number[]>([]);

  const gridTableRef = useRef<GridTableHandle>(null);

  const utils = api.useUtils();

  // --- Base ---
  const renameBase = api.base.rename.useMutation({
    onSuccess: () => {
      // Refresh will happen automatically via Next.js router
      window.location.reload();
    },
  });

  const handleRenameBase = useCallback(
    (name: string) => {
      renameBase.mutate({ id: baseId, name });
    },
    [baseId, renameBase],
  );

  // --- Tables ---
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

  const tableQuery = api.table.getById.useQuery(
    { id: activeTableId },
    { enabled: !!activeTableId },
  );

  const tableMutations = useTableMutations(
    baseId,
    tables,
    activeTableId,
    setActiveTableId,
  );

  // --- Views ---
  const views = useMemo(() => {
    if (!tableQuery.data?.views) return [];
    return tableQuery.data.views.map((v) => ({
      id: v.id,
      name: v.name,
      config: v.config,
    }));
  }, [tableQuery.data?.views]);

  // Initialize activeViewId from first view
  useEffect(() => {
    if (views.length > 0 && !activeViewId) {
      setActiveViewId(views[0]!.id);
    }
    // If active view was deleted, pick the first remaining
    if (activeViewId && !views.find((v) => v.id === activeViewId)) {
      setActiveViewId(views[0]?.id ?? null);
    }
  }, [views, activeViewId]);

  const viewQuery = api.view.getById.useQuery(
    { id: activeViewId! },
    { enabled: !!activeViewId },
  );

  const viewConfig = useMemo<ViewConfig>(() => {
    if (!viewQuery.data?.config) return DEFAULT_VIEW_CONFIG;
    const cfg = viewQuery.data.config as ViewConfig;
    return {
      sorts: cfg.sorts ?? [],
      filters: cfg.filters ?? [],
      hiddenColumns: cfg.hiddenColumns ?? [],
      rowHeight: cfg.rowHeight ?? "short",
    };
  }, [viewQuery.data?.config]);

  const activeViewName = useMemo(() => {
    return views.find((v) => v.id === activeViewId)?.name ?? "Grid view";
  }, [views, activeViewId]);

  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );

  const handleUpdateViewConfig = useCallback(
    (config: ViewConfig) => {
      if (!activeViewId) return;
      viewMutations.handleUpdateView(activeViewId, config);
    },
    [activeViewId, viewMutations],
  );

  // --- Rows (use view.getData when we have a view, fallback to row.getRows) ---
  const viewDataQuery = api.view.getData.useInfiniteQuery(
    { viewId: activeViewId!, limit: 50 },
    {
      enabled: !!activeViewId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const rowsFallbackQuery = api.row.getRows.useInfiniteQuery(
    { tableId: activeTableId, limit: 50 },
    {
      enabled: !!activeTableId && !activeViewId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const activeRowsQuery = activeViewId ? viewDataQuery : rowsFallbackQuery;

  const rows = useMemo(() => {
    if (!activeRowsQuery.data) return [];
    return activeRowsQuery.data.pages.flatMap((page) => page.rows);
  }, [activeRowsQuery.data]);

  const rowMutations = useRowMutations(activeTableId);

  // --- Columns ---
  const allColumns = useMemo<GridColumn[]>(() => {
    if (!tableQuery.data) return [];
    return tableQuery.data.columns.map((col) => ({
      id: col.id,
      name: col.name,
      type: col.type,
      width: col.primary ? 250 : 200,
      primary: col.primary,
      order: col.order,
    }));
  }, [tableQuery.data]);

  // Filter out hidden columns
  const visibleColumns = useMemo(() => {
    const hiddenSet = new Set(viewConfig.hiddenColumns ?? []);
    return allColumns.filter((c) => !hiddenSet.has(c.id));
  }, [allColumns, viewConfig.hiddenColumns]);

  const columnMutations = useColumnMutations(activeTableId);

  // --- Cells ---
  const updateCell = api.cell.update.useMutation({
    onSuccess: () => {
      if (activeViewId) {
        void utils.view.getData.invalidate();
      } else {
        void utils.row.getRows.invalidate({ tableId: activeTableId });
      }
    },
  });

  const handleCellUpdate = useCallback(
    (rowId: number, columnId: number, value: string) => {
      const col = allColumns.find((c) => c.id === columnId);
      if (!col) return;

      if (col.type === "NUMBER") {
        const num = parseFloat(value);
        updateCell.mutate({
          rowId,
          columnId,
          value: isNaN(num) ? null : num,
        });
      } else {
        updateCell.mutate({ rowId, columnId, value });
      }
    },
    [allColumns, updateCell],
  );

  // --- Grid rows ---
  const gridRows = useMemo<GridRow[]>(() => {
    const baseRows = rows.map((row) => ({
      id: row.id,
      cells: row.cells as Record<string, string | number | null>,
    }));

    // Apply local row order if set
    if (localRowOrder.length > 0) {
      const rowMap = new Map(baseRows.map((r) => [r.id, r]));
      const ordered: GridRow[] = [];
      // First, add rows in the stored order
      for (const id of localRowOrder) {
        const r = rowMap.get(id);
        if (r) {
          ordered.push(r);
          rowMap.delete(id);
        }
      }
      // Then append any new rows not in the order
      for (const r of rowMap.values()) {
        ordered.push(r);
      }
      return ordered;
    }

    return baseRows;
  }, [rows, localRowOrder]);

  // --- Context menu handlers ---
  const handleContextMenu = useCallback((state: ContextMenuState) => {
    setContextMenu(state);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Column context menu actions
  const handleColumnRenameFromMenu = useCallback(
    (_columnId: number) => {
      // The GridTable handles inline header editing
      closeContextMenu();
    },
    [closeContextMenu],
  );

  const handleColumnChangeType = useCallback(
    (columnId: number, type: "TEXT" | "NUMBER") => {
      columnMutations.handleUpdateColumn(columnId, undefined, type as ColumnType);
    },
    [columnMutations],
  );

  const handleColumnHide = useCallback(
    (columnId: number) => {
      if (!activeViewId) return;
      const newHidden = [...(viewConfig.hiddenColumns ?? []), columnId];
      handleUpdateViewConfig({ ...viewConfig, hiddenColumns: newHidden });
    },
    [activeViewId, viewConfig, handleUpdateViewConfig],
  );

  const handleInsertColumnLeft = useCallback(
    (columnId: number) => {
      const colIdx = allColumns.findIndex((c) => c.id === columnId);
      const beforeId = columnId;
      const afterId = colIdx > 0 ? allColumns[colIdx - 1]!.id : null;
      columnMutations.handleAddColumn({
        afterColumnId: afterId ?? undefined,
        beforeColumnId: beforeId,
      });
    },
    [allColumns, columnMutations],
  );

  const handleInsertColumnRight = useCallback(
    (columnId: number) => {
      const colIdx = allColumns.findIndex((c) => c.id === columnId);
      const afterId = columnId;
      const beforeId =
        colIdx < allColumns.length - 1 ? allColumns[colIdx + 1]!.id : null;
      columnMutations.handleAddColumn({
        afterColumnId: afterId,
        beforeColumnId: beforeId ?? undefined,
      });
    },
    [allColumns, columnMutations],
  );

  // Cell context menu
  const handleClearCell = useCallback(
    (rowId: number, columnId: number) => {
      updateCell.mutate({ rowId, columnId, value: null });
    },
    [updateCell],
  );

  // Scroll to row (for search)
  const handleScrollToRow = useCallback((rowId: number) => {
    gridTableRef.current?.scrollToRow(rowId);
  }, []);

  // Reset view and row order when switching tables
  useEffect(() => {
    setActiveViewId(null);
    setLocalRowOrder([]);
  }, [activeTableId]);

  // Reset row order when switching views
  useEffect(() => {
    setLocalRowOrder([]);
  }, [activeViewId]);

  const isLoading = tableQuery.isLoading || activeRowsQuery.isLoading;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <BaseHeader
        base={base}
        user={user}
        tables={tables}
        activeTableId={activeTableId}
        onTableChange={setActiveTableId}
        onAddTable={(e) => {
          setAddTableAnchor(e?.currentTarget ?? null);
          setShowAddTableModal(true);
        }}
        onRenameTable={tableMutations.handleRenameTable}
        onDeleteTable={tableMutations.handleDeleteTable}
        onRenameBase={handleRenameBase}
      />

      {/* Toolbar */}
      <BaseToolbar
        columns={allColumns}
        activeViewId={activeViewId}
        viewConfig={viewConfig}
        tableId={activeTableId}
        onUpdateViewConfig={handleUpdateViewConfig}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activeViewName={activeViewName}
        onHighlight={(cells, activeCell, query) => {
          setHighlightedCells(cells);
          setActiveSearchCell(activeCell);
          setSearchQuery(query ?? "");
        }}
        onScrollToRow={handleScrollToRow}
      />

      {/* View sidebar + Grid + Footer */}
      <div className="flex flex-1 overflow-hidden">
        <ViewSidebar
          isOpen={isSidebarOpen}
          views={views}
          activeViewId={activeViewId}
          onSelectView={setActiveViewId}
          onAddView={viewMutations.handleAddView}
          onRenameView={viewMutations.handleRenameView}
          onDeleteView={viewMutations.handleDeleteView}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-sm text-gray-500">Loading...</div>
            </div>
          ) : (
            <GridTable
              ref={gridTableRef}
              columns={visibleColumns}
              rows={gridRows}
              onCellUpdate={handleCellUpdate}
              onAddRow={rowMutations.handleAddRow}
              onDeleteRow={rowMutations.handleDeleteRow}
              onBulkDeleteRow={rowMutations.handleBulkDeleteRow}
              onAddColumn={(e) => {
                setAddColumnAnchor(e?.currentTarget ?? null);
                setShowAddColumnModal(true);
              }}
              onDeleteColumn={columnMutations.handleDeleteColumn}
              onReorderColumn={columnMutations.handleReorderColumn}
              onUpdateColumn={columnMutations.handleUpdateColumn}
              onSetPrimaryColumn={columnMutations.handleSetPrimaryColumn}
              onReorderRow={(draggedRowId, targetRowId) => {
                // Row reordering is local-only (session-based) - no backend persistence
                const currentOrder = localRowOrder.length === gridRows.length
                  ? localRowOrder
                  : gridRows.map((r) => r.id);

                const oldIndex = currentOrder.indexOf(draggedRowId);
                const newIndex = currentOrder.indexOf(targetRowId);

                if (oldIndex === -1 || newIndex === -1) return;

                // Use @dnd-kit's arrayMove utility for correct reordering
                setLocalRowOrder(arrayMove(currentOrder, oldIndex, newIndex));
              }}
              onLoadMore={() => {
                if (activeRowsQuery.hasNextPage && !activeRowsQuery.isFetchingNextPage) {
                  void activeRowsQuery.fetchNextPage();
                }
              }}
              hasNextPage={activeRowsQuery.hasNextPage}
              sorts={viewConfig.sorts ?? []}
              rowHeight={viewConfig.rowHeight ?? "short"}
              highlightedCells={highlightedCells}
              activeSearchCell={activeSearchCell}
              searchQuery={searchQuery}
              onContextMenu={handleContextMenu}
            />
          )}

          {/* Footer — right of sidebar */}
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3 py-1">
            <span className="text-xs text-gray-500">
              {gridRows.length} {gridRows.length === 1 ? "record" : "records"}
            </span>
          </div>
        </div>
      </div>

      {/* Context Menus */}
      {contextMenu?.type === "cell" &&
        contextMenu.data.rowId != null &&
        contextMenu.data.columnId != null && (
          <CellContextMenu
            position={contextMenu.position}
            rowId={contextMenu.data.rowId}
            columnId={contextMenu.data.columnId}
            onClose={closeContextMenu}
            onClearCell={handleClearCell}
            onInsertRowAbove={rowMutations.handleAddRow}
            onInsertRowBelow={rowMutations.handleAddRow}
            onDeleteRow={rowMutations.handleDeleteRow}
          />
        )}

      {contextMenu?.type === "column" &&
        contextMenu.data.columnId != null && (
          <ColumnContextMenu
            position={contextMenu.position}
            column={
              allColumns.find((c) => c.id === contextMenu.data.columnId)!
            }
            onClose={closeContextMenu}
            onRename={handleColumnRenameFromMenu}
            onChangeType={handleColumnChangeType}
            onSetPrimary={
              allColumns.find((c) => c.id === contextMenu.data.columnId)?.primary
                ? () => setShowPrimaryModal(true)
                : undefined
            }
            onHide={handleColumnHide}
            onInsertLeft={handleInsertColumnLeft}
            onInsertRight={handleInsertColumnRight}
            onDelete={columnMutations.handleDeleteColumn}
          />
        )}

      {contextMenu?.type === "row" &&
        contextMenu.data.rowId != null && (
          <RowContextMenu
            position={contextMenu.position}
            rowId={contextMenu.data.rowId}
            onClose={closeContextMenu}
            onInsertAbove={rowMutations.handleAddRow}
            onInsertBelow={rowMutations.handleAddRow}
            onDeleteRow={rowMutations.handleDeleteRow}
          />
        )}

      {/* Set Primary Modal */}
      {showPrimaryModal && (
        <SetPrimaryModal
          columns={allColumns}
          currentPrimaryId={allColumns.find((c) => c.primary)?.id ?? allColumns[0]!.id}
          onConfirm={(columnId) => {
            columnMutations.handleSetPrimaryColumn(columnId);
            setShowPrimaryModal(false);
          }}
          onClose={() => setShowPrimaryModal(false)}
        />
      )}

      {/* Add Table Modal */}
      {showAddTableModal && (
        <AddTableModal
          anchorEl={addTableAnchor}
          onConfirm={() => {
            tableMutations.handleAddTable();
            setShowAddTableModal(false);
            setAddTableAnchor(null);
          }}
          onClose={() => {
            setShowAddTableModal(false);
            setAddTableAnchor(null);
          }}
        />
      )}

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <AddColumnModal
          anchorEl={addColumnAnchor}
          onConfirm={(name, type) => {
            columnMutations.handleAddColumn({ name, type });
            setShowAddColumnModal(false);
            setAddColumnAnchor(null);
          }}
          onClose={() => {
            setShowAddColumnModal(false);
            setAddColumnAnchor(null);
          }}
        />
      )}
    </div>
  );
}
