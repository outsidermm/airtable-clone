"use client";

import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";

interface RowContextMenuProps {
  position: { x: number; y: number };
  rowId: number;
  onClose: () => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onDeleteRow: (rowId: number) => void;
}

export function RowContextMenu({
  position,
  rowId,
  onClose,
  onInsertAbove,
  onInsertBelow,
  onDeleteRow,
}: RowContextMenuProps) {
  return (
    <ContextMenu position={position} onClose={onClose}>
      <MenuItem
        label="Insert row above"
        onClick={() => {
          onInsertAbove();
          onClose();
        }}
      />
      <MenuItem
        label="Insert row below"
        onClick={() => {
          onInsertBelow();
          onClose();
        }}
      />
      <MenuDivider />
      <MenuItem
        label="Delete row"
        danger
        onClick={() => {
          onDeleteRow(rowId);
          onClose();
        }}
      />
    </ContextMenu>
  );
}
