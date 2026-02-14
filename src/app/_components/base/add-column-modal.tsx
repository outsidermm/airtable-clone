"use client";

import { useState } from "react";
import type { ColumnType } from "generated/prisma/enums";

interface AddColumnModalProps {
  onConfirm: (name: string, type: ColumnType) => void;
  onClose: () => void;
}

export function AddColumnModal({ onConfirm, onClose }: AddColumnModalProps) {
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<ColumnType>("TEXT");

  const handleConfirm = () => {
    if (columnName.trim()) {
      onConfirm(columnName.trim(), columnType);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && columnName.trim()) {
      handleConfirm();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Add field</h2>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <div className="space-y-4">
            {/* Field name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Field name
              </label>
              <input
                type="text"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter field name..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Field type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Field type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setColumnType("TEXT")}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    columnType === "TEXT"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                  Text
                </button>
                <button
                  onClick={() => setColumnType("NUMBER")}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    columnType === "NUMBER"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                    />
                  </svg>
                  Number
                </button>
              </div>
            </div>
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
            disabled={!columnName.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create field
          </button>
        </div>
      </div>
    </>
  );
}
