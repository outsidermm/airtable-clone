"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { BaseContextMenu } from "./base-context-menu";
import { getBaseColor } from "~/lib/base-icon-utils";

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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const utils = api.useUtils();

  const toggleStarredMutation = api.base.toggleStarred.useMutation({
    onMutate: async ({ id }) => {
      // Cancel outgoing fetches
      await utils.base.getAll.cancel();

      // Snapshot previous value
      const previousBases = utils.base.getAll.getData();

      // Optimistically update
      utils.base.getAll.setData(undefined, (old) =>
        old?.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b))
      );

      return { previousBases };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousBases) {
        utils.base.getAll.setData(undefined, context.previousBases);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void utils.base.getAll.invalidate();
    },
  });

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStarredMutation.mutate({ id: base.id });
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(!showContextMenu);
  };

  return (
    <div className={`group relative rounded-lg border border-gray-200 bg-white transition-all hover:shadow-md ${viewMode === "list" ? "flex items-center" : ""}`}>
      <Link href={`/base/${base.id}`} className={`${viewMode === "list" ? "flex flex-1 items-center p-3" : "block p-4"}`}>
        {/* Icon & Name */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${getBaseColor(base.id)}`}>
            <Image
              src="/airtable-black.svg"
              alt="Base icon"
              width={28}
              height={28}
              className="brightness-0 invert"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-gray-900">{base.name}</h3>
            {base.updatedAt && (
              <p className="mt-0.5 text-[11px] text-gray-500">{base.updatedAt.toDateString()}</p>
            )}
          </div>
        </div>
      </Link>

      {/* Action Buttons (show on hover) */}
      <div className={`flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${viewMode === "list" ? "relative pr-3" : "absolute right-2 top-2"}`}>
        {/* Star Button */}
        <button
          onClick={handleStarClick}
          className="rounded p-1 hover:bg-gray-100"
          title={base.starred ? "Remove from starred" : "Add to starred"}
        >
          {base.starred ? (
            // Filled star
            <svg
              className="h-4 w-4 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : (
            // Outline star
            <svg
              className="h-4 w-4 text-gray-500"
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
          )}
        </button>

        {/* Three-dot Menu Button */}
        <button
          ref={menuButtonRef}
          onClick={handleMenuClick}
          className="rounded p-1 hover:bg-gray-100"
          title="More options"
        >
          <svg
            className="h-4 w-4 text-gray-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>

      {/* Context Menu */}
      <BaseContextMenu
        base={base}
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        buttonRef={menuButtonRef}
      />
    </div>
  );
}
