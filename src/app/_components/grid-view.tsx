"use client";

import { useState } from "react";

interface Column {
  id: string;
  name: string;
  type: string;
  width: number;
}

interface Row {
  id: string;
  cells: Record<string, string>;
}

interface GridViewProps {
  columns: Column[];
  rows: Row[];
}

export function GridView({ columns, rows }: GridViewProps) {
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
        {/* Left side buttons */}
        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
          Hide fields
        </button>

        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filter
        </button>

        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          Group
        </button>

        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          Sort
        </button>

        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          Color
        </button>

        <div className="mx-2 h-6 w-px bg-gray-300"></div>

        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share and sync
        </button>

        {/* Right side - Search */}
        <div className="ml-auto">
          <button className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          {/* Header Row */}
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {/* Row Number Header */}
              <th className="w-12 border-b border-r border-gray-200 bg-gray-50 p-0"></th>

              {/* Column Headers */}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="group border-b border-r border-gray-200 bg-gray-50 px-2 py-2 text-left"
                  style={{ width: column.width, minWidth: column.width }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="h-3 w-3 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16m-7 6h7"
                        />
                      </svg>
                      <span className="text-xs font-semibold text-gray-700">
                        {column.name}
                      </span>
                    </div>
                    <button className="invisible rounded p-0.5 hover:bg-gray-200 group-hover:visible">
                      <svg
                        className="h-3 w-3 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                </th>
              ))}

              {/* Add Column Button */}
              <th className="w-12 border-b border-r border-gray-200 bg-gray-50 p-0">
                <button className="flex h-full w-full items-center justify-center text-gray-400 hover:text-gray-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </th>
            </tr>
          </thead>

          {/* Data Rows */}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className="group hover:bg-gray-50">
                {/* Row Number */}
                <td className="border-b border-r border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
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
                      className={`border-b border-r border-gray-200 px-2 py-2 ${
                        isSelected ? "ring-2 ring-inset ring-blue-600" : ""
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
              <td className="border-b border-r border-gray-200 bg-gray-50"></td>
              <td
                colSpan={columns.length + 1}
                className="border-b border-r border-gray-200 px-2 py-2"
              >
                <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add...
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
