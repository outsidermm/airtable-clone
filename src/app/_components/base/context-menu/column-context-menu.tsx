"use client";

import { useCallback, useState } from "react";
import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";
import type { GridColumn } from "~/types/grid";
import type { ColumnType } from "generated/prisma/enums";
import { useBase } from "../base-context";
import { useViewMutations } from "../../hooks/use-view-mutations";
import type { ViewConfig } from "~/server/api/routers/view";

interface ColumnContextMenuProps {
  position: { x: number; y: number };
  column: GridColumn;
  viewConfig: ViewConfig;
  onClose: () => void;
  onRename: (columnId: number) => void;
  onChangeType: (columnId: number, type: "TEXT" | "NUMBER") => void;
  onUpdate?: (columnId: number, name: string, type: ColumnType) => void;
  onInsertLeft: (columnId: number) => void;
  onInsertRight: (columnId: number) => void;
  onDelete: (columnId: number) => void;
}

export function ColumnContextMenu({
  position,
  column,
  viewConfig,
  onClose,
  onRename,
  onChangeType,
  onUpdate,
  onInsertLeft,
  onInsertRight,
  onDelete,
}: ColumnContextMenuProps) {
  const { openModal, activeViewId, setActiveViewId, activeTableId } = useBase();
  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editType, setEditType] = useState<ColumnType>(column.type);

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


  

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate(column.id, editName.trim() || column.name, editType);
    }
    setShowEditModal(false);
    onClose();
  };

  if (showEditModal) {
    return (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEditModal(false)}
        />
        <div
          className="fixed z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
          style={{ left: position.x, top: position.y }}
        >
          <h3 className="mb-3 text-sm font-medium text-gray-900">Edit field</h3>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              Data type
            </label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as ColumnType)}
              disabled={column.primary}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowEditModal(false);
                onClose();
              }}
              className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <ContextMenu position={position} onClose={onClose}>
      <MenuItem
        label="Edit field"
        onClick={() => {
          setShowEditModal(true);
        }}
      />
      <MenuDivider />
      <MenuItem
        label="Rename field"
        onClick={() => {
          onRename(column.id);
          onClose();
        }}
      />
      <MenuDivider />
      <MenuItem
        label={`Change to ${column.type === "TEXT" ? "Number" : "Text"}`}
        disabled={column.primary}
        onClick={() => {
          onChangeType(column.id, column.type === "TEXT" ? "NUMBER" : "TEXT");
          onClose();
        }}
      />
      {column.primary && (
        <MenuItem
          label="Change primary field"
          onClick={() => {
            openModal("set-primary");
            onClose();
          }}
        />
      )}
      <MenuDivider />
      <MenuItem
        label="Hide field"
        disabled={column.primary}
        onClick={() => {
          handleUpdateHiddenColumns([column.id]);
          onClose();
        }}
      />
      <MenuItem
        label="Insert field to the left"
        onClick={() => {
          onInsertLeft(column.id);
          onClose();
        }}
      />
      <MenuItem
        label="Insert field to the right"
        onClick={() => {
          onInsertRight(column.id);
          onClose();
        }}
      />
      <MenuDivider />
      <MenuItem
        label="Delete field"
        danger
        disabled={column.primary}
        onClick={() => {
          onDelete(column.id);
          onClose();
        }}
      />
    </ContextMenu>
  );
}
