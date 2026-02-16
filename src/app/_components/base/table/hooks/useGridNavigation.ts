"use client";

import { useEffect } from "react";
import type { GridRow, GridColumn } from "~/types/grid";
import type { CellAddress } from "../../grid-table/types";

interface UseGridNavigationProps {
  rows: GridRow[];
  columns: GridColumn[];
  primaryColumn: GridColumn | null;
  nonPrimaryColumns: GridColumn[];
  selectedCell: CellAddress | null;
  setSelectedCell: (cell: CellAddress | null) => void;
  editingCell: CellAddress | null;
  setEditingCell: (cell: CellAddress | null) => void;
  onAddRow: () => void;
  setShowLastRowTooltip: (show: boolean) => void;
}

export function useGridNavigation({
  rows,
  columns,
  primaryColumn,
  nonPrimaryColumns,
  selectedCell,
  setSelectedCell,
  editingCell,
  setEditingCell,
  onAddRow,
  setShowLastRowTooltip,
}: UseGridNavigationProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Handle Add Row
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        onAddRow();
        setShowLastRowTooltip(false);
        return;
      }

      // 2. Handle Editing Navigation (Enter / Escape)
      if (editingCell) {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditingCell(null);
          setShowLastRowTooltip(false);
        } else if (e.key === "Enter") {
          e.preventDefault();
          setEditingCell(null);

          const currentRowIndex = rows.findIndex(
            (r) => r.id === editingCell.rowId,
          );
          if (currentRowIndex !== -1) {
            if (currentRowIndex < rows.length - 1) {
              const nextRow = rows[currentRowIndex + 1];
              if (nextRow) {
                const nextCell = {
                  rowId: nextRow.id,
                  columnId: editingCell.columnId,
                };
                setSelectedCell(nextCell);
                setTimeout(() => scrollToCell(nextCell), 0);
              }
            } else {
              setShowLastRowTooltip(true);
              setTimeout(() => setShowLastRowTooltip(false), 3000);
            }
          }
        }
        return; // Don't do arrow navigation while editing
      }

      // 3. Handle Standard Navigation
      const isArrowKey = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key);
      const isTabKey = e.key === "Tab";

      if (e.key === "Enter" && selectedCell && !editingCell) {
        e.preventDefault();
        setEditingCell(selectedCell);
        return;
      }

      if ((isArrowKey || isTabKey) && selectedCell) {
        e.preventDefault();

        const allColumns = primaryColumn
          ? [primaryColumn, ...nonPrimaryColumns]
          : nonPrimaryColumns;

        const currentRowIndex = rows.findIndex(
          (r) => r.id === selectedCell.rowId,
        );
        const currentColumnIndex = allColumns.findIndex(
          (c) => c.id === selectedCell.columnId,
        );

        if (currentRowIndex === -1 || currentColumnIndex === -1) return;

        let newRowIndex = currentRowIndex;
        let newColumnIndex = currentColumnIndex;

        if (e.key === "ArrowUp") {
          newRowIndex = Math.max(0, currentRowIndex - 1);
        } else if (e.key === "ArrowDown") {
          newRowIndex = Math.min(rows.length - 1, currentRowIndex + 1);
        } else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
          newColumnIndex = Math.max(0, currentColumnIndex - 1);
        } else if (e.key === "ArrowRight" || e.key === "Tab") {
          newColumnIndex = Math.min(
            allColumns.length - 1,
            currentColumnIndex + 1,
          );
        }

        const newRow = rows[newRowIndex];
        const newColumn = allColumns[newColumnIndex];

        if (newRow && newColumn) {
          const newCell = { rowId: newRow.id, columnId: newColumn.id };
          setSelectedCell(newCell);
          setTimeout(() => scrollToCell(newCell), 0);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    editingCell,
    selectedCell,
    rows,
    primaryColumn,
    nonPrimaryColumns,
    onAddRow,
    setEditingCell,
    setSelectedCell,
    setShowLastRowTooltip,
  ]);
}

// Helper to scroll
function scrollToCell(cell: CellAddress) {
  const cellId = `cell-${cell.rowId}-${cell.columnId}`;
  const cellElement = document.getElementById(cellId);
  if (cellElement) {
    cellElement.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }
}
