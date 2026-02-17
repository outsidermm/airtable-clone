"use client";

import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";

interface CellContextMenuProps {
  position: { x: number; y: number };
  rowId: number;
  columnId: number;
  onClose: () => void;
  onClearCell: (rowId: number, columnId: number) => void;
}

export function CellContextMenu({
  position,
  rowId,
  columnId,
  onClose,
  onClearCell,
}: CellContextMenuProps) {
  const { activeTableId } = useBase();
  const rowMutations = useRowMutations(activeTableId);
  return (
    <ContextMenu position={position} onClose={onClose}>
      <MenuItem
        label="Copy cell"
        onClick={() => {
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
          rowMutations.handleAddRow();
          onClose();
        }}
      />
      <MenuItem
        label="Insert row below"
        onClick={() => {
          rowMutations.handleAddRow();
          onClose();
        }}
      />
      <MenuDivider />
      <MenuItem
        label="Delete row"
        danger
        onClick={() => {
          rowMutations.handleDeleteRow(rowId);
          onClose();
        }}
      />
    </ContextMenu>
  );
}
