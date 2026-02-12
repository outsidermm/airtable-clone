"use client";

import { useState, useRef, useCallback } from "react";

interface Column {
  id: number;
  name: string;
  type: string;
  width: number;
}

interface Row {
  id: number;
  cells: Record<number, string>;
}

interface GridViewProps {
  columns: Column[];
  rows: Row[];
  onCellUpdate?: (rowId: number, columnId: number, value: string) => void;
  onAddRow?: () => void;
  onAddColumn?: () => void;
}

export function GridView({ columns, rows, onCellUpdate, onAddRow, onAddColumn }: GridViewProps) {
  const [selectedCell, setSelectedCell] = useState<{
    rowId: number;
    columnId: number;
  } | null>(null);

  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleCellChange = useCallback(
    (rowId: number, columnId: number, value: string) => {
      if (!onCellUpdate) return;
      const key = `${rowId}-${columnId}`;
      const existing = debounceTimers.current.get(key);
      if (existing) clearTimeout(existing);
      debounceTimers.current.set(
        key,
        setTimeout(() => {
          onCellUpdate(rowId, columnId, value);
          debounceTimers.current.delete(key);
        }, 300),
      );
    },
    [onCellUpdate],
  );

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        {/* Header Row */}
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            {/* Row Number / Checkbox Header */}
            <th className="w-16.5 min-w-16.5 border-b border-r border-gray-200 bg-gray-50 p-0 text-center">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" />
            </th>

            {/* Column Headers */}
            {columns.map((column) => (
              <th
                key={column.id}
                className="group border-b border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-left"
                style={{ width: column.width, minWidth: column.width }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                    <span className="text-xs font-normal text-gray-700">
                      {column.name}
                    </span>
                  </div>
                  <button className="invisible rounded p-0.5 hover:bg-gray-200 group-hover:visible">
                    <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </th>
            ))}

            {/* Add Column Button */}
            <th className="w-12 border-b border-r border-gray-200 bg-gray-50 p-0">
              <button
                onClick={onAddColumn}
                className="flex h-full w-full items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </th>
          </tr>
        </thead>

        {/* Data Rows */}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id} className="group hover:bg-gray-50/50">
              {/* Row Number */}
              <td className="border-b border-r border-gray-200 bg-white text-center text-xs text-gray-400">
                {rowIndex + 1}
              </td>

              {/* Cells */}
              {columns.map((column) => {
                const cellValue = row.cells[column.id] ?? "";
                const isSelected =
                  selectedCell?.rowId === row.id &&
                  selectedCell?.columnId === column.id;

                return (
                  <td
                    key={column.id}
                    className={`border-b border-r border-gray-200 px-2 py-1.5 ${
                      isSelected ? "ring-2 ring-inset ring-blue-500" : ""
                    }`}
                    style={{ width: column.width, minWidth: column.width }}
                    onClick={() =>
                      setSelectedCell({ rowId: row.id, columnId: column.id })
                    }
                  >
                    <input
                      type="text"
                      defaultValue={cellValue}
                      className="w-full bg-transparent text-xs text-gray-900 outline-none"
                      placeholder=""
                      onChange={(e) =>
                        handleCellChange(row.id, column.id, e.target.value)
                      }
                    />
                  </td>
                );
              })}

              {/* Empty cell for add column button column */}
              <td className="border-b border-r border-gray-200"></td>
            </tr>
          ))}

          {/* Add Row Button */}
          <tr>
            <td className="border-b border-r border-gray-200 bg-white text-center">
              <button
                onClick={onAddRow}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="mx-auto h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </td>
            <td
              colSpan={columns.length + 1}
              className="border-b border-r border-gray-200"
            />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
