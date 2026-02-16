"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { GridRow, GridColumn } from "~/types/grid";
import type { CellAddress } from "../../grid-table/types";
import { set } from "zod";

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

  const handleMouseDown = useCallback(
    (rowId: number, columnId: number, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setSelectedCell({ rowId, columnId });
      setSelectionStart({ rowId, columnId });
      setSelectionEnd({ rowId, columnId });
      setIsSelecting(true);
      setEditingCell(null); // Exit editing mode on new selection
    },
    [setEditingCell],
  );

  const handleMouseEnter = useCallback(
    (rowId: number, columnId: number) => {
      if (isSelecting) {
        setSelectionEnd({ rowId, columnId });
      }
    },
    [isSelecting],
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
