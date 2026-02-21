"use client";

import { useState } from "react";
import { PlusIcon } from "~/app/_components/ui/icons";
import { api } from "~/trpc/react";
import { useBase } from "../base-context";

interface Table {
  id: number;
  name: string;
}

interface TableTabsProps {
  tables: Table[];
  baseId: string;
  onTableChange?: (tableId: number) => void;
}

export function TableTabs({ tables, baseId, onTableChange }: TableTabsProps) {
  const {activeTableId} = useBase()
  const [isAddingTable, setIsAddingTable] = useState(false);

  const utils = api.useUtils();

  const createTable = api.table.create.useMutation({
    onSuccess: (newTable) => {
      void utils.table.getAllByBase.invalidate({ baseId });
      onTableChange?.(newTable.id);
      setIsAddingTable(false);
    },
  });

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1 px-4">
        {/* Table Tabs */}
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => onTableChange?.(table.id)}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              activeTableId === table.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {table.name}
          </button>
        ))}

        {/* Add Table Button */}
        {!isAddingTable ? (
          <button
            onClick={() => setIsAddingTable(true)}
            className="ml-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          >
            <PlusIcon className="h-4 w-4" />
            Add table
          </button>
        ) : (
          <div className="ml-2 flex items-center gap-2 py-2">
            <input
              type="text"
              placeholder="Table name"
              autoFocus
              className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onBlur={() => setIsAddingTable(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createTable.mutate({ baseId });
                } else if (e.key === "Escape") {
                  setIsAddingTable(false);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
