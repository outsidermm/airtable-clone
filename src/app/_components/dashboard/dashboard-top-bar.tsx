"use client";

import Link from "next/link";
import { UserMenu } from "./user-menu";
import Image from "next/image";

interface DashboardTopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSearchClick?: () => void;
}

export function DashboardTopBar({
  user,
  onToggleCollapse,
  onSearchClick,
}: DashboardTopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Left: Empty space for balance */}
      <div className="flex items-center gap-6">
        <button
          onClick={onToggleCollapse}
          className="p-1"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <svg
            className="h-4 w-4 text-gray-600 hover:text-gray-900 transition-all"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/airtable-color.svg"
            alt="Airtable Logo"
            width={24}
            height={24}
          />
          <span className="hidden text-sm font-semibold text-gray-800 sm:inline">
            AirTable
          </span>
        </Link>
      </div>

      {/* Center: Search */}
      <div className="max-w-sm flex-1">
        <div className="relative">
          <input
            type="search"
            placeholder="Search..."
            className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-1.5 pr-14 pl-9 text-xs hover:shadow-md cursor-pointer"
            onClick={onSearchClick}
            readOnly
          />
          <svg
            className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
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
          <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] text-gray-500">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex w-32 items-center justify-end gap-4">
        {/* Help */}
        <button className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100" title="Get help">
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
        </button>

        {/* Notifications */}
        <button className="rounded-full border border-gray-100 p-1.5 text-gray-600 hover:bg-gray-100" title="Notifications">
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
