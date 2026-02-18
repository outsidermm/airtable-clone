"use client";

import { useRowMutations } from "../../hooks/use-row-mutations";
import { useBase } from "../base-context";
import { ContextMenu } from "./context-menu";
import { MenuItem, MenuDivider } from "../../ui/menu";
import {
  AddCommentIcon,
  AIIcon,
  ApplyTemplateIcon,
  ArrowDownIcon,
  CopyUrlIcon,
  DuplicateIcon,
  ExpandRecordIcon,
  SendRecordIcon,
  TrashIcon,
} from "../../ui/icons";

export function RecordContextMenu() {
  const { activeTableId, setContextMenu, contextMenu } = useBase();
  const rowId = contextMenu?.data.rowId;

  const rowMutations = useRowMutations(activeTableId);
  if (!rowId) return null;
  return (
    <ContextMenu>
      <MenuItem
        label="Ask Omni"
        icon={<AIIcon className="h-4 w-4 text-gray-400" />}
      />
      <MenuDivider />
      <MenuItem
        label="Insert record"
        icon={<ArrowDownIcon className="h-4 w-4 text-gray-400" />}
      />
      <MenuDivider />
      <MenuItem
        label="Duplicate record"
        icon={<DuplicateIcon className="h-4 w-4 text-gray-400" />}
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
          rowMutations.handleDeleteRow(rowId);
          setContextMenu(null);
        }}
      />
    </ContextMenu>
  );
}
