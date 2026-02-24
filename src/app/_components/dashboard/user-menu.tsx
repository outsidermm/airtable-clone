"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  UserIcon,
  UsersIcon,
  BellIcon,
  ColorIcon,
  MailIcon,
  LightningIcon,
  ChatIcon,
  SettingsIcon,
  BuildingIcon,
  TrashIcon,
  LogoutIcon,
  ChevronRightIcon,
} from "~/app/_components/ui/icons";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  /**
   * Controls which direction the dropdown opens relative to the avatar button.
   * "right" (default): dropdown opens downward, right-aligned — for top-right header usage.
   * "left": dropdown opens upward and to the right — for bottom-left sidebar usage.
   */
  align?: "right" | "left";
}

export function UserMenu({ user, align = "right" }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold text-white hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "User"}
            className="rounded-full"
            height={28}
            width={28}
          />
        ) : (
          initials
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-65 w-80 rounded-xl border border-gray-200 bg-white shadow-lg focus:outline-none ${
            align === "left"
              ? "left-full bottom-0 ml-2 origin-bottom-left"
              : "right-0 mt-2 origin-top-right"
          }`}
        >
          {/* User Info */}
          <div className="border-b border-gray-200 px-1 py-4 mx-4">
            <p className="text-gray-900">{user.name}</p>
            <p className="mt-0.5 text-sm text-gray-600">{user.email}</p>
          </div>

          {/* Account Section */}
          <div className="border-b border-gray-200 py-2 mx-4">
            <button className="flex w-full items-center px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <UserIcon className="mr-3 h-5 w-5 text-gray-500" />
              Account
            </button>

            <button className="flex w-full items-center justify-between px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <div className="flex items-center">
                <UsersIcon className="mr-3 h-5 w-5 text-gray-500" />
                Manage groups
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Business
              </span>
            </button>

            <button className="flex w-full items-center justify-between px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <div className="flex items-center">
                <BellIcon className="mr-3 h-5 w-5 text-gray-500" />
                Notification preferences
              </div>
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
            </button>

            <button className="flex w-full items-center justify-between px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <div className="flex items-center">
                <svg
                  className="mr-3 h-5 w-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
                Language preferences
              </div>
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
            </button>

            <button className="flex w-full items-center justify-between px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <div className="flex items-center">
                <ColorIcon className="mr-3 h-5 w-5 text-gray-500" />
                <div className="flex items-center gap-4">
                  Appearance
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                    Beta
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          </div>

          {/* Actions Section */}
          <div className="border-b border-gray-200 py- mx-4">
            <button className="flex w-full items-center px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <MailIcon className="mr-3 h-5 w-5 text-gray-500" />
              Contact sales
            </button>

            <button className="flex w-full items-center px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <LightningIcon className="mr-3 h-5 w-5 text-gray-500" />
              Upgrade
            </button>

            <button className="flex w-full items-center px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <ChatIcon className="mr-3 h-5 w-5 text-gray-500" />
              Tell a friend
            </button>
          </div>

          {/* Tools Section */}
          <div className="border-b border-gray-200 py-2 mx-4">
            <button className="flex w-full items-center px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <SettingsIcon className="mr-3 h-5 w-5 text-gray-500" />
              Integrations
            </button>

            <button className="flex w-full items-center px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <BuildingIcon className="mr-3 h-5 w-5 text-gray-500" />
              Builder hub
            </button>
          </div>

          {/* Bottom Section */}
          <div className="py-2 mx-4">
            <button className="flex w-full items-center px-1 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <TrashIcon className="mr-3 h-5 w-5 text-gray-500" />
              Trash
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center px-1.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogoutIcon className="mr-3 h-5 w-5 text-gray-500" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
