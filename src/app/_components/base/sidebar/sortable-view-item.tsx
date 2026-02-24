"use client";

import { type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "../../ui/drag-handle";
import {
  DotsHorizontalIcon,
  DuplicateIcon,
  GridIcon,
  RenameIcon,
  StarOutlineIcon,
  TrashIcon,
} from "~/app/_components/ui/icons";
import { useBase } from "../base-context";
import { useViewMutations } from "../../hooks/use-view-mutations";
import type { View } from "~/types/view";
import { api } from "~/trpc/react";

// --- Sortable View Item ---
interface SortableViewItemProps {
  view: View;
  isEditing: boolean;
  editingName: string;
  viewMenuId: number | null;
  viewsLength: number;
  onDoubleClick: (view: View) => void;
  onSetEditingName: (name: string) => void;
  onSetEditingViewId: (id: number | null) => void;
  onSetViewMenuId: (id: number | null) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}

export function SortableViewItem({
  view,
  isEditing,
  editingName,
  viewMenuId,
  viewsLength,
  onDoubleClick,
  onSetEditingName,
  onSetEditingViewId,
  onSetViewMenuId,
  editInputRef,
}: SortableViewItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: view.id,
  });
  const utils = api.useUtils();
  const { activeTableId, setActiveViewId, activeViewId } = useBase();
  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );
  const isActive = activeViewId === view.id;
  // Only apply vertical transform, ignore horizontal
  const constrainedTransform = transform ? { ...transform, x: 0 } : transform;

  const style: CSSProperties = {
    transform: CSS.Translate.toString(constrainedTransform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRenameSubmit = (viewId: number) => {
    if (editingName.trim() && editingName.trim() !== view.name.trim()) {
      viewMutations.handleRenameView(viewId, editingName.trim());
    }
    onSetEditingViewId(null);
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {isEditing ? (
        <div className="flex items-center gap-2 rounded-md bg-gray-100 px-2 py-1.5">
          <GridIcon className="h-4 w-4 text-blue-500" />
          <input
            ref={editInputRef}
            type="text"
            value={editingName}
            onChange={(e) => onSetEditingName(e.target.value)}
            onBlur={() => handleRenameSubmit(view.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit(view.id);
              if (e.key === "Escape") onSetEditingViewId(null);
            }}
            className="w-full border border-gray-600 bg-white text-xs font-medium text-gray-700 outline-none"
          />
        </div>
      ) : (
        <div
          className="relative flex items-center gap-1 hover:bg-gray-100"
          onMouseEnter={() => void utils.view.getById.prefetch({ id: view.id })}
        >
          <button
            onClick={() => setActiveViewId(view.id)}
            onDoubleClick={() => onDoubleClick(view)}
            className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
              isActive
                ? "bg-gray-100 font-medium text-gray-700"
                : "text-gray-700"
            }`}
          >
            <GridIcon className="h-4 w-4 text-blue-500" />
            <span className="truncate">{view.name}</span>
          </button>

          {/* Three-dot menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetViewMenuId(viewMenuId === view.id ? null : view.id);
            }}
            className="hidden rounded p-1 text-gray-400 group-hover:block hover:text-gray-700"
          >
            <DotsHorizontalIcon className="h-3.5 w-3.5" />
          </button>

          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="hidden cursor-grab rounded p-1 text-gray-400 group-hover:block hover:text-gray-700 active:cursor-grabbing"
          >
            <DragHandle className="h-3.5 w-3.5" />
          </div>

          {/* Three-dot menu dropdown */}
          {viewMenuId === view.id && (
            <>
              <div
                role="presentation"
                className="fixed inset-0 z-30"
                onClick={() => onSetViewMenuId(null)}
                onKeyDown={() => onSetViewMenuId(null)}
              />
              <div className="absolute top-full right-0 z-40 mt-1 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => onSetViewMenuId(null)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <StarOutlineIcon className="h-4 w-4" />
                  Add to &apos;my favourites&apos;
                </button>
                <div className="mx-4 border-b border-gray-200 py-0.5" />
                <button
                  onClick={() => {
                    onDoubleClick(view);
                    onSetViewMenuId(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RenameIcon className="h-4 w-4" />
                  Rename view
                </button>
                <button
                  onClick={() => {
                    viewMutations.handleDuplicateView(view.id);
                    onSetViewMenuId(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <DuplicateIcon className="h-4 w-4" />
                  Duplicate view
                </button>
                <button
                  onClick={() => {
                    viewMutations.handleDeleteView(view.id);
                    onSetViewMenuId(null);
                  }}
                  disabled={viewsLength <= 1}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 text-gray-400" />
                  Delete view
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
