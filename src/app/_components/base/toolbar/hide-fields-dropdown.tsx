"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NumberIcon, QuestionIcon, TextIcon } from "~/app/_components/ui/icons";
import { DragHandle } from "../grid-table/drag-handle";
import type { GridColumn } from "~/types/grid";
import { useViewMutations } from "../../hooks/use-view-mutations";
import { useColumnMutations } from "../../hooks/use-column-mutations";
import { useBase } from "../base-context";
import type { ViewConfig } from "~/server/api/routers/view";

interface HideFieldsDropdownProps {
  columns: GridColumn[];
  hiddenColumnIds: number[];
  viewConfig: ViewConfig;
  onClose: () => void;
}

interface SortableColumnItemProps {
  column: GridColumn;
  isHidden: boolean;
  onToggle: () => void;
}

function SortableColumnItem({
  column,
  isHidden,
  onToggle,
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(column.id) });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const isVisible = !isHidden;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50"
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
        >
          <DragHandle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
        </div>
        <button
          onClick={onToggle}
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
        {column.type === "NUMBER" ? (
          <NumberIcon className="h-3 w-3 text-gray-400" />
        ) : (
          <TextIcon className="h-3 w-3 text-gray-400" />
        )}
        <span className="text-xs text-gray-700">{column.name}</span>
      </div>
    </div>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const filteredColumns = localColumns.filter((c) => {
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) && c.primary === false
    );
  });

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

      // Persist the new column order to the server
      const activeColId = Number(String(active.id));
      if (newIndex === 0) {
        columnMutations.handleReorderColumn(activeColId, null, localColumns[0]!.id);
      } else if (oldIndex < newIndex) {
        columnMutations.handleReorderColumn(activeColId, localColumns[newIndex]!.id, null);
      } else {
        columnMutations.handleReorderColumn(activeColId, null, localColumns[newIndex]!.id);
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

  const hideAll = () => {
    const ids = columns.filter((c) => !c.primary).map((c) => c.id);
    handleUpdateHiddenColumns(ids);
  };

  const showAll = () => {
    handleUpdateHiddenColumns([]);
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredColumns.map((c) => String(c.id))}
              strategy={verticalListSortingStrategy}
            >
              {filteredColumns.map((col) => (
                <SortableColumnItem
                  key={col.id}
                  column={col}
                  isHidden={hiddenSet.has(col.id)}
                  onToggle={() => toggleColumn(col.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
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
