import { useCallback } from "react";
import { api } from "~/trpc/react";
import type { ColumnType } from "generated/prisma/enums";

export function useColumnMutations(activeTableId: number) {
  const utils = api.useUtils();

  const invalidate = useCallback(() => {
    void utils.table.getById.invalidate({ id: activeTableId });
    void utils.row.getRows.invalidate({ tableId: activeTableId });
    void utils.view.getData.invalidate();
  }, [utils, activeTableId]);

  const createColumn = api.column.create.useMutation({ onSuccess: invalidate });
  const updateColumn = api.column.update.useMutation({ onSuccess: invalidate });
  const reorderColumn = api.column.reorder.useMutation({ onSuccess: invalidate });
  const setPrimaryColumn = api.column.setPrimary.useMutation({
    onSuccess: invalidate,
  });
  const deleteColumn = api.column.delete.useMutation({ onSuccess: invalidate });

  // Only send ONE of afterColumnId / beforeColumnId — backend rejects both
  const handleAddColumn = useCallback(
    (opts?: { afterColumnId?: number; beforeColumnId?: number }) => {
      if (opts?.afterColumnId != null) {
        createColumn.mutate({
          tableId: activeTableId,
          afterColumnId: opts.afterColumnId,
        });
      } else if (opts?.beforeColumnId != null) {
        createColumn.mutate({
          tableId: activeTableId,
          beforeColumnId: opts.beforeColumnId,
        });
      } else {
        createColumn.mutate({ tableId: activeTableId });
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
