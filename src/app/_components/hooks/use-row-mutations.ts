import { useCallback } from "react";
import { api } from "~/trpc/react";
import { useBase } from "../base/base-context";

export function useRowMutations(activeTableId: number) {
  const { refetchRows } = useBase();
  const utils = api.useUtils();
  const createRow = api.row.create.useMutation({
    onSuccess: () => refetchRows(),
  });
  const bulkCreateRow = api.row.bulkCreate.useMutation({
    onSuccess: () => refetchRows(),
  });

  const bulkDeleteRow = api.row.bulkDelete.useMutation({
    onSuccess: () => refetchRows(),
  });

  const deleteRow = api.row.delete.useMutation({
    onMutate: async () => {
      await utils.row.getRows.cancel();
    },
    onSuccess: () => refetchRows(),
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
