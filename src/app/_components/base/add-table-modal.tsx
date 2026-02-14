"use client";

import { useState, useEffect, useRef } from "react";

interface AddTableModalProps {
  onConfirm: (name: string) => void;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

export function AddTableModal({ onConfirm, onClose, anchorEl }: AddTableModalProps) {
  const [tableName, setTableName] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [anchorEl]);

  const handleConfirm = () => {
    if (tableName.trim()) {
      onConfirm(tableName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tableName.trim()) {
      handleConfirm();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const isDropdown = !!anchorEl && !!position;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} style={{ background: isDropdown ? 'transparent' : 'rgba(0,0,0,0.5)' }} />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-xl ${
          isDropdown ? 'fixed' : 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={isDropdown ? { top: position.top, left: position.left } : undefined}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Add table</h2>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <p className="mb-3 text-sm text-gray-600">
            Create a new table in this base.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Table name
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter table name..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
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
            disabled={!tableName.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create table
          </button>
        </div>
      </div>
    </>
  );
}
