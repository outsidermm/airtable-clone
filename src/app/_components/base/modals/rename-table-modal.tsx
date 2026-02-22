"use client";
import React from "react";
import { useTableMutations } from "../../hooks/use-table-mutations";
import type { Table } from "~/types/table";
import type { Base } from "~/types/base";
import { ChevronDownIcon, QuestionIcon } from "../../ui/icons";
import { SearchableSelect } from "../../ui/searchable-select";

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
  const [openDropdown, setOpenDropdown] = React.useState<boolean>(false);
  const [selectedDropdown, setSelectedDropdown] = React.useState<string>("");

  return (
    <React.Fragment>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 z-30"
        onClick={() => setRenamingTableId(null)}
      />

      {/* Modal Container */}
      <div className="absolute top-full z-1000 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        {/* Input */}
        <div className="mb-4">
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

        {/* Dropdown Label */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-700">
            What should each record be called?
          </p>
          <QuestionIcon className="h-4 w-4 text-gray-400" />
        </div>

        {/* Dropdown Container */}
        <div className="relative mb-5 w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown((open) => !open);
            }}
            className="flex w-full items-center justify-between rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-700"
          >
            <span className="truncate">
              {selectedDropdown.length >= 1 ? selectedDropdown : "Record"}
            </span>
            <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 text-gray-400" />
          </button>

          {/* Searchable Select Wrapper */}
          {openDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1">
              <SearchableSelect
                widthClass="w-66"
                searchPlaceholder="Find a term"
                options={[
                  { id: "record", label: "Record" },
                  { id: "project", label: "Project" },
                  { id: "task", label: "Task" },
                  { id: "event", label: "Event" },
                  { id: "request", label: "Request" },
                  { id: "campaign", label: "Campaign" },
                  { id: "objective", label: "Objective" },
                  { id: "asset", label: "Asset" },
                  { id: "deliverable", label: "Deliverable" },
                ]}
                onSelect={(opt) => {
                  setSelectedDropdown(opt.label);
                  setOpenDropdown(false);
                }}
                onClose={() => setOpenDropdown(false)}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setRenamingTableId(null)}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (renamingTableValue.trim()) {
                tableMutations.handleRenameTable(
                  table.id,
                  renamingTableValue.trim(),
                );
                // Note: Ensure `selectedDropdown` is handled in tableMutations if needed!
                setRenamingTableId(null);
              }
            }}
            disabled={!renamingTableValue.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}
