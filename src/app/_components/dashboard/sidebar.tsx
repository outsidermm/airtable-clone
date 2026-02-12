"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateBaseModal } from "./create-base-modal";

interface SidebarProps {
  currentPage?: "home" | "starred" | "shared";
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  currentPage = "home",
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(false);
  const [isCreateBaseModalOpen, setIsCreateBaseModalOpen] = useState(false);

  return (
    <aside
      className={`flex h-[100vh-14] flex-col border-r border-gray-200 bg-white transition-all duration-300 ${isCollapsed ? "w-14" : "w-64"}`}
    >
      {/* Navigation Menu */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-3">
        {/* Home */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 rounded-xs px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 ${
            currentPage === "home" && !isCollapsed ? "bg-gray-100" : ""
          }`}
          title="Home"
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          {!isCollapsed && "Home"}
        </Link>

        {/* Starred */}
        <div>
          <button
            onClick={() => !isCollapsed && setIsStarredOpen(!isStarredOpen)}
            className={`flex w-full items-center justify-between rounded-xs px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 ${
              currentPage === "starred" ? "bg-gray-100" : ""
            }`}
            title="Starred"
          >
            <div className="flex items-center gap-2.5">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
              {!isCollapsed && "Starred"}
            </div>
            {!isCollapsed && (
              <svg
                className={`h-3 w-3 shrink-0 transition-transform ${
                  isStarredOpen ? "" : "-rotate-90"
                }`}
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
            )}
          </button>
          {!isCollapsed && isStarredOpen && (
            <div className="mt-1 ml-7 flex flex-row gap-4 items-center">
              <svg
                className="h-7 w-7 shrink-0 text-gray-500 border p-1 border-gray-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
              <p className="text-[10px] text-gray-500">
                Your starred bases, interfaces, and workspaces will appear here
              </p>
            </div>
          )}
        </div>

        {/* Shared */}
        <Link
          href="/shared"
          className={`flex items-center gap-2.5 rounded-xs px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 ${
            currentPage === "shared" ? "bg-gray-100" : ""
          }`}
          title="Shared"
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {!isCollapsed && "Shared"}
        </Link>

        {/* All Workspaces */}
        <div>
          <button
            onClick={() =>
              !isCollapsed && setIsWorkspacesOpen(!isWorkspacesOpen)
            }
            className="flex w-full items-center justify-between rounded-xs px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            title="Workspaces"
          >
            <div className="flex items-center gap-2.5">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {!isCollapsed && "Workspaces"}
            </div>
            {!isCollapsed && (
              <button className="rounded p-0.5 hover:bg-gray-200">
                <svg
                  className="h-3 w-3"
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
              </button>
            )}
          </button>
          {!isCollapsed && isWorkspacesOpen && (
            <div className="mt-1 ml-7">
              <p className="px-2.5 py-2 text-xs text-gray-500">
                No workspaces yet
              </p>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 p-2">
        <div className="mb-1.5 space-y-0.5 text-xs">
          <button className="flex w-full items-center gap-2.5 rounded-xs px-2.5 py-1.5 text-gray-700 hover:bg-gray-100">
            <svg
              className="h-3.5 w-3.5 shrink-0"
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
            {!isCollapsed && "Template and apps"}
          </button>
          <button className="flex w-full items-center gap-2.5 rounded-xs px-2.5 py-1.5 text-gray-700 hover:bg-gray-100">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            {!isCollapsed && "Marketplace"}
          </button>
          <button className="flex w-full items-center gap-2.5 rounded-xs px-2.5 py-1.5 text-gray-700 hover:bg-gray-100">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {!isCollapsed && "Import"}
          </button>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setIsCreateBaseModalOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          {!isCollapsed && "Create"}
        </button>

        <CreateBaseModal
          isOpen={isCreateBaseModalOpen}
          onClose={() => setIsCreateBaseModalOpen(false)}
        />
      </div>
    </aside>
  );
}
