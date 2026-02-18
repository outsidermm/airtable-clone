"use client";

import Link from "next/link";
import { UserMenu } from "./user-menu";
import Image from "next/image";
import { BellIcon, QuestionIcon } from "~/app/_components/ui/icons";

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
          <QuestionIcon className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button className="rounded-full border border-gray-100 p-1.5 text-gray-600 hover:bg-gray-100" title="Notifications">
          <BellIcon className="h-4 w-4" />
        </button>

        {/* User Menu */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
