"use client";

import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";

interface RowContextMenuProps {
  position: { x: number; y: number };
  rowId: number;
  onClose: () => void;
}

export function RowContextMenu({
  position,
  rowId,
  onClose,
}: RowContextMenuProps) {
  const { activeTableId } = useBase();
  const rowMutations = useRowMutations(activeTableId);
  return (
    <ContextMenu position={position} onClose={onClose}>
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
