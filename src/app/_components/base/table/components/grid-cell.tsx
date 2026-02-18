"use client";

import { memo, useEffect, useMemo, useState, useTransition } from "react";
import { HighlightedText } from "../../grid-table/highlighted-text";
import type { CellAddress } from "~/types/cell";
import { useBase } from "../../base-context";

interface GridCellProps {
  rowId: number;
  columnId: number;
  rowIndex: number;
  width: number;
  value: string | number | null | undefined;
  // State
  isSelectedCell: boolean;
  isInMultiSelection: boolean;
  isActiveSearch: boolean;
  isHighlighted: boolean;
  isEditing: boolean;
  searchQuery?: string;
  showLastRowTooltip: boolean;
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
  rowIndex,
  width,
  value,
  isSelectedCell,
  isInMultiSelection,
  isActiveSearch,
  isHighlighted,
  isEditing,
  searchQuery,
  showLastRowTooltip,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onChange,
  onBlur,
}: GridCellProps) {
  const { setContextMenu } = useBase();
  const [isPending, startTransition] = useTransition();

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
  if (isActiveSearch) {
    cellBg = "bg-yellow-300";
  } else if (isHighlighted) {
    cellBg = "bg-yellow-100";
  } else if (isInMultiSelection) {
    cellBg = "bg-blue-50";
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
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({
          type: "record",
          position: { x: e.clientX, y: e.clientY },
          data: { rowId, columnId, rowIndex },
        });
      }}
    >
      {cellBg === "bg-yellow-100" && searchQuery ? (
        <div className="w-full text-xs text-gray-900">
          <HighlightedText text={displayValue} query={searchQuery} />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
});
