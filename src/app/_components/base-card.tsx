"use client";

import Link from "next/link";

interface BaseCardProps {
  base: {
    id: string;
    name: string;
    icon: string; // Can be emoji or initials
    lastModified?: string;
  };
}

export function BaseCard({ base }: BaseCardProps) {
  return (
    <Link
      href={`/base/${base.id}`}
      className="group block rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md"
    >
      {/* Icon/Initials & Name */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-800 text-base font-semibold text-white">
          {base.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-gray-900">{base.name}</h3>
          {base.lastModified && (
            <p className="mt-0.5 text-[11px] text-gray-500">{base.lastModified}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
