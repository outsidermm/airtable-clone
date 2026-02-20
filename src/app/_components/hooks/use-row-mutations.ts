import { useCallback } from "react";
import { api } from "~/trpc/react";
import { useBase } from "../base/base-context";
import { pushQueryEntry } from "~/lib/query-log";

export function useRowMutations(activeTableId: number) {
  const { refetchRows, optimisticAddRow, optimisticDeleteRow, onRowCreated } = useBase();

  const createRow = api.row.create.useMutation({
    onMutate: () => {
      // Show the new row immediately at the bottom of the table
      return { ...optimisticAddRow(), startTime: Date.now() };
    },
    onSuccess: (data, _vars, context) => {
      // Swap the temp ID for the real row ID and flush any pending cell edits
      const tempId = context?.tempId;
      if (tempId !== undefined) {
        onRowCreated(tempId, data.id);
      }
      pushQueryEntry({
        path: "row.create",
        label: `rowId=${data.id}`,
        sqlMs: data.sqlMs,
        totalMs: context?.startTime !== undefined ? Date.now() - context.startTime : 0,
      });
    },
    onError: (_err, _vars, context) => {
      // Revert the optimistic row if the server rejected the mutation
      context?.revert();
    },
    // No onSettled refetch — onRowCreatedImpl handles in-place update.
    // Refetching here would race against pending cell saves and briefly blank typed values.
  });

  const bulkCreateRow = api.row.bulkCreate.useMutation({
    onSuccess: () => refetchRows(),
  });

  const bulkDeleteRow = api.row.bulkDelete.useMutation({
    onSuccess: () => refetchRows(),
  });

  const deleteRow = api.row.delete.useMutation({
    onMutate: ({ id }) => {
      // Remove the row immediately so the user sees instant feedback
      return { ...optimisticDeleteRow(id), startTime: Date.now() };
    },
    onSuccess: (data, _vars, context) => {
      pushQueryEntry({
        path: "row.delete",
        label: `rowId=${data.id}`,
        sqlMs: data.sqlMs,
        totalMs: context?.startTime !== undefined ? Date.now() - context.startTime : 0,
      });
    },
    onError: (_err, _vars, context) => {
      // Restore the row if the server rejected the deletion
      context?.revert();
    },
    onSettled: () => refetchRows(),
  });

  const handleAddRow = useCallback(() => {
    createRow.mutate({ tableId: activeTableId });
  }, [activeTableId, createRow]);

  const handleBulkAddRow = useCallback(
    (count: number) => {
      bulkCreateRow.mutate({ tableId: activeTableId, count });
    },
    [activeTableId, bulkCreateRow],
  );

  const handleDeleteRow = useCallback(
    (rowId: number) => {
      deleteRow.mutate({ id: rowId });
    },
    [deleteRow],
  );

  const handleBulkDeleteRow = useCallback(
    (rowIds: number[]) => {
      bulkDeleteRow.mutate({ ids: rowIds });
    },
    [bulkDeleteRow],
  );

  return {
    handleAddRow,
    handleBulkAddRow,
    handleDeleteRow,
    handleBulkDeleteRow,
  };
}
