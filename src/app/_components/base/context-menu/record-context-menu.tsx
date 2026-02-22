"use client";

import { useBase } from "../base-context";
import { ContextMenu } from "./context-menu";
import { MenuItem, MenuDivider } from "../../ui/menu";
import {
  AddCommentIcon,
  AIIcon,
  ApplyTemplateIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CopyUrlIcon,
  DuplicateIcon,
  ExpandRecordIcon,
  SendRecordIcon,
  TrashIcon,
} from "../../ui/icons";
import type { useRowMutations } from "../../hooks/use-row-mutations";

interface RecordContextMenuProps {
  rowMutations: ReturnType<typeof useRowMutations>;
  onClearSelection?: () => void;
}

export function RecordContextMenu({ rowMutations, onClearSelection }: RecordContextMenuProps) {
  const { contextMenu, setContextMenu } = useBase();

  const rowId = contextMenu?.data.rowId;
  // selectedRowIds is always at least [rowId] when set from handleRowContextMenu.
  // Fall back to single-row array only when the context menu data predates that field.
  const selectedRowIds: number[] =
    contextMenu?.data.selectedRowIds ?? (rowId != null ? [rowId] : []);

  const isBulk = selectedRowIds.length > 1;

  function close() {
    setContextMenu(null);
  }
  if (!isBulk) {
    return (
      <ContextMenu>
        <MenuItem
          label="Ask Omni"
          icon={<AIIcon className="h-4 w-4 text-gray-400" />}
        />
        <MenuDivider />
        <MenuItem
          label="Insert record above"
          icon={<ArrowUpIcon className="h-4 w-4 text-gray-400" />}
          onClick={() => {
            if (rowId != null) rowMutations.handleInsertRowAbove(rowId);
            close();
          }}
        />
        <MenuItem
          label="Insert record below"
          icon={<ArrowDownIcon className="h-4 w-4 text-gray-400" />}
          onClick={() => {
            if (rowId != null) rowMutations.handleInsertRowBelow(rowId);
            close();
          }}
        />
        <MenuDivider />
        <MenuItem
          label="Duplicate record"
          icon={<DuplicateIcon className="h-4 w-4 text-gray-400" />}
          onClick={() => {
            if (rowId != null) rowMutations.handleDuplicateRow(rowId);
            close();
          }}
        />
        <MenuItem
          label="Apply template"
          icon={<ApplyTemplateIcon className="h-4 w-4 text-gray-400" />}
        />
        <MenuItem
          label="Expand record"
          icon={<ExpandRecordIcon className="h-4 w-4 text-gray-400" />}
        />
        <MenuDivider />
        <MenuItem
          label="Add comment"
          icon={<AddCommentIcon className="h-4 w-4 text-gray-400" />}
        />
        <MenuItem
          label="Copy cell URL"
          icon={<CopyUrlIcon className="h-4 w-4 text-gray-400" />}
        />
        <MenuItem
          label="Send record"
          icon={<SendRecordIcon className="h-4 w-4 text-gray-400" />}
        />
        <MenuDivider />
        <MenuItem
          label="Delete record"
          icon={<TrashIcon className="h-4 w-4 text-gray-400" />}
          danger
          onClick={() => {
            if (rowId != null) rowMutations.handleDeleteRow(rowId);
            close();
          }}
        />
      </ContextMenu>
    );
  }
  return (
    <ContextMenu>
      <MenuItem
        label={`Ask Omni about ${selectedRowIds.length} records`}
        icon={<AIIcon className="h-4 w-4 text-gray-400" />}
      />
      <MenuDivider />
      <MenuItem
        label="Send all selected record"
        icon={<SendRecordIcon className="h-4 w-4 text-gray-400" />}
      />
      <MenuDivider />
      <MenuItem
        label="Delete all selected records"
        icon={<TrashIcon className="h-4 w-4 text-gray-400" />}
        danger
        onClick={() => {
          rowMutations.handleBulkDeleteRow(selectedRowIds);
          onClearSelection?.();
          close();
        }}
      />
    </ContextMenu>
  );
}
