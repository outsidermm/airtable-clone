// src/app/_components/base/toolbar/hide-fields-dropdown.tsx
"use client";

import React, { useState, useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { QuestionIcon, XIcon } from "~/app/_components/ui/icons";
import type { GridColumn } from "~/types/grid";
import { useViewMutations } from "../../hooks/use-view-mutations";
import { useColumnMutations } from "../../hooks/use-column-mutations";
import { useBase } from "../base-context";
import type { ViewConfig } from "~/server/api/routers/view";
import { SortableColumnItem } from "../../ui/sortable-column-item";
import { Popover } from "../../ui/popover";
import { SortableList } from "../../ui/sortable-list";

interface HideFieldsDropdownProps {
  columns: GridColumn[];
  hiddenColumnIds: number[];
  viewConfig: ViewConfig;
  onClose: () => void;
}

export function HideFieldsDropdown({
  columns,
  hiddenColumnIds,
  viewConfig,
  onClose,
}: HideFieldsDropdownProps) {
  const [search, setSearch] = useState("");
  const [localColumns, setLocalColumns] = useState<GridColumn[]>(columns);
  const { activeTableId, activeViewId, setActiveViewId } = useBase();

  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );
  const columnMutations = useColumnMutations(activeTableId);

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

  const filteredColumns = localColumns.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) && !c.primary,
  );
  const hiddenSet = new Set(hiddenColumnIds);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = localColumns.findIndex(
        (c) => String(c.id) === active.id,
      );
      const newIndex = localColumns.findIndex((c) => String(c.id) === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const updated = arrayMove(localColumns, oldIndex, newIndex);
      setLocalColumns(updated);

      const activeColId = Number(String(active.id));
      if (newIndex === 0) {
        columnMutations.handleReorderColumn(
          activeColId,
          null,
          localColumns[0]!.id,
        );
      } else if (oldIndex < newIndex) {
        columnMutations.handleReorderColumn(
          activeColId,
          localColumns[newIndex]!.id,
          null,
        );
      } else {
        columnMutations.handleReorderColumn(
          activeColId,
          null,
          localColumns[newIndex]!.id,
        );
      }
    },
    [localColumns, columnMutations],
  );

  const toggleColumn = (colId: number) => {
    const col = columns.find((c) => c.id === colId);
    if (col?.primary) return;

    const updated = hiddenSet.has(colId)
      ? hiddenColumnIds.filter((id) => id !== colId)
      : [...hiddenColumnIds, colId];
    handleUpdateHiddenColumns(updated);
  };

  const hideAll = () =>
    handleUpdateHiddenColumns(
      columns.filter((c) => !c.primary).map((c) => c.id),
    );
  const showAll = () => handleUpdateHiddenColumns([]);

  return (
    <Popover onClose={onClose} align="right" className="w-80 py-2">
      {columns.length === 1 ? (
        <div className="mb-16 px-5 text-[13px] text-gray-500">
          No fields available to be hidden
        </div>
      ) : (
        <React.Fragment>
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-md border-b border-gray-300 px-2 py-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a field"
                className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                autoFocus
              />
              {search.length > 0 ? (
                <button
                  onClick={() => setSearch("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              ) : (
                <QuestionIcon className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-visible">
            {filteredColumns.length === 0 ? (
              <div className="mb-20 flex items-center gap-3 px-4">
                <p className="text-[13px] text-gray-400">No results.</p>
                <button
                  onClick={() => setSearch("")}
                  className="cursor-pointer text-[13px] text-gray-400 underline hover:text-gray-500"
                >
                  Clear
                </button>
              </div>
            ) : (
              <SortableList
                items={filteredColumns.map((c) => String(c.id))}
                onDragEnd={handleDragEnd}
              >
                {filteredColumns.map((col) => (
                  <SortableColumnItem
                    key={col.id}
                    column={col}
                    isHidden={hiddenSet.has(col.id)}
                    onToggle={() => toggleColumn(col.id)}
                    isDragHandleHidden={search.length > 0}
                  />
                ))}
              </SortableList>
            )}
          </div>
        </React.Fragment>
      )}

      {search.length === 0 && (
        <div className="mt-1 flex gap-4 px-3 pt-2">
          <button
            onClick={hideAll}
            className="flex-1 rounded bg-gray-100 py-1 text-xs text-gray-600 hover:bg-gray-200"
          >
            Hide all
          </button>
          <button
            onClick={showAll}
            className="flex-1 rounded bg-gray-100 py-1 text-xs text-gray-600 hover:bg-gray-200"
          >
            Show all
          </button>
        </div>
      )}
    </Popover>
  );
}
