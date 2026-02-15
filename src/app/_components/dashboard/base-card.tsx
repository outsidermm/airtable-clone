"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { BaseContextMenu } from "./base-context-menu";
import { getStoredBaseColor } from "~/lib/base-color-storage";
import {
  StarIcon,
  StarOutlineIcon,
  DotsHorizontalIcon,
} from "~/components/icons";
import { getTimeAgo } from "~/lib/date";
import { useBaseMutations } from "./hooks/use-base-mutations";

interface BaseCardProps {
  base: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    starred: boolean;
    userId: string;
  };
  viewMode?: "grid" | "list";
}

export function BaseCard({ base, viewMode = "grid" }: BaseCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(base.name);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseMutations = useBaseMutations();

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    baseMutations.handleToggleStarred(base.id);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(!showContextMenu);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRenaming(true);
    setNewName(base.name);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (newName.trim() && newName !== base.name) {
      baseMutations.handleRename(base.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsRenaming(false);
    setNewName(base.name);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleRenameCancel(e);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit(e as unknown as React.FormEvent);
    }
  };

  // Focus input when entering rename mode
  if (isRenaming && inputRef.current) {
    inputRef.current.focus();
    inputRef.current.select();
  }

  if (viewMode === "grid") {
    return (
      <div className="group relative rounded-lg border border-gray-200 bg-white transition-all hover:shadow-md">
        <Link
          href={`/base/${base.id}`}
          className={`block p-4 ${isRenaming ? "pointer-events-none" : ""}`}
          aria-disabled={isRenaming}
          tabIndex={isRenaming ? -1 : undefined}
        >
          {/* Icon & Name */}
          <div className="flex flex-1 items-center gap-2.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white ${getStoredBaseColor(base.id)}`}
            >
              {base.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <form
                  onSubmit={handleRenameSubmit}
                  className="flex items-center gap-1"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={handleRenameSubmit}
                    className="w-full rounded border border-blue-500 px-2 py-0.5 text-sm font-medium text-gray-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                </form>
              ) : (
                <h3 className="truncate text-sm font-medium text-gray-900">
                  {base.name}
                </h3>
              )}
              {base.updatedAt && (
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {"Modified " + getTimeAgo(base.updatedAt.getTime())}
                </p>
              )}
            </div>
          </div>
        </Link>

        {/* Action Buttons (show on hover, or always if starred) */}
        <div
          className={`absolute top-2 right-2 flex gap-1 transition-opacity ${base.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          {/* Star Button */}
          <button
            onClick={handleStarClick}
            className="rounded border border-gray-200 bg-white p-1"
            title={base.starred ? "Remove from starred" : "Add to starred"}
          >
            {base.starred ? (
              <StarIcon className="h-4 w-4 text-yellow-500" />
            ) : (
              <StarOutlineIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* Three-dot Menu Button */}
          <button
            ref={menuButtonRef}
            onClick={handleMenuClick}
            className="rounded border border-gray-200 bg-white p-1"
            title="More options"
          >
            <DotsHorizontalIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Context Menu */}
        <BaseContextMenu
          base={base}
          isOpen={showContextMenu}
          onClose={() => setShowContextMenu(false)}
          onRename={handleRenameClick}
          buttonRef={menuButtonRef}
        />
      </div>
    );
  } else {
    return (
      <div className="group flex items-center justify-between gap-4 rounded-lg transition-all hover:bg-gray-200">
        <div className="flex flex-1 items-center justify-between">
          <Link href={`/base/${base.id}`} className="flex flex-3 p-4">
            {/* Icon & Name */}
            <div className="flex flex-1 items-center gap-2.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white ${getStoredBaseColor(base.id)}`}
              >
                {base.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                {isRenaming ? (
                  <form
                    onSubmit={handleRenameSubmit}
                    className="flex items-center gap-1"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={handleRenameSubmit}
                      className="w-full rounded border border-blue-500 px-2 py-0.5 text-sm font-medium text-gray-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      autoFocus
                    />
                  </form>
                ) : (
                  <h3 className="truncate text-sm font-medium text-gray-900">
                    {base.name}
                  </h3>
                )}
              </div>
            </div>
          </Link>

          {/* Action Buttons (show on hover, or always if starred) */}
          <div
            className={`flex flex-1 gap-1 transition-opacity ${base.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            {/* Star Button */}
            <button
              onClick={handleStarClick}
              className="rounded p-1"
              title={base.starred ? "Remove from starred" : "Add to starred"}
            >
              {base.starred ? (
                <StarIcon className="h-4 w-4 text-yellow-500" />
              ) : (
                <StarOutlineIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              )}
            </button>

            {/* Three-dot Menu Button */}
            <button
              ref={menuButtonRef}
              onClick={handleMenuClick}
              className="rounded p-1"
              title="More options"
            >
              <DotsHorizontalIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-between">
          {base.updatedAt && (
            <p className="mt-0.5 flex-1 text-xs text-gray-500">
              {"Modified " + getTimeAgo(base.updatedAt.getTime())}
            </p>
          )}

          <p className="flex-1 text-xs text-gray-500">Workspace</p>
        </div>

        {/* Context Menu */}
        <BaseContextMenu
          base={base}
          isOpen={showContextMenu}
          onClose={() => setShowContextMenu(false)}
          onRename={handleRenameClick}
          buttonRef={menuButtonRef}
        />
      </div>
    );
  }
}
