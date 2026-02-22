"use client";

import { memo, useEffect, useMemo, useState, useTransition } from "react";
import type { CellAddress } from "~/types/cell";

interface GridCellProps {
  rowId: number;
  columnId: number;
  width: number;
  value: string | number | null | undefined;
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

  useEffect(() => {
    setLocalValue(displayValue);
  }, [displayValue]);

  // Optimized Change Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;

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

      {showLastRowTooltip && isEditing && (
        <div className="absolute bottom-full left-0 z-50 mb-1 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg">
          Shift+Enter to create new row
          <div className="absolute top-full left-4 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
});
