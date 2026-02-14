"use client";

import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";
import type { GridColumn } from "~/types/grid";

interface ColumnContextMenuProps {
  position: { x: number; y: number };
  column: GridColumn;
  onClose: () => void;
  onRename: (columnId: number) => void;
  onChangeType: (columnId: number, type: "TEXT" | "NUMBER") => void;
  onSetPrimary?: () => void;
  onHide: (columnId: number) => void;
  onInsertLeft: (columnId: number) => void;
  onInsertRight: (columnId: number) => void;
  onDelete: (columnId: number) => void;
}

export function ColumnContextMenu({
  position,
  column,
  onClose,
  onRename,
  onChangeType,
  onSetPrimary,
  onHide,
  onInsertLeft,
  onInsertRight,
  onDelete,
}: ColumnContextMenuProps) {
  return (
    <ContextMenu position={position} onClose={onClose}>
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
          onChangeType(
            column.id,
            column.type === "TEXT" ? "NUMBER" : "TEXT",
          );
          onClose();
        }}
      />
      {column.primary && onSetPrimary && (
        <MenuItem
          label="Change primary field"
          onClick={() => {
            onSetPrimary();
            onClose();
          }}
        />
      )}
      <MenuDivider />
      <MenuItem
        label="Hide field"
        disabled={column.primary}
        onClick={() => {
          onHide(column.id);
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
