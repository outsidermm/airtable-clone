"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateBaseModal } from "./create-base-modal";
import { api } from "~/trpc/react";
import { getStoredBaseColor } from "~/lib/base-color-storage";
import {
  HomeIcon,
  StarOutlineIcon,
  ChevronDownIcon,
  UsersIcon,
  BriefcaseIcon,
  PlusIcon,
  ViewGridIcon,
  ShoppingBagIcon,
  UploadIcon,
  ChevronRightIcon,
} from "~/app/_components/ui/icons";

interface SidebarProps {
  currentPage?: "home" | "starred" | "shared";
  isCollapsed?: boolean;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
}

export function Sidebar({
  currentPage = "home",
  isCollapsed = false,
  onHoverEnter,
  onHoverLeave,
}: SidebarProps) {
  const [isStarredOpen, setIsStarredOpen] = useState(true);
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(false);
  const [isCreateBaseModalOpen, setIsCreateBaseModalOpen] = useState(false);

  const utils = api.useUtils();
  const { data: starredBases = [] } = api.base.getStarred.useQuery();

  return (
    <aside
      className={`flex h-[100vh-14] flex-col border-r border-gray-200 bg-white transition-all duration-300 ${isCollapsed ? "w-14" : "w-64"}`}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
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
          <HomeIcon className="h-4 w-4 shrink-0" />
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
              <StarOutlineIcon className="h-4 w-4 shrink-0" />
              {!isCollapsed && "Starred"}
            </div>
            {!isCollapsed && (
              <ChevronDownIcon
                className={`h-3 w-3 shrink-0 transition-transform ${
                  isStarredOpen ? "" : "-rotate-90"
                }`}
              />
            )}
          </button>
          {!isCollapsed && isStarredOpen && (
            <div className="mt-1 ml-7 space-y-1">
              {starredBases.length === 0 ? (
                <div className="flex flex-row items-center gap-4">
                  <StarOutlineIcon className="h-7 w-7 shrink-0 border border-gray-200 p-1 text-gray-500" />
                  <p className="text-[10px] text-gray-500">
                    Your starred bases, interfaces, and workspaces will appear
                    here
                  </p>
                </div>
              ) : (
                starredBases.map((base) => (
                  <Link
                    key={base.id}
                    href={`/base/${base.id}`}
                    className="flex items-center gap-2 rounded-xs px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                    title={base.name}
                    onMouseEnter={() => void utils.base.getById.prefetch({ id: base.id })}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] text-white ${getStoredBaseColor(base.id)}`}
                    >
                      {base.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">{base.name}</span>
                  </Link>
                ))
              )}
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
          <UsersIcon className="h-4 w-4 shrink-0" />
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
              <BriefcaseIcon className="h-4 w-4 shrink-0" />
              {!isCollapsed && "Workspaces"}
            </div>
            {!isCollapsed && (
              <div className="flex cursor-pointer flex-row gap-2 rounded p-0.5 hover:bg-gray-200">
                <PlusIcon className="h-3 w-3" />
                <ChevronRightIcon className="h-3 w-3" />
              </div>
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
            <ViewGridIcon className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && "Template and apps"}
          </button>
          <button className="flex w-full items-center gap-2.5 rounded-xs px-2.5 py-1.5 text-gray-700 hover:bg-gray-100">
            <ShoppingBagIcon className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && "Marketplace"}
          </button>
          <button className="flex w-full items-center gap-2.5 rounded-xs px-2.5 py-1.5 text-gray-700 hover:bg-gray-100">
            <UploadIcon className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && "Import"}
          </button>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setIsCreateBaseModalOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
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
