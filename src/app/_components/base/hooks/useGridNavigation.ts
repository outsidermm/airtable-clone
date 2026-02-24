"use client";

/**
 * useGridNavigation — document-level keyboard controller for the spreadsheet grid.
 *
 * Design decision — single capture-phase listener:
 *   A single `document.addEventListener('keydown', ..., { capture: true })` listener
 *   is used instead of per-cell handlers. Capture-phase ensures our logic runs before
 *   the browser's native focus management, preventing Tab from moving DOM focus between
 *   inputs and preventing Enter from natively submitting forms.
 *
 * Two-state selection model:
 *   `selectedCell` — the cell highlighted with a selection ring (grid cursor).
 *   `editingCell`  — the cell whose input is currently accepting text input.
 *   Most keys operate on `selectedCell`; Enter / any character key elevates it to
 *   `editingCell`. Escape always demotes `editingCell` back to `selectedCell`.
 *
 * Edit-mode arrow key override:
 *   ArrowUp/Down inside an active input moves the cursor to start/end of the string
 *   (matching standard spreadsheet UX) rather than navigating rows. ArrowLeft/Right
 *   are passed through unchanged to allow text cursor movement within the cell.
 *
 * Shift+Enter:
 *   Inserts a new row immediately below the current cell and clears edit mode.
 *   Delegates to useRowMutations.handleInsertRowBelow, which triggers the full
 *   optimistic insert cycle (temp ID, rowOrderOverride, pending edits flush).
 *
 * scrollToCell:
 *   Must account for the frozen column pane when checking horizontal visibility.
 *   `containerRect.left + frozenWidth` is the effective left scroll boundary;
 *   cells behind the frozen pane are hidden and require a negative scrollDeltaX
 *   to bring them into view.
 */

import { useEffect } from "react";
import type { GridRow, GridColumn } from "~/types/grid";
import type { CellAddress } from "~/types/cell";
import { useRowMutations } from "~/app/_components/hooks/use-row-mutations";
import { useBase } from "../base-context";
import { HEADER_HEIGHT } from "../constants";

interface UseGridNavigationProps {
  rows: GridRow[];
  primaryColumn: GridColumn | null;
  nonPrimaryColumns: GridColumn[];
  selectedCell: CellAddress | null;
  setSelectedCell: (cell: CellAddress | null) => void;
  editingCell: CellAddress | null;
  setEditingCell: (cell: CellAddress | null) => void;
  setShowLastRowTooltip: (show: boolean) => void;
  onCellUpdate?: (rowId: number, columnId: number, value: string) => void;
  frozenWidth?: number;
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
  frozenWidth = 0,
}: UseGridNavigationProps) {
  const { activeTableId } = useBase();
  const rowMutations = useRowMutations(activeTableId);

  useEffect(() => {
    const allColumns = primaryColumn
      ? [primaryColumn, ...nonPrimaryColumns]
      : nonPrimaryColumns;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isTabKey = e.key === "Tab";
      const isArrowKey = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key);

      // Helper to prevent rogue native focus from clinging to the input
      // after we programmatically exit edit mode.
      const clearNativeFocus = () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      };

      // 1. Handle Add Row (Shift + Enter)
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        const targetCell = editingCell ?? selectedCell;
        if (targetCell) {
          rowMutations.handleInsertRowBelow(targetCell.rowId);
          setEditingCell(null);
          setShowLastRowTooltip(false);
          clearNativeFocus();
        } else {
          rowMutations.handleAddRow();
        }
        return;
      }

      const isCurrentlyEditing = !!editingCell;

      // 2. Handle Editing Navigation Overrides
      if (isCurrentlyEditing) {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditingCell(null);
          setShowLastRowTooltip(false);
          clearNativeFocus();
          return;
        } else if (e.key === "Enter") {
          e.preventDefault();
          setEditingCell(null);
          clearNativeFocus();

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
                setTimeout(() => scrollToCell(nextCell, frozenWidth), 0);
              }
            } else {
              setShowLastRowTooltip(true);
              setTimeout(() => setShowLastRowTooltip(false), 3000);
            }
          }
          return;
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          // Move cursor to the front or back of the string natively
          e.preventDefault();
          const activeEl = document.activeElement as HTMLInputElement;
          if (activeEl && typeof activeEl.setSelectionRange === "function") {
            const pos = e.key === "ArrowUp" ? 0 : activeEl.value.length;
            activeEl.setSelectionRange(pos, pos);
          }
          return; // Stop grid navigation
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          // Let standard text cursor movement happen
          return; // Stop grid navigation
        }

        // If it's Tab, exit edit mode and fall through to navigation
        if (isTabKey) {
          e.preventDefault();
          setEditingCell(null);
          clearNativeFocus();
        } else {
          // Any other typing keys, ignore grid navigation
          return;
        }
      }

      // 3. Handle Standard Non-Editing Cell Actions
      if (selectedCell && !isCurrentlyEditing) {
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
        const isCharacterKey =
          e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isCharacterKey) {
          // No preventDefault here so the character can potentially be captured by the input
          setEditingCell(selectedCell);
          return;
        }
      }

      // 4. Standard Navigation Movements
      if (selectedCell && (isTabKey || (isArrowKey && !isCurrentlyEditing))) {
        e.preventDefault();

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
        } else if (e.key === "ArrowLeft" || (isTabKey && e.shiftKey)) {
          newColumnIndex = Math.max(0, currentColumnIndex - 1);
        } else if (e.key === "ArrowRight" || (isTabKey && !e.shiftKey)) {
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
          setTimeout(() => scrollToCell(newCell, frozenWidth), 0);
        }
      }
    };

    // CRITICAL: Set capture to true. This forces our code to run BEFORE the browser tries
    // to natively manage focus via Tab or swallow Enter keystrokes.
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
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
    onCellUpdate,
    frozenWidth,
  ]);
}

// Helper to scroll
function scrollToCell(cell: CellAddress, frozenWidth: number) {
  const cellId = `cell-${cell.rowId}-${cell.columnId}`;
  const cellElement = document.getElementById(cellId);
  if (!cellElement) return;

  const scrollContainer = cellElement.closest(".overflow-x-auto");
  if (!scrollContainer) {
    // Fallback if no scroll container is found
    cellElement.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const cellRect = cellElement.getBoundingClientRect();

  let scrollDeltaX = 0;
  let scrollDeltaY = 0;

  // 1. Check horizontal visibility against frozen pane & right edge
  if (cellRect.left < containerRect.left + frozenWidth) {
    // Hidden behind the left frozen panels
    scrollDeltaX = cellRect.left - (containerRect.left + frozenWidth) - 16;
  } else if (cellRect.right > containerRect.right) {
    // Hidden beyond the right scroll boundary
    scrollDeltaX = cellRect.right - containerRect.right + 16;
  }

  // 2. Check vertical visibility against top sticky header & bottom edge
  if (cellRect.top < containerRect.top + HEADER_HEIGHT) {
    // Hidden behind the top sticky header row
    scrollDeltaY = cellRect.top - (containerRect.top + HEADER_HEIGHT) - 16;
  } else if (cellRect.bottom > containerRect.bottom) {
    // Hidden beyond the bottom scroll boundary
    scrollDeltaY = cellRect.bottom - containerRect.bottom + 16;
  }

  if (scrollDeltaX !== 0 || scrollDeltaY !== 0) {
    scrollContainer.scrollBy({
      left: scrollDeltaX,
      top: scrollDeltaY,
      behavior: "smooth",
    });
  }
}