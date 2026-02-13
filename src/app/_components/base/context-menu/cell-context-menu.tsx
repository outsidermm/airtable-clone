"use client";

import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";

interface CellContextMenuProps {
  position: { x: number; y: number };
  rowId: number;
  columnId: number;
  onClose: () => void;
  onClearCell: (rowId: number, columnId: number) => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onDeleteRow: (rowId: number) => void;
}

export function CellContextMenu({
  position,
  rowId,
  columnId,
  onClose,
  onClearCell,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
}: CellContextMenuProps) {
  return (
    <ContextMenu position={position} onClose={onClose}>
      <MenuItem
        label="Copy cell"
        onClick={() => {
          // Copy is a no-op placeholder for now
          onClose();
        }}
      />
      <MenuItem
        label="Clear cell"
        onClick={() => {
          onClearCell(rowId, columnId);
          onClose();
        }}
      />
      <MenuDivider />
      <MenuItem
        label="Insert row above"
        onClick={() => {
          onInsertRowAbove();
          onClose();
        }}
      />
      <MenuItem
        label="Insert row below"
        onClick={() => {
          onInsertRowBelow();
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
