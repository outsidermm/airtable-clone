/**
 * useRowMutations — exposes all row-level mutation handlers with a consistent
 * three-phase optimistic lifecycle: optimistic write → ID swap → rollback.
 *
 * Common pattern for structural mutations (create, delete, insert, duplicate):
 *   onMutate  → call the relevant optimisticXxx() from BaseContext, which writes
 *               into pageStoreRef immediately and returns { tempId, revert }.
 *   onSuccess → call onRowCreated(tempId, realId) to atomically swap the temp ID
 *               for the confirmed DB ID and flush any pending cell edits.
 *   onError   → call revert() to restore the pre-mutation pageStore / totalRowCount.
 *
 * No onSettled refetch on createRow / deleteRow:
 *   Immediate refetch after row creation would race against the 300ms debounced
 *   cell saves that fire if the user starts typing in the new row. The server
 *   response would return empty cells, overwriting typed values. The refetch is
 *   deferred to the next natural scroll-triggered page load or to explicit
 *   bulk operations that call refetchRows() after their own onSuccess.
 *
 * duplicateRow cell hydration:
 *   The server returns the full cloned cells object in the mutation response.
 *   Passing cells to onRowCreated populates the optimistic row immediately,
 *   so the duplicate appears fully populated in a single server round-trip with
 *   no separate fetch or skeleton state.
 */

import { useCallback } from "react";
import { api } from "~/trpc/react";
import { useBase } from "../base/base-context";
import { pushQueryEntry } from "~/lib/query-log";
import { useToast } from "~/app/_components/ui/toast";

export function useRowMutations(activeTableId: number) {
  const toast = useToast();
  const {
    refetchRows,
    optimisticAddRow,
    optimisticDeleteRow,
    optimisticInsertRowNear,
    onRowCreated,
  } = useBase();

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
        totalMs:
          context?.startTime !== undefined ? Date.now() - context.startTime : 0,
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
    onSuccess: (_data, variables) => {
      refetchRows();
      const count = variables.ids.length;
      toast.success(`${count} ${count === 1 ? "row" : "rows"} deleted`);
    },
    onError: () => toast.error("Couldn't delete rows. Please try again."),
  });

  // Mutation for insert-above / insert-below with persistent ordering
  const insertRowNearMutation = api.row.create.useMutation({
    onMutate: (vars) => {
      return {
        ...optimisticInsertRowNear(
          vars.tableId,
          vars.beforeRowId,
          vars.afterRowId,
        ),
        startTime: Date.now(),
      };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId !== undefined) onRowCreated(context.tempId, data.id);
    },
    onError: (_err, _vars, context) => {
      context?.revert?.();
    },
  });

  // Duplicate a row (copies cell data from the server)
  const duplicateRowMutation = api.row.duplicate.useMutation({
    onMutate: (vars) => {
      return {
        ...optimisticInsertRowNear(activeTableId, undefined, vars.id),
        startTime: Date.now(),
      };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId !== undefined) {
        // Pass cells so the temp row shows the duplicated data without a refetch
        onRowCreated(
          context.tempId,
          data.id,
          data.cells as Record<string, string | number | null>,
        );
      }
    },
    onError: (_err, _vars, context) => {
      context?.revert?.();
    },
  });

  const reorderRowMutation = api.row.reorder.useMutation({});

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
        totalMs:
          context?.startTime !== undefined ? Date.now() - context.startTime : 0,
      });
    },
    onError: (_err, _vars, context) => {
      // Restore the row if the server rejected the deletion
      context?.revert();
    },
    // Removed onSettled refetch to preserve rowOrderOverride and prevent visual layout shifts
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

  const handleInsertRowAbove = useCallback(
    (rowId: number) => {
      insertRowNearMutation.mutate({
        tableId: activeTableId,
        beforeRowId: rowId,
      });
    },
    [activeTableId, insertRowNearMutation],
  );

  const handleInsertRowBelow = useCallback(
    (rowId: number) => {
      insertRowNearMutation.mutate({
        tableId: activeTableId,
        afterRowId: rowId,
      });
    },
    [activeTableId, insertRowNearMutation],
  );

  const handleDuplicateRow = useCallback(
    (rowId: number) => {
      duplicateRowMutation.mutate({ id: rowId });
    },
    [duplicateRowMutation],
  );

  const handleReorderRowPersisted = useCallback(
    (id: number, prevId: number | null, nextId: number | null) => {
      reorderRowMutation.mutate({ id, prevId, nextId });
    },
    [reorderRowMutation],
  );

  return {
    handleAddRow,
    handleBulkAddRow,
    handleDeleteRow,
    handleBulkDeleteRow,
    handleInsertRowAbove,
    handleInsertRowBelow,
    handleDuplicateRow,
    handleReorderRowPersisted,
  };
}
