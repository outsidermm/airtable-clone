"use client";

import Link from "next/link";
import Image from "next/image";
import { UserMenu } from "../dashboard/user-menu";

interface UserProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function BaseIconSidebar({ user }: UserProps) {
  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-gray-200 bg-white py-3">
      {/* Home/Back icon */}
      <Link
        href="/dashboard"
        className="group mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 relative"
        title="Back to home"
      >
        <Image
          src="/airtable-black.svg"
          alt="Back to home"
          width={20}
          height={20}
          className="group-hover:opacity-0 transition-opacity"
        />
        <svg
          className="h-5 w-5 absolute opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </Link>

      {/* Spacer */}
      <div className="flex-1"></div>
      
      {/* Bottom icons */}
      <div className="flex flex-col gap-4">
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
    </aside>
  );
}
