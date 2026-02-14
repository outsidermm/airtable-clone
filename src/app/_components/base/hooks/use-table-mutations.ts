import { useCallback } from "react";
import { api } from "~/trpc/react";

interface Table {
  id: number;
  name: string;
  baseId: string;
}

export function useTableMutations(
  baseId: string,
  tables: Table[],
  activeTableId: number,
  setActiveTableId: (id: number) => void,
) {
  const utils = api.useUtils();

  const createTable = api.table.create.useMutation({
    onSuccess: (newTable) => {
      void utils.table.getAllByBase.invalidate({ baseId });
      setActiveTableId(newTable.id);
    },
  });

  const renameTable = api.table.rename.useMutation({
    onSuccess: () => {
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const deleteTable = api.table.delete.useMutation({
    onSuccess: () => {
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  // const duplicateTable = api.table.duplicate.useMutation({
  //   onSuccess: (newTable) => {
  //     void utils.table.getAllByBase.invalidate({ baseId });
  //     setActiveTableId(newTable.id);
  //   },
  // });

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
      deleteTable.mutate(
        { id: tableId },
        {
          onSuccess: () => {
            if (tableId === activeTableId) {
              const remaining = tables.filter((t) => t.id !== tableId);
              if (remaining.length > 0) {
                setActiveTableId(remaining[0]!.id);
              }
            }
          },
        },
      );
    },
    [activeTableId, deleteTable, tables, setActiveTableId],
  );

  // const handleDuplicateTable = useCallback(
  //   (tableId: number) => {
  //     duplicateTable.mutate({ id: tableId });
  //   },
  //   [duplicateTable],
  // );

  return { handleAddTable, handleRenameTable, handleDeleteTable };
}
