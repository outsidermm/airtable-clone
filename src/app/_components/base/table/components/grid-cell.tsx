"use client";

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
      className={`relative flex items-center px-2 ${borderClass} ${cellBg}`}
      style={{ width, minWidth: 80 }}
      onMouseDown={(e) => onMouseDown(rowId, columnId, e)}
      onMouseEnter={() => onMouseEnter(rowId, columnId)}
    >
      <input
        type="text"
        value={localValue}
        readOnly={!isEditing}
        className={`w-full bg-transparent text-xs text-gray-900 outline-none ${
          !isEditing ? "cursor-default select-none" : ""
        }`}
        onDoubleClick={() => onDoubleClick({ rowId, columnId })}
        onChange={handleInputChange}
        onBlur={onBlur}
      />

      {/* Number Warning Tooltip */}
      {showNumberWarning && isEditing && (
        <div className="absolute right-1 bottom-0.5 z-50 mb-1 px-2 py-1 text-[10px] whitespace-nowrap text-gray-500">
          Please enter a number
        </div>
      )}

      {/* Existing Shift+Enter Tooltip */}
      {showLastRowTooltip && isEditing && !showNumberWarning && (
        <div className="absolute right-1 bottom-0.5 z-50 mb-1 px-2 py-1 text-[10px] whitespace-nowrap text-gray-500">
          Shift+Enter to create new row
        </div>
      )}
    </div>
  );
});
