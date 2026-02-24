"use client";

/**
 * GridCell — the leaf render unit of the virtualized spreadsheet.
 *
 * Responsibility:
 *   Renders a single cell as either a read-only display chip or an active
 *   text input, controlled by the `isEditing` prop. Both modes share the same
 *   <input> element (readOnly toggled) to avoid DOM remounts and preserve
 *   cursor position on edit entry.
 *
 * Local-first input model:
 *   `localValue` state gives 0ms visual feedback — the input always reflects
 *   what the user typed, immediately. `onChange` (which triggers the 300ms
 *   debounce + tRPC mutation in the parent) is wrapped in `startTransition` so
 *   React can deprioritize the more expensive downstream work while keeping
 *   input rendering at full priority. A `useEffect` syncs `localValue` back
 *   from `displayValue` when the parent commits a new server value (e.g. after
 *   rollback or ID swap), ensuring the cell never drifts from server truth.
 *
 * Column-type validation:
 *   NUMBER columns reject non-numeric characters (letters, symbols) at the
 *   input boundary — before the value enters the debounce pipeline or tRPC
 *   mutation. This is a UX guard only; the backend independently validates
 *   cell values before persisting.
 *
 * Memoization contract:
 *   This component is memo'd. All props must be primitives or stable references
 *   to avoid defeating memoization. In particular, `onMouseDown`, `onMouseEnter`,
 *   `onDoubleClick`, `onChange`, and `onBlur` must be wrapped in useCallback in
 *   the parent (SortableRow / GridTable).
 */

import { memo, useEffect, useMemo, useState, useTransition } from "react";
import type { CellAddress } from "~/types/cell";
import type { ColumnType } from "generated/prisma/enums";

interface GridCellProps {
  rowId: number;
  columnId: number;
  width: number;
  value: string | number | null | undefined;
  columnType: ColumnType;
  // State
  isSelectedCell: boolean;
  isInMultiSelection: boolean;
  isEditing: boolean;
  showLastRowTooltip: boolean;
  highlight?: "green" | "orange";
  // Handlers
  onMouseDown: (rowId: number, columnId: number, e: React.MouseEvent) => void;
  onMouseEnter: (rowId: number, columnId: number) => void;
  onDoubleClick: (cell: CellAddress) => void;
  onChange: (rowId: number, columnId: number, value: string) => void;
  onBlur: () => void;
}

export const GridCell = memo(function GridCell({
  rowId,
  columnId,
  width,
  value,
  columnType,
  isSelectedCell,
  isInMultiSelection,
  isEditing,
  showLastRowTooltip,
  highlight,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onChange,
  onBlur,
}: GridCellProps) {
  const [, startTransition] = useTransition();

  const displayValue = useMemo(() => {
    if (value === null || value === undefined) return "";
    return String(value);
  }, [value]);

  // Local State for Instant Feedback
  const [localValue, setLocalValue] = useState(displayValue);
  const [showNumberWarning, setShowNumberWarning] = useState(false);

  useEffect(() => {
    setLocalValue(displayValue);
  }, [displayValue]);

  // Stable tooltip IDs derived from the cell address (rowId-columnId), matching
  // the same addressing scheme used for the container id (`cell-${rowId}-${columnId}`).
  const warningId = `cell-warning-${rowId}-${columnId}`;
  const tooltipId = `cell-tooltip-${rowId}-${columnId}`;

  // Optimized Change Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;

    // Block non-numeric characters (allowing digits, negative signs, and decimals)
    if (columnType === "NUMBER" && /[^\d.-]/.test(nextValue)) {
      setShowNumberWarning(true);
      return;
    } else {
      setShowNumberWarning(false);
    }

    // Priority 1: Update the input immediately (0ms latency)
    setLocalValue(nextValue);

    startTransition(() => {
      onChange(rowId, columnId, nextValue);
    });
  };

  // Determine Background
  let cellBg = "";
  if (isInMultiSelection) {
    cellBg = "bg-blue-50";
  } else if (highlight === "green") {
    cellBg = "bg-green-100";
  } else if (highlight === "orange") {
    cellBg = "bg-orange-100";
  }

  // Determine Ring/Border
  const borderClass = isSelectedCell
    ? "ring-2 ring-blue-500 ring-inset z-20"
    : "border-r border-gray-200";

  return (
    <div
      id={`cell-${rowId}-${columnId}`}
      role="gridcell"
      aria-selected={isSelectedCell}
      aria-readonly={!isEditing}
      className={`relative flex items-center px-2 ${borderClass} ${cellBg}`}
      style={{ width, minWidth: 80 }}
      onMouseDown={(e) => onMouseDown(rowId, columnId, e)}
      onMouseEnter={() => onMouseEnter(rowId, columnId)}
    >
      {/* inputMode hints the mobile keyboard type without constraining the input type,
          preserving our own numeric validation logic (digits, negative sign, decimal). */}
      <input
        type="text"
        inputMode={columnType === "NUMBER" ? "decimal" : "text"}
        value={localValue}
        readOnly={!isEditing}
        aria-readonly={!isEditing}
        aria-invalid={showNumberWarning || undefined}
        aria-describedby={
          showNumberWarning && isEditing
            ? warningId
            : showLastRowTooltip && isEditing && !showNumberWarning
              ? tooltipId
              : undefined
        }
        className={`w-full bg-transparent text-xs text-gray-900 outline-none ${
          !isEditing ? "cursor-default select-none" : ""
        }`}
        onDoubleClick={() => onDoubleClick({ rowId, columnId })}
        onChange={handleInputChange}
        onBlur={onBlur}
      />

      {/* Number Warning Tooltip */}
      {showNumberWarning && isEditing && (
        <div
          id={warningId}
          role="alert"
          className="absolute right-1 bottom-0.5 z-50 mb-1 px-2 py-1 text-[10px] whitespace-nowrap text-gray-500"
        >
          Please enter a number
        </div>
      )}

      {/* Shift+Enter Tooltip */}
      {showLastRowTooltip && isEditing && !showNumberWarning && (
        <div
          id={tooltipId}
          role="status"
          className="absolute right-1 bottom-0.5 z-50 mb-1 px-2 py-1 text-[10px] whitespace-nowrap text-gray-500"
        >
          Shift+Enter to create new row
        </div>
      )}
    </div>
  );
});
