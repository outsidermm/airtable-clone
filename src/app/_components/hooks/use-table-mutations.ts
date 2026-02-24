import { useCallback } from "react";
import { api } from "~/trpc/react";
import { useBase } from "../base/base-context";
import { useToast } from "~/app/_components/ui/toast";

interface Table {
  id: number;
  name: string;
  baseId: string;
}

export function useTableMutations(baseId: string, tables: Table[]) {
  const utils = api.useUtils();
  const toast = useToast();
  const { setRenamingTableId, setActiveTableId, activeTableId } = useBase();

  const createTable = api.table.create.useMutation({
    onSuccess: (newTable) => {
      void utils.table.getAllByBase.invalidate({ baseId });
      setActiveTableId(newTable.id);
      setRenamingTableId(newTable.id);
    },
    onError: () => toast.error("Couldn't create the table. Please try again."),
  });

  const renameTable = api.table.rename.useMutation({
    onMutate: async (input) => {
      await utils.table.getAllByBase.cancel({ baseId });
      const previousTables = utils.table.getAllByBase.getData({ baseId });
      if (previousTables) {
        utils.table.getAllByBase.setData(
          { baseId },
          previousTables.map((t) =>
            t.id === input.id ? { ...t, name: input.name } : t,
          ),
        );
      }
      return { previousTables };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
      toast.error("Couldn't rename the table. Please try again.");
    },
    onSettled: () => {
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const deleteTable = api.table.delete.useMutation({
    onMutate: async (variables) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await utils.table.getAllByBase.cancel({ baseId });

      // Snapshot the previous value
      const previousTables = utils.table.getAllByBase.getData({ baseId });

      // Optimistically update to the new value by filtering out the deleted table
      utils.table.getAllByBase.setData({ baseId }, (old) =>
        old?.filter((t) => t.id !== variables.id),
      );

      // Return a context object with the snapshotted value
      return { previousTables };
    },
    onSuccess: () => {
      toast.success("Table deleted");
    },
    onError: (_err, _vars, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
      toast.error("Couldn't delete the table. Please try again.");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server sync
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const handleAddTable = useCallback(() => {
    createTable.mutate({ baseId });
  }, [baseId, createTable]);

  const handleRenameTable = useCallback(
    (tableId: number, name: string) => {
      renameTable.mutate({ id: tableId, name });
    },
    [renameTable],
  );

  const handleDeleteTable = useCallback(
    (tableId: number) => {
      // Optimistically switch active table ID before mutating if needed
      if (tableId === activeTableId) {
        const remaining = tables.filter((t) => t.id !== tableId);
        if (remaining.length > 0) {
          setActiveTableId(remaining[0]!.id);
        }
      }

      deleteTable.mutate({ id: tableId });
    },
    [activeTableId, deleteTable, tables, setActiveTableId],
  );

  return { handleAddTable, handleRenameTable, handleDeleteTable };
}
