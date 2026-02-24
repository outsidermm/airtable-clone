import { useCallback, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { pushQueryEntry } from "~/lib/query-log";
import type { GridRow } from "~/types/grid";
import { useToast } from "../ui/toast";

interface UseCellMutationsProps {
  allColumns: { id: number; type: string }[];
  registerOnRowCreated: (
    callback: (
      tempId: number,
      realRowId: number,
      cells?: Record<string, string | number | null>,
    ) => void,
  ) => void;
  registerOnColumnCreated: (
    callback: (tempColId: number, realColId: number) => void,
  ) => void;
  setRowOrderOverride: React.Dispatch<React.SetStateAction<number[] | null>>;
  notifyRowIdSwap: (tempId: number, realId: number) => void;
  pageStoreRef: React.RefObject<Map<number, GridRow[]>>;
  setPageStore: React.Dispatch<React.SetStateAction<Map<number, GridRow[]>>>;
  pendingOptimisticEditsRef: React.RefObject<
    Map<number, Record<string, string | number | null>>
  >;
  pendingColumnEditsRef: React.RefObject<
    Map<number, Map<number, string | number | null>>
  >;
}

export function useCellMutations({
  allColumns,
  registerOnRowCreated,
  registerOnColumnCreated,
  setRowOrderOverride,
  notifyRowIdSwap,
  pageStoreRef,
  setPageStore,
  pendingOptimisticEditsRef,
  pendingColumnEditsRef,
}: UseCellMutationsProps) {
  const toast = useToast();
  const cellUpdateStartRef = useRef<Map<string, number>>(new Map());

  const updateCell = api.cell.update.useMutation({
    onMutate: async (variables) => {
      const key = `${variables.rowId}:${variables.columnId}`;
      cellUpdateStartRef.current.set(key, Date.now());

      const colKey = String(variables.columnId);
      let previousValue: string | number | null | undefined = undefined;

      // Optimistically update the store immediately
      for (const [pageIndex, pageRows] of pageStoreRef.current) {
        const rowIdx = pageRows.findIndex((r) => r.id === variables.rowId);
        if (rowIdx !== -1) {
          previousValue = pageRows[rowIdx]!.cells[colKey];
          const newRows = [...pageRows];
          newRows[rowIdx] = {
            ...newRows[rowIdx]!,
            cells: { ...newRows[rowIdx]!.cells, [colKey]: variables.value },
          };
          pageStoreRef.current.set(pageIndex, newRows);
          setPageStore(new Map(pageStoreRef.current));
          break;
        }
      }

      return { previousValue };
    },
    onSuccess: (data, variables) => {
      const key = `${variables.rowId}:${variables.columnId}`;
      const startTime = cellUpdateStartRef.current.get(key);
      cellUpdateStartRef.current.delete(key);
      pushQueryEntry({
        path: "cell.update",
        label: `row=${variables.rowId} col=${variables.columnId}`,
        sqlMs: data.sqlMs,
        totalMs: startTime !== undefined ? Date.now() - startTime : 0,
      });

      // The local cache was already optimistically updated in onMutate,
      // so we don't need to overwrite it here unless it differs from the server.
    },
    onError: (error, variables, context) => {
      toast.error(error.message);

      // Rollback to the previous value if the mutation fails
      if (context?.previousValue !== undefined) {
        const colKey = String(variables.columnId);
        for (const [pageIndex, pageRows] of pageStoreRef.current) {
          const rowIdx = pageRows.findIndex((r) => r.id === variables.rowId);
          if (rowIdx !== -1) {
            const newRows = [...pageRows];
            newRows[rowIdx] = {
              ...newRows[rowIdx]!,
              cells: {
                ...newRows[rowIdx]!.cells,
                [colKey]: context.previousValue,
              },
            };
            pageStoreRef.current.set(pageIndex, newRows);
            setPageStore(new Map(pageStoreRef.current));
            break;
          }
        }
      }
    },
  });

  const handleCellUpdate = useCallback(
    (rowId: number, columnId: number, value: string) => {
      const col = allColumns.find((c) => c.id === columnId);
      if (!col) return;

      const colKey = String(columnId);
      const convertedValue: string | number | null =
        col.type === "NUMBER"
          ? isNaN(parseFloat(value))
            ? null
            : parseFloat(value)
          : value;

      const isTempRow = rowId < 0;
      const isTempCol = columnId < 0;

      // Temporary rows/columns cannot be saved immediately;
      // we only save them in state until their real IDs return.
      if (isTempRow || isTempCol) {
        for (const [pageIndex, pageRows] of pageStoreRef.current) {
          const rowIdx = pageRows.findIndex((r) => r.id === rowId);
          if (rowIdx !== -1) {
            const newRows = [...pageRows];
            newRows[rowIdx] = {
              ...newRows[rowIdx]!,
              cells: { ...newRows[rowIdx]!.cells, [colKey]: convertedValue },
            };
            pageStoreRef.current.set(pageIndex, newRows);
            setPageStore(new Map(pageStoreRef.current));
            break;
          }
        }

        if (isTempRow && !isTempCol) {
          const existing = pendingOptimisticEditsRef.current.get(rowId) ?? {};
          pendingOptimisticEditsRef.current.set(rowId, {
            ...existing,
            [colKey]: convertedValue,
          });
        } else if (isTempCol && !isTempRow) {
          const colEdits =
            pendingColumnEditsRef.current.get(columnId) ??
            new Map<number, string | number | null>();
          colEdits.set(rowId, convertedValue);
          pendingColumnEditsRef.current.set(columnId, colEdits);
        }
        return;
      }

      // Execute standard mutation (which will run our optimistic onMutate update)
      updateCell.mutate({ rowId, columnId, value: convertedValue });
    },
    [
      allColumns,
      updateCell,
      pageStoreRef,
      setPageStore,
      pendingOptimisticEditsRef,
      pendingColumnEditsRef,
    ],
  );

  const onRowCreatedImpl = useCallback(
    (
      tempId: number,
      realRowId: number,
      cells?: Record<string, string | number | null>,
    ) => {
      const pendingEdits = pendingOptimisticEditsRef.current.get(tempId);
      pendingOptimisticEditsRef.current.delete(tempId);

      notifyRowIdSwap(tempId, realRowId);

      for (const [pageIndex, pageRows] of pageStoreRef.current) {
        const rowIdx = pageRows.findIndex((r) => r.id === tempId);
        if (rowIdx !== -1) {
          const newRows = [...pageRows];
          newRows[rowIdx] = {
            ...newRows[rowIdx]!,
            id: realRowId,
            ...(cells !== undefined ? { cells } : {}),
          };
          pageStoreRef.current.set(pageIndex, newRows);
          setPageStore(new Map(pageStoreRef.current));
          break;
        }
      }

      setRowOrderOverride((prev) => {
        if (!prev) return prev;
        return prev.map((id) => (id === tempId ? realRowId : id));
      });

      if (pendingEdits) {
        for (const [colKey, value] of Object.entries(pendingEdits)) {
          updateCell.mutate({
            rowId: realRowId,
            columnId: Number(colKey),
            value,
          });
        }
      }
    },
    [
      updateCell,
      notifyRowIdSwap,
      pageStoreRef,
      setPageStore,
      pendingOptimisticEditsRef,
      setRowOrderOverride,
    ],
  );

  useEffect(() => {
    registerOnRowCreated(onRowCreatedImpl);
  }, [registerOnRowCreated, onRowCreatedImpl]);

  const onColumnCreatedImpl = useCallback(
    (tempColId: number, realColId: number) => {
      const pendingEdits = pendingColumnEditsRef.current.get(tempColId);
      pendingColumnEditsRef.current.delete(tempColId);

      const tempKey = String(tempColId);
      const realKey = String(realColId);
      let changed = false;
      for (const [pageIndex, pageRows] of pageStoreRef.current) {
        let pageChanged = false;
        const updatedRows = pageRows.map((row) => {
          if (tempKey in row.cells) {
            const { [tempKey]: val, ...rest } = row.cells;
            pageChanged = true;
            const newCells: Record<string, string | number | null> =
              val !== undefined ? { ...rest, [realKey]: val } : { ...rest };
            return { ...row, cells: newCells };
          }
          return row;
        });
        if (pageChanged) {
          pageStoreRef.current.set(pageIndex, updatedRows);
          changed = true;
        }
      }
      if (changed) setPageStore(new Map(pageStoreRef.current));

      if (pendingEdits) {
        for (const [rowId, value] of pendingEdits) {
          updateCell.mutate({ rowId, columnId: realColId, value });
        }
      }
    },
    [updateCell, pageStoreRef, setPageStore, pendingColumnEditsRef],
  );

  useEffect(() => {
    registerOnColumnCreated(onColumnCreatedImpl);
  }, [registerOnColumnCreated, onColumnCreatedImpl]);

  return {
    handleCellUpdate,
  };
}
