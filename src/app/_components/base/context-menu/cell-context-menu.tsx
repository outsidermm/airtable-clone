"use client";

import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";

interface CellContextMenuProps {
  position: { x: number; y: number };
  rowId: number;
  columnId: number;
  onClearCell: (rowId: number, columnId: number) => void;
}

export function CellContextMenu({
  position,
  rowId,
  columnId,
  onClearCell,
}: CellContextMenuProps) {
  const { activeTableId, setContextMenu } = useBase();
  const rowMutations = useRowMutations(activeTableId);
  return (
    <ContextMenu position={position}>
      <MenuItem label="Copy cell" />
      <MenuItem
        label="Clear cell"
        onClick={() => {
          onClearCell(rowId, columnId);
          setContextMenu(null);
        }}
      />
      <MenuDivider />
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
