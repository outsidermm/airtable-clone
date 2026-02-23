"use client";

import { useCallback } from "react";
import { ContextMenu } from "./context-menu";
import { MenuItem, MenuDivider } from "../../ui/menu";
import type { GridColumn } from "~/types/grid";
import { useBase } from "../base-context";
import { useViewMutations } from "../../hooks/use-view-mutations";
import type { ViewConfig } from "~/server/api/routers/view";
import { useColumnMutations } from "../../hooks/use-column-mutations";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChangePrimaryFieldIcon,
  CopyUrlIcon,
  DependenciesIcon,
  DuplicateIcon,
  FilterIcon,
  GroupIcon,
  HideIcon,
  InfoIcon,
  LockIcon,
  PencilIcon,
  RunAgentIcon,
  SortAscIcon,
  SortDescIcon,
  TrashIcon,
} from "../../ui/icons";

interface ColumnContextMenuProps {
  column: GridColumn;
  viewConfig: ViewConfig;
  onRename: (columnId: number) => void;
  onDuplicate: (columnId: number) => void;
}

export function ColumnContextMenu({
  column,
  viewConfig,
  onDuplicate,
}: ColumnContextMenuProps) {
  const {
    openModal,
    activeViewId,
    setActiveViewId,
    activeTableId,
    setContextMenu,
    contextMenu,
    setInsertAfterColumnId,
    setInsertBeforeColumnId,
    setEditingColumnId,
  } = useBase();
  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );
  const columnMutations = useColumnMutations(activeTableId);
  const position = contextMenu?.position;

  const handleUpdateHiddenColumns = useCallback(
    (ids: number[]) => {
      if (!activeViewId) return;
      viewMutations.handleUpdateView(activeViewId, {
        ...viewConfig,
        hiddenColumns: ids,
      });
    },
    [viewConfig, viewMutations, activeViewId],
  );

  if (!position) return null;

  return (
    <ContextMenu>
      <MenuItem
        icon={<PencilIcon className="h-4 w-4" />}
        label="Edit field"
        onClick={() => {
          setEditingColumnId(column.id);
          openModal("edit-column", contextMenu?.anchorEl);
          setContextMenu(null);
        }}
      />
      <MenuDivider />
      <MenuItem
        label="Duplicate field"
        icon={<DuplicateIcon className="h-4 w-4" />}
        onClick={() => {
          onDuplicate(column.id);
          setContextMenu(null);
        }}
      />
      <MenuItem
        label="Insert left"
        icon={<ArrowLeftIcon className="h-4 w-4" />}
        onClick={() => {
          setInsertBeforeColumnId(column.id);
          setInsertAfterColumnId(null);
          openModal("add-column", contextMenu?.anchorEl);
          setContextMenu(null);
        }}
      />
      <MenuItem
        label="Insert right"
        icon={<ArrowRightIcon className="h-4 w-4" />}
        onClick={() => {
          setInsertAfterColumnId(column.id);
          setInsertBeforeColumnId(null);
          openModal("add-column", contextMenu?.anchorEl);
          setContextMenu(null);
        }}
      />
      {column.primary && (
        <MenuItem
        icon={<ChangePrimaryFieldIcon className="h-4 w-4" />}
          label="Change primary field"
          onClick={() => {
            openModal("set-primary");
            setContextMenu(null);
          }}
        />
      )}
      <MenuDivider />
      <MenuItem label="Summarize field" icon={<RunAgentIcon className="h-4 w-4" />} />
      <MenuItem label="Write headline for field" icon={<RunAgentIcon className="h-4 w-4" />} />
      <MenuDivider />
      <MenuItem label="Copy field URL" icon={<CopyUrlIcon className="h-4 w-4" />} />
      <MenuItem label="Edit field description" icon={<InfoIcon className="h-4 w-4" />} />
      <MenuItem label="Edit field permissions" icon={<LockIcon className="h-4 w-4" />} />
      <MenuDivider />
      <MenuItem label="Sort A → Z" icon={<SortAscIcon className="h-4 w-4" />} />
      <MenuItem label="Sort Z → A" icon={<SortDescIcon className="h-4 w-4" />} />
      <MenuDivider />
      <MenuItem label="Filter by this field" icon={<FilterIcon className="h-4 w-4" />} />
      <MenuItem label="Group by this field" icon={<GroupIcon className="h-4 w-4" />} />
      <MenuItem label="Show dependencies" icon={<DependenciesIcon className="h-4 w-4" />} />
      <MenuDivider />
      <MenuItem
        label="Hide field"
        icon={<HideIcon className="h-4 w-4" />}
        disabled={column.primary}
        onClick={() => {
          handleUpdateHiddenColumns([column.id]);
          setContextMenu(null);
        }}
      />
      <MenuItem
        label="Delete field"
        icon={<TrashIcon className="h-4 w-4 text-gray-700" />}
        danger
        disabled={column.primary}
        onClick={() => {
          columnMutations.handleDeleteColumn(column.id);
          setContextMenu(null);
        }}
      />
    </ContextMenu>
  );
}