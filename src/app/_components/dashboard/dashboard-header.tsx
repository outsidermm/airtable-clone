"use client";

import { UserMenu } from "./user-menu";
import Image from "next/image";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-8">
          <Image src="/airtable-color.svg" alt="Airtable Logo" width={32} height={32} />
          AirTable
        </div>

        {/* Center: Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <button className="text-sm font-medium text-gray-900 hover:text-blue-600">
            Home
          </button>
          <button className="text-sm text-gray-600 hover:text-gray-900">
            Shared with me
          </button>
          <button className="text-sm text-gray-600 hover:text-gray-900">
            Trash
          </button>
        </nav>

        {/* Right: Search & User Menu */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:block">
            <div className="relative">
              <input
                type="search"
                placeholder="Search..."
                className="w-64 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
            </div>
          </div>

          {/* Notifications */}
          <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <svg
              className="h-5 w-5"
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

          {/* Help */}
          <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <svg
              className="h-5 w-5"
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

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
