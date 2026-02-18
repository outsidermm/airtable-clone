"use client";

import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { ContextMenu, MenuItem, MenuDivider } from "./context-menu";

export function RowContextMenu() {
  const { activeTableId, setContextMenu, contextMenu } = useBase();
  const rowId = contextMenu?.data.rowId;
  const rowMutations = useRowMutations(activeTableId);
  if (!rowId) return null;
  return (
    <ContextMenu>
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
