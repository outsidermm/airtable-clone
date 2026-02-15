"use client";

import { useState } from "react";
import { DashboardLayout } from "~/app/_components/dashboard/dashboard-layout";
import { BaseCard } from "~/app/_components/dashboard/base-card";
import { api } from "~/trpc/react";
import { ChevronDownIcon, ListIcon, ViewGridIcon } from "~/components/icons";

interface DashboardClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  initialBases: Array<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    starred: boolean;
    userId: string;
  }>;
}

export function DashboardClient({ user, initialBases }: DashboardClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { data: bases = initialBases } = api.base.getAll.useQuery(undefined, {
    initialData: initialBases,
  });

  return (
    <DashboardLayout user={user} currentPage="home">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Page Title */}
          <h1 className="mb-5 text-2xl font-medium text-gray-900">Home</h1>

          {/* Upgrade Banner */}
          <div className="mb-5 rounded-lg bg-blue-50 p-5 border border-gray-200 px-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="mb-1.5 text-base font-semibold text-gray-900">
                  Unlock more power on the Team plan
                </h2>
                <p className="mb-3 text-xs text-gray-600">
                  More records. More automations. More customization. More Airtable.
                </p>
                <div className="flex gap-4">
                  <button className="rounded-2xl bg-gray-900 px-6 py-1.5 text-xs text-white hover:bg-gray-800 hover:shadow-2xl">
                    ⚡  Upgrade
                  </button>
                  <button className="rounded-2xl px-6 py-1.5 text-xs text-gray-700 hover:bg-gray-300">
                    📋  Compare plans
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bases Section */}
          <div className="mb-3 flex items-center justify-between">
            <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900">
              <span>Opened anytime</span>
              <ChevronDownIcon className="h-3 w-3" />
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-2xl p-1.5 ${viewMode === "list" ? "bg-gray-200" : "hover:bg-gray-100"}`}
                title="List view"
              >
                <ListIcon
                  className={`h-4 w-4 ${viewMode === "list" ? "text-gray-900" : "text-gray-600"}`}
                />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-2xl p-1.5 ${viewMode === "grid" ? "bg-gray-200" : "hover:bg-gray-100"}`}
                title="Grid view"
              >
                <ViewGridIcon
                  className={`h-4 w-4 ${viewMode === "grid" ? "text-gray-900" : "text-gray-600"}`}
                />
              </button>
            </div>
          </div>

          {/* Base Cards */}
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col gap-2 max-w-3xl"
            }
          >
            {bases.map((base) => (
              <BaseCard key={base.id} base={base} viewMode={viewMode} />
            ))}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
