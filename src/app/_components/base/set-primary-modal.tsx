"use client";

import { useState } from "react";
import type { GridColumn } from "~/types/grid";

interface SetPrimaryModalProps {
  columns: GridColumn[];
  currentPrimaryId: number;
  onConfirm: (columnId: number) => void;
  onClose: () => void;
}

export function SetPrimaryModal({
  columns,
  currentPrimaryId,
  onConfirm,
  onClose,
}: SetPrimaryModalProps) {
  const [selectedColumnId, setSelectedColumnId] = useState<number>(currentPrimaryId);

  const handleConfirm = () => {
    if (selectedColumnId !== currentPrimaryId) {
      onConfirm(selectedColumnId);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Set primary field</h2>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <p className="mb-3 text-sm text-gray-600">
            Select which field should be the primary field. The primary field will be displayed first and cannot be hidden.
          </p>

          <div className="space-y-1">
            {columns.map((col) => (
              <label
                key={col.id}
                className={`flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
                  selectedColumnId === col.id
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="primaryField"
                  value={col.id}
                  checked={selectedColumnId === col.id}
                  onChange={() => setSelectedColumnId(col.id)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-1.5">
                  <svg
                    className="h-3.5 w-3.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        col.type === "NUMBER"
                          ? "M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                          : "M4 6h16M4 12h16m-7 6h7"
                      }
                    />
                  </svg>
                  <span>{col.name}</span>
                  {col.primary && (
                    <span className="ml-1 text-xs text-gray-500">(current)</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedColumnId === currentPrimaryId}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Set as primary
          </button>
        </div>
      </div>
    </>
  );
}
