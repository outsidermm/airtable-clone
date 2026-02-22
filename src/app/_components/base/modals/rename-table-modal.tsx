"use client";
import React from "react";
import { useTableMutations } from "../../hooks/use-table-mutations";
import type { Table } from "~/types/table";
import type { Base } from "~/types/base";

interface RenameTableModalProps {
  base: Base;
  tables: Table[];
  table: Table;
  setRenamingTableId: (id: number | null) => void;
  renamingTableValue: string;
  setRenamingTableValue: (value: string) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
}

export function RenameTableModal({
  base,
  tables,
  table,
  setRenamingTableId,
  renamingTableValue,
  setRenamingTableValue,
  renameInputRef,
}: RenameTableModalProps) {
  const tableMutations = useTableMutations(base.id, tables);
  return (
    <React.Fragment>
      <div
        className="fixed inset-0 z-30"
        onClick={() => setRenamingTableId(null)}
      />
      <div className="absolute top-full z-1000 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <div className="mb-2">
          <input
            ref={renameInputRef}
            type="text"
            value={renamingTableValue}
            onChange={(e) => setRenamingTableValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renamingTableValue.trim()) {
                tableMutations.handleRenameTable(
                  table.id,
                  renamingTableValue.trim(),
                );
                setRenamingTableId(null);
              } else if (e.key === "Escape") {
                setRenamingTableId(null);
              }
            }}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <p className="mb-2 text-xs text-gray-700">
          What should each record be called?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setRenamingTableId(null)}
            className="rounded-md px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (renamingTableValue.trim()) {
                tableMutations.handleRenameTable(
                  table.id,
                  renamingTableValue.trim(),
                );
                setRenamingTableId(null);
              }
            }}
            disabled={!renamingTableValue.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}
