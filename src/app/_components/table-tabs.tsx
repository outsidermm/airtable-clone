"use client";

import { useState } from "react";

interface Table {
  id: string;
  name: string;
  icon: string;
}

interface TableTabsProps {
  tables: Table[];
  activeTableId: string;
}

export function TableTabs({ tables, activeTableId }: TableTabsProps) {
  const [activeTab, setActiveTab] = useState(activeTableId);
  const [isAddingTable, setIsAddingTable] = useState(false);

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1 px-4">
        {/* Table Tabs */}
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => setActiveTab(table.id)}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === table.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="text-base">{table.icon}</span>
            {table.name}
          </button>
        ))}

        {/* Add Table Button */}
        {!isAddingTable ? (
          <button
            onClick={() => setIsAddingTable(true)}
            className="ml-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          >
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
                  // TODO: Create new table
                  setIsAddingTable(false);
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
