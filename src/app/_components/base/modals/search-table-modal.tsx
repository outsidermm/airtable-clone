import type { Table } from "~/types/table";
import {
  SearchIcon,
  CheckIcon,
  PlusIcon,
  ChevronRightIcon,
} from "../../ui/icons";
import React from "react";
import { useBase } from "../base-context";

interface SearchTableModalProps {
  setIsTableSearchOpen: (open: boolean) => void;
  tableSearchQuery: string;
  setTableSearchQuery: (query: string) => void;
  filteredTables: Table[];
  activeTableId: number | null;
  setActiveTableId: (id: number) => void;
  tableSearchRef: React.RefObject<HTMLInputElement | null>;
}

export function SearchTableModal({
  setIsTableSearchOpen,
  tableSearchQuery,
  setTableSearchQuery,
  filteredTables,
  activeTableId,
  setActiveTableId,
  tableSearchRef,
}: SearchTableModalProps) {
  const { openModal } = useBase();
  return (
    <React.Fragment>
      <div
        className="fixed inset-0 z-30"
        onClick={() => setIsTableSearchOpen(false)}
      />
      <div className="absolute top-full left-0 z-100 mt-1 w-96 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-lg">
        <div className="pb-2">
          <div className="flex items-center gap-2 rounded-md border-b border-gray-200 px-2 py-1.5">
            <SearchIcon className="h-3.5 w-3.5 text-gray-400" />
            <input
              ref={tableSearchRef}
              type="text"
              value={tableSearchQuery}
              onChange={(e) => setTableSearchQuery(e.target.value)}
              placeholder="Find a table"
              className="ml-2 w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filteredTables.map((table) => {
            const isActive = table.id === activeTableId;
            return (
              <button
                key={table.id}
                onClick={() => {
                  setActiveTableId(table.id);
                  setIsTableSearchOpen(false);
                  setTableSearchQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 transition-all hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  {isActive ? (
                    <CheckIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                  {table.name}
                </span>
              </button>
            );
          })}
          {filteredTables.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No tables found
            </div>
          )}
        </div>

        {/* Divider + Add table */}
        <div className="my-1.5 border-t border-gray-100" />
        <button
          onClick={(e) => {
            openModal("add-table", e.currentTarget);
            setIsTableSearchOpen(false);
            setTableSearchQuery("");
          }}
          className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
        >
          <span className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4 text-gray-400" />
            Add table
          </span>
          <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </div>
    </React.Fragment>
  );
}
