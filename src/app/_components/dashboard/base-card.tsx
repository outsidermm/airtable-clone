"use client";

import Link from "next/link";

interface BaseCardProps {
  base: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    starred: boolean;
    userId: string;
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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-base font-semibold text-white">
          {base.name}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-gray-900">{base.name}</h3>
          {base.updatedAt && (
            <p className="mt-0.5 text-[11px] text-gray-500">{base.updatedAt.toDateString()}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
