"use client";

import { UserMenu } from "./user-menu";

interface DashboardTopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardTopBar({ user }: DashboardTopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Left: Empty space for balance */}
      <div className="w-32"></div>

      {/* Center: Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <input
            type="search"
            placeholder="Search..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 pl-9 pr-14 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
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
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex w-32 items-center justify-end gap-2">
        {/* Help */}
        <button className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900">
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
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="hidden lg:inline">Help</span>
        </button>

        {/* Notifications */}
        <button className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100">
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* User Menu */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
