import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CellAddress } from "~/types/cell";
import type { GridColumn } from "~/types/grid";
import { useBase } from "../base-context";

interface UseOptimisticIdsProps {
  setSelectedCell: Dispatch<SetStateAction<CellAddress | null>>;
  setEditingCell: Dispatch<SetStateAction<CellAddress | null>>;
  nonPrimaryColumns: GridColumn[];
}
export function useOptimisticIds({
  setSelectedCell,
  setEditingCell,
  nonPrimaryColumns,
}: UseOptimisticIdsProps) {
  const { registerRowIdSwapListener, registerColumnIdSwapListener } = useBase();
  const stableKeyMapRef = useRef<Map<number, string>>(new Map());

  const handleRowIdSwap = useCallback(
    (tempId: number, realRowId: number) => {
      const stableKey = stableKeyMapRef.current.get(tempId);
      if (stableKey) {
        stableKeyMapRef.current.delete(tempId);
        stableKeyMapRef.current.set(realRowId, stableKey);
      }
      setEditingCell((prev) =>
        prev?.rowId === tempId ? { ...prev, rowId: realRowId } : prev,
      );
      setSelectedCell((prev) =>
        prev?.rowId === tempId ? { ...prev, rowId: realRowId } : prev,
      );
    },
    [setSelectedCell, setEditingCell],
  );

  useEffect(() => {
    registerRowIdSwapListener(handleRowIdSwap);
  }, [registerRowIdSwapListener, handleRowIdSwap]);

  const stableColumnKeyMapRef = useRef<Map<number, string>>(new Map());

  const handleColumnIdSwap = useCallback(
    (tempId: number, realColId: number) => {
      const stableKey = stableColumnKeyMapRef.current.get(tempId);
      if (stableKey) {
        stableColumnKeyMapRef.current.delete(tempId);
        stableColumnKeyMapRef.current.set(realColId, stableKey);
      }
      setEditingCell((prev) =>
        prev?.columnId === tempId ? { ...prev, columnId: realColId } : prev,
      );
      setSelectedCell((prev) =>
        prev?.columnId === tempId ? { ...prev, columnId: realColId } : prev,
      );
    },
    [setSelectedCell, setEditingCell],
  );

  useEffect(() => {
    registerColumnIdSwapListener(handleColumnIdSwap);
  }, [registerColumnIdSwapListener, handleColumnIdSwap]);

  const columnKeyMap = useMemo(() => {
    const map = new Map<number, string>();
    nonPrimaryColumns.forEach((col, idx) => {
      if (col.id < 0) {
        const key = `temp-col-${idx}`;
        stableColumnKeyMapRef.current.set(col.id, key);
        map.set(col.id, key);
      } else {
        const stableKey = stableColumnKeyMapRef.current.get(col.id);
        if (stableKey) map.set(col.id, stableKey);
      }
    });
    return map;
  }, [nonPrimaryColumns]);
  return {columnKeyMap, stableKeyMapRef: stableKeyMapRef};
}
