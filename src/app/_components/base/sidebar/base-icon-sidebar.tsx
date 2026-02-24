"use client";

import Link from "next/link";
import Image from "next/image";
import { UserMenu } from "../../dashboard/user-menu";
import {
  ArrowLeftIcon,
  BellIcon,
  QuestionIcon,
} from "~/app/_components/ui/icons";

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
        className="group relative mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        title="Back to home"
      >
        <Image
          src="/airtable-black.svg"
          alt="Back to home"
          width={20}
          height={20}
          className="transition-opacity group-hover:opacity-0"
        />
        <ArrowLeftIcon className="absolute h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Bottom icons */}
      <div className="flex flex-col gap-4">
        {/* Help */}
        <button
          className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100"
          title="Get help"
        >
          <QuestionIcon className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          className="rounded-full border border-gray-100 p-1.5 text-gray-600 hover:bg-gray-100"
          title="Notifications"
        >
          <BellIcon className="h-4 w-4" />
        </button>

        {/* User Menu */}
        <UserMenu user={user} align="left" />
      </div>
    </aside>
  );
}
