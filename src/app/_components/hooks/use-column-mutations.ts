import { useCallback } from "react";
import { api } from "~/trpc/react";
import { ColumnType } from "generated/prisma/enums";
import { useBase } from "../base/base-context";

export function useColumnMutations(activeTableId: number) {
  const utils = api.useUtils();
  const { onColumnCreated, notifyColumnIdSwap } = useBase();

  const invalidate = useCallback(() => {
    // Only invalidate the table schema — row data doesn't change when columns are added/deleted
    void utils.table.getById.invalidate({ id: activeTableId });
  }, [utils, activeTableId]);

  // Helper to get current table data from cache
  const getTableData = useCallback(
    () => utils.table.getById.getData({ id: activeTableId }),
    [utils, activeTableId],
  );

  const createColumn = api.column.create.useMutation({
    onMutate: async (input) => {
      // Cancel any in-flight refetch to avoid it overwriting our optimistic state
      await utils.table.getById.cancel({ id: activeTableId });
      const previousData = getTableData();

      if (previousData) {
        const tempId = -(Date.now());
        const columnCount = previousData.columns.length;
        const tempColumn = {
          id: tempId,
          name: input.name ?? `Column ${columnCount + 1}`,
          type: (input.type ?? ColumnType.TEXT) as ColumnType,
          order: "zzz~temp",
          primary: false,
          tableId: activeTableId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        utils.table.getById.setData({ id: activeTableId }, {
          ...previousData,
          columns: [...previousData.columns, tempColumn],
        });
        return { previousData, tempId };
      }
      return { previousData };
    },
    onSuccess: (newColumn, _vars, context) => {
      // Replace the temp column with the real one returned by the server
      if (context?.tempId !== undefined) {
        // Notify grid-table to update stable column key map + selection state BEFORE setData
        notifyColumnIdSwap(context.tempId, newColumn.id);
        // Flush any buffered cell edits for cells typed while column was still temp
        onColumnCreated(context.tempId, newColumn.id);
        const currentData = getTableData();
        if (currentData) {
          utils.table.getById.setData({ id: activeTableId }, {
            ...currentData,
            columns: currentData.columns.map((c) =>
              c.id === context.tempId ? { ...newColumn, tableId: activeTableId } : c,
            ),
          });
        }
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        utils.table.getById.setData({ id: activeTableId }, context.previousData);
      }
    },
    onSettled: invalidate,
  });

  const updateColumn = api.column.update.useMutation({ onSuccess: invalidate });
  const reorderColumn = api.column.reorder.useMutation({
    onSuccess: invalidate,
  });
  const setPrimaryColumn = api.column.setPrimary.useMutation({
    onSuccess: invalidate,
  });

  const duplicateColumn = api.column.duplicate.useMutation({
    onSuccess: invalidate,
  });

  const deleteColumn = api.column.delete.useMutation({
    onMutate: async (input) => {
      await utils.table.getById.cancel({ id: activeTableId });
      const previousData = getTableData();

      if (previousData) {
        utils.table.getById.setData({ id: activeTableId }, {
          ...previousData,
          columns: previousData.columns.filter((c) => c.id !== input.id),
        });
      }
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        utils.table.getById.setData({ id: activeTableId }, context.previousData);
      }
    },
    onSettled: invalidate,
  });

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

  const handleDuplicateColumn = useCallback(
    (columnId: number) => {
      duplicateColumn.mutate({ id: columnId });
    },
    [duplicateColumn],
  );

  return {
    handleAddColumn,
    handleUpdateColumn,
    handleReorderColumn,
    handleSetPrimaryColumn,
    handleDeleteColumn,
    handleDuplicateColumn,
  };
}
