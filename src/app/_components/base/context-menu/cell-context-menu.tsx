"use client";

import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";

interface CellContextMenuProps {
  onClearCell: (rowId: number, columnId: number) => void;
}

export function CellContextMenu({ onClearCell }: CellContextMenuProps) {
  const { activeTableId, setContextMenu, contextMenu } = useBase();

  const position = contextMenu?.position;
  const rowId = contextMenu?.data.rowId;
  const columnId = contextMenu?.data.columnId;

  const rowMutations = useRowMutations(activeTableId);
  if (!position || !rowId || !columnId) return null;
  return (
    <ContextMenu>
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
