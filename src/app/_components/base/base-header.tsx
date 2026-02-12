"use client";

import { useState } from "react";
import Link from "next/link";

interface Table {
  id: number;
  name: string;
}

interface BaseHeaderProps {
  base: {
    id: string;
    name: string;
    icon: string;
  };
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  tables?: Table[];
  activeTableId?: number;
  onTableChange?: (tableId: number) => void;
  onAddTable?: () => void;
}

export function BaseHeader({
  base,
  tables = [],
  activeTableId,
  onTableChange,
  onAddTable,
}: BaseHeaderProps) {
  const [activeTab, setActiveTab] = useState("data");
  const [tableMenuId, setTableMenuId] = useState<number | null>(null);

  return (
    <header className="shrink-0 bg-white">
      {/* Top Bar */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {/* Left: Back & Base Name */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100">
            <span className="text-base">{base.icon}</span>
            {base.name}
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex items-center gap-3">
          {(["Data", "Automations", "Interfaces", "Forms"] as const).map((tab) => {
            const tabKey = tab.toLowerCase();
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`px-1 py-5 text-sm font-medium transition-colors ${
                  activeTab === tabKey
                    ? "text-gray-900 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
            🚀 Launch
          </button>

          <button className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">
            Share
          </button>
        </div>
      </div>

      {/* Table Tabs Row */}
      <div className="flex items-end bg-gray-100">
        {/* Table Tabs */}
        <div className="flex items-end gap-0">
          {tables.map((table, index) => {
            const isActive = table.id === activeTableId;
            const isMenuOpen = tableMenuId === table.id;

            return (
              <div key={table.id} className="relative flex items-end">
                {/* Separator between inactive tabs */}
                {index > 0 && !isActive && tables[index - 1]?.id !== activeTableId && (
                  <div className="mb-2 h-4 w-px bg-gray-300" />
                )}

                <button
                  onClick={() => onTableChange?.(table.id)}
                  className={`group relative flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "rounded-t-md bg-white text-gray-900"
                      : "text-gray-600 hover:bg-gray-200/70 hover:rounded-t-md"
                  }`}
                >
                  {table.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTableMenuId(isMenuOpen ? null : table.id);
                    }}
                    className={`rounded p-0.5 ${
                      isActive
                        ? "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        : "text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-300/50 hover:text-gray-600"
                    }`}
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </button>
                {index === tables.length-1 && tables[index]?.id !== activeTableId && (
                  <div className="mb-2 h-4 w-px bg-gray-300" />
                )}

                {/* Table context menu */}
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setTableMenuId(null)} />
                    <div className="absolute left-0 top-full z-40 mt-0.5 w-56 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg">
                      <button
                        onClick={() => setTableMenuId(null)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import data
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => setTableMenuId(null)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Rename table
                      </button>
                      <button
                        onClick={() => setTableMenuId(null)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Duplicate table
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => setTableMenuId(null)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete table
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          <div className="mb-1 flex items-center gap-1 px-3 py-1.5">
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {/* Add or import button */}
          <button
            onClick={onAddTable}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:rounded-t-md hover:bg-gray-200/70 hover:text-gray-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add or import
          </button>
        </div>

        {/* Right: Tools */}
        <div className="mb-0 ml-auto flex items-center py-1.5">
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-200/70 hover:text-gray-700">
            Tools
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
