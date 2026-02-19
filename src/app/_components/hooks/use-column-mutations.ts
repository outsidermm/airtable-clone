import { useCallback } from "react";
import { api } from "~/trpc/react";
import type { ColumnType } from "generated/prisma/enums";
import { useBase } from "../base/base-context";

export function useColumnMutations(activeTableId: number) {
  const utils = api.useUtils();
  const { activeViewId } = useBase();

  const invalidate = useCallback(() => {
    // Only invalidate the table schema
    void utils.table.getById.invalidate({ id: activeTableId });
    // Scope row invalidation to active source only
    if (activeViewId) {
      void utils.view.getData.invalidate({ viewId: activeViewId });
    } else {
      void utils.row.getRows.invalidate({ tableId: activeTableId });
    }
  }, [utils, activeTableId, activeViewId]);

  const createColumn = api.column.create.useMutation({ onSuccess: invalidate });
  const updateColumn = api.column.update.useMutation({ onSuccess: invalidate });
  const reorderColumn = api.column.reorder.useMutation({
    onSuccess: invalidate,
  });
  const setPrimaryColumn = api.column.setPrimary.useMutation({
    onSuccess: invalidate,
  });
  const deleteColumn = api.column.delete.useMutation({ onSuccess: invalidate });

  // Only send ONE of afterColumnId / beforeColumnId — backend rejects both
  const handleAddColumn = useCallback(
    (opts?: {
      afterColumnId?: number;
      beforeColumnId?: number;
      name?: string;
      type?: ColumnType;
    }) => {
      if (opts?.afterColumnId != null) {
        createColumn.mutate({
          tableId: activeTableId,
          afterColumnId: opts.afterColumnId,
          name: opts.name,
          type: opts.type,
        });
      } else if (opts?.beforeColumnId != null) {
        createColumn.mutate({
          tableId: activeTableId,
          beforeColumnId: opts.beforeColumnId,
          name: opts.name,
          type: opts.type,
        });
      } else {
        createColumn.mutate({
          tableId: activeTableId,
          name: opts?.name,
          type: opts?.type,
        });
      }
    },
    [activeTableId, createColumn],
  );

  const handleUpdateColumn = useCallback(
    (columnId: number, name?: string, type?: ColumnType) => {
      updateColumn.mutate({ id: columnId, name, type });
    },
    [updateColumn],
  );

  // Only send ONE of afterColumnId / beforeColumnId
  const handleReorderColumn = useCallback(
    (
      columnId: number,
      afterColumnId: number | null,
      beforeColumnId: number | null,
    ) => {
      if (afterColumnId != null) {
        reorderColumn.mutate({ id: columnId, afterColumnId });
      } else if (beforeColumnId != null) {
        reorderColumn.mutate({ id: columnId, beforeColumnId });
      }
    },
    [reorderColumn],
  );

  const handleSetPrimaryColumn = useCallback(
    (columnId: number) => {
      setPrimaryColumn.mutate({ id: columnId });
    },
    [setPrimaryColumn],
  );

  const handleDeleteColumn = useCallback(
    (columnId: number) => {
      deleteColumn.mutate({ id: columnId });
    },
    [deleteColumn],
  );

  return {
    handleAddColumn,
    handleUpdateColumn,
    handleReorderColumn,
    handleSetPrimaryColumn,
    handleDeleteColumn,
  };
}
