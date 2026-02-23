"use client";

import { useEffect } from "react";
import type { GridRow, GridColumn } from "~/types/grid";
import type { CellAddress } from "~/types/cell";
import { useRowMutations } from "~/app/_components/hooks/use-row-mutations";
import { useBase } from "../base-context";

interface UseGridNavigationProps {
  rows: GridRow[];
  primaryColumn: GridColumn | null;
  nonPrimaryColumns: GridColumn[];
  selectedCell: CellAddress | null;
  setSelectedCell: (cell: CellAddress | null) => void;
  editingCell: CellAddress | null;
  setEditingCell: (cell: CellAddress | null) => void;
  setShowLastRowTooltip: (show: boolean) => void;
  onCellUpdate?: (rowId: number, columnId: number, value: string) => void; // Added onCellUpdate
}

export function useGridNavigation({
  rows,
  primaryColumn,
  nonPrimaryColumns,
  selectedCell,
  setSelectedCell,
  editingCell,
  setEditingCell,
  setShowLastRowTooltip,
  onCellUpdate,
}: UseGridNavigationProps) {
  const { activeTableId } = useBase();
  const rowMutations = useRowMutations(activeTableId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Handle Add Row
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (selectedCell) {
          rowMutations.handleInsertRowBelow(selectedCell.rowId);
        }
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
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const activeEl = document.activeElement as HTMLInputElement;
          if (activeEl && typeof activeEl.setSelectionRange === "function") {
            const pos = e.key === "ArrowUp" ? 0 : activeEl.value.length;
            activeEl.setSelectionRange(pos, pos);
          }
        }

        return; // Don't do arrow navigation while editing
      }

      // 3. Handle Standard Navigation & Cell Actions
      const isArrowKey = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key);
      const isTabKey = e.key === "Tab";

      if (selectedCell && !editingCell) {
        // Handle Backspace / Delete to clear the cell
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          onCellUpdate?.(selectedCell.rowId, selectedCell.columnId, "");
          return;
        }

        // Handle Enter to start Edit Mode
        if (e.key === "Enter") {
          e.preventDefault();
          setEditingCell(selectedCell);
          return;
        }

        // Handle Typing to Start Edit Mode
        // This regex checks for single character keys (letters, numbers, symbols)
        const isCharacterKey =
          e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isCharacterKey) {
          // No preventDefault here so the character can potentially be captured by the input
          setEditingCell(selectedCell);
          return;
        }
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
        } else if (e.key === "ArrowDown" || (e.key === "Enter" && e.shiftKey)) {
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
    rowMutations,
    setEditingCell,
    setSelectedCell,
    setShowLastRowTooltip,
    onCellUpdate, // Added to dependency array
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
