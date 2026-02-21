"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { GridRow, GridColumn } from "~/types/grid";
import type { CellAddress } from "~/types/cell";

export function useGridSelection(
  rows: GridRow[],
  columns: GridColumn[],
  setEditingCell: (cell: CellAddress | null) => void,
) {
  const [selectedCell, setSelectedCell] = useState<CellAddress | null>(null);
  const [selectionStart, setSelectionStart] = useState<CellAddress | null>(
    null,
  );
  const [selectionEnd, setSelectionEnd] = useState<CellAddress | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const isSelectingRef = useRef(false);

  // Optimized: Only re-calculates the Set when coordinates change
  const selectedCells = useMemo((): Set<string> => {
    if (!selectionStart || !selectionEnd) {
      if (selectedCell)
        return new Set([`${selectedCell.rowId}-${selectedCell.columnId}`]);
      return new Set();
    }

    const result = new Set<string>();
    const rowIds = rows.map((r) => r.id);
    const colIds = columns.map((c) => c.id);

    const r1 = rowIds.indexOf(selectionStart.rowId);
    const r2 = rowIds.indexOf(selectionEnd.rowId);
    const c1 = colIds.indexOf(selectionStart.columnId);
    const c2 = colIds.indexOf(selectionEnd.columnId);

    const rMin = Math.min(r1, r2);
    const rMax = Math.max(r1, r2);
    const cMin = Math.min(c1, c2);
    const cMax = Math.max(c1, c2);

    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const rid = rowIds[r];
        const cid = colIds[c];
        if (rid !== undefined && cid !== undefined) {
          result.add(`${rid}-${cid}`);
        }
      }
    }
    return result;
  }, [selectionStart, selectionEnd, selectedCell, rows, columns]);

  // Extract unique row IDs from the current cell selection to use in Record actions
  const selectedRowIdsFromCells = useMemo((): Set<number> => {
    const result = new Set<number>();
    if (!selectionStart || !selectionEnd) {
      if (selectedCell) result.add(selectedCell.rowId);
      return result;
    }

    const rowIds = rows.map((r) => r.id);
    const r1 = rowIds.indexOf(selectionStart.rowId);
    const r2 = rowIds.indexOf(selectionEnd.rowId);

    if (r1 !== -1 && r2 !== -1) {
      const rMin = Math.min(r1, r2);
      const rMax = Math.max(r1, r2);
      for (let r = rMin; r <= rMax; r++) {
        if (rowIds[r] !== undefined) {
          result.add(rowIds[r]!);
        }
      }
    }
    return result;
  }, [selectionStart, selectionEnd, selectedCell, rows]);

  const handleMouseDown = useCallback(
    (rowId: number, columnId: number, e: React.MouseEvent) => {
      if (e.button !== 0) return; // Ignore right-clicks to preserve selection
      setSelectedCell({ rowId, columnId });
      setSelectionStart({ rowId, columnId });
      setSelectionEnd({ rowId, columnId });
      setIsSelecting(true);
      setEditingCell(null); // Exit editing mode on new selection
    },
    [setEditingCell],
  );

  // Keep ref in sync so handleMouseEnter can be stable (empty dep array)
  useEffect(() => {
    isSelectingRef.current = isSelecting;
  }, [isSelecting]);

  const handleMouseEnter = useCallback(
    (rowId: number, columnId: number) => {
      if (isSelectingRef.current) {
        setSelectionEnd({ rowId, columnId });
      }
    },
    [],
  );

  // Global mouse up to stop selection state
  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return {
    selectedCell,
    setSelectedCell,
    selectionStart,
    setSelectionStart,
    selectionEnd,
    setSelectionEnd,
    isSelecting,
    selectedCells, // Pass this memoized set to rows
    selectedRowIdsFromCells, // Pass this out so the context menu can use it
    handleMouseDown,
    handleMouseEnter,
    // Helper to determine if we are in multi-select mode
    isMultiSelect: !!(
      selectionStart &&
      selectionEnd &&
      (selectionStart.rowId !== selectionEnd.rowId ||
        selectionStart.columnId !== selectionEnd.columnId)
    ),
  };
}