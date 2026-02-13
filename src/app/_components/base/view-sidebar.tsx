"use client";

import { useState } from "react";
import type { ViewConfig } from "~/server/api/routers/view";

interface ViewSidebarProps {
  isOpen: boolean;
  onAddView?: () => void;
  onRenameView?: (viewId: number, newName: string) => void;
  onUpdateView?: (viewId: number, config: ViewConfig) => void;
  onDeleteView?: (viewId: number) => void;
}

export function ViewSidebar({ isOpen, onAddView, onRenameView, onUpdateView, onDeleteView }: ViewSidebarProps) {
  const [activeView, setActiveView] = useState("grid-view");

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200 ease-in-out overflow-hidden ${
        isOpen ? "w-64 opacity-100" : "w-0 border-r-0 opacity-0"
      }`}
    >
      <div className="flex-1 overflow-y-auto p-2 min-w-64">
        {/* Create new view */}
        <button className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 mb-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create new...
        </button>

        {/* Search views */}
        <div className="mb-2">
          <button className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500 hover:border-gray-300">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find a view
          </button>
        </div>

        {/* Grid view item */}
        <button
          onClick={() => setActiveView("grid-view")}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
            activeView === "grid-view"
              ? "bg-blue-50 font-medium text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18M3 6h18M3 18h18"
            />
          </svg>
          Grid view
        </button>
      </div>
    </aside>
  );
}
