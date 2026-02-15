import { useCallback } from "react";
import { api } from "~/trpc/react";

export function useRowMutations(activeTableId: number) {
  const utils = api.useUtils();

  const invalidateRows = useCallback(() => {
    void utils.row.getRows.invalidate({ tableId: activeTableId });
    void utils.view.getData.invalidate();
  }, [utils, activeTableId]);

  const createRow = api.row.create.useMutation({ onSuccess: invalidateRows });
  const bulkCreateRow = api.row.bulkCreate.useMutation({
    onSuccess: invalidateRows,
  });
  const deleteRow = api.row.delete.useMutation({ onSuccess: invalidateRows });
  const bulkDeleteRow = api.row.bulkDelete.useMutation({
    onSuccess: invalidateRows,
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

  return { handleAddRow, handleBulkAddRow, handleDeleteRow, handleBulkDeleteRow };
}
