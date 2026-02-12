"use client";

import { useState } from "react";


export function ViewSidebar({ baseId: String }) {
  const [activeView, setActiveView] = useState("grid-view");

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      {/* Views Selector */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Grid View Dropdown */}
        <div className="mb-2">
          <button className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              <span>Grid view</span>
            </div>
            <svg
              className="h-3 w-3 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Create new... */}
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
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
          Create new...
        </button>

        {/* Find a view */}
        <button className="mt-2 flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 hover:border-gray-300">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Find a view
        </button>

        {/* Grid view item */}
        <div className="mt-3">
          <button
            onClick={() => setActiveView("grid-view")}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
              activeView === "grid-view"
                ? "bg-blue-50 font-medium text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
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
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
              />
            </svg>
            Grid view
          </button>
        </div>
      </div>
    </aside>
  );
}
