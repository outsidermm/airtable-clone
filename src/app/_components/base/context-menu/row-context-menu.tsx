"use client";

import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";

interface RowContextMenuProps {
  position: { x: number; y: number };
  rowId: number;
}

export function RowContextMenu({ position, rowId }: RowContextMenuProps) {
  const { activeTableId, setContextMenu } = useBase();
  const rowMutations = useRowMutations(activeTableId);
  return (
    <ContextMenu position={position}>
      <MenuItem
        label="Insert row above"
        onClick={() => {
          rowMutations.handleAddRow();
          setContextMenu(null);
        }}
      />
      <MenuItem
        label="Insert row below"
        onClick={() => {
          rowMutations.handleAddRow();
          setContextMenu(null);
        }}
      />
      <MenuDivider />
      <MenuItem
        label="Delete row"
        danger
        onClick={() => {
          rowMutations.handleDeleteRow(rowId);
          setContextMenu(null);
        }}
      />
    </ContextMenu>
  );
}
