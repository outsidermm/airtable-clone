import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { DashboardLayout } from "~/app/_components/dashboard/dashboard-layout";
import { BaseCard } from "~/app/_components/dashboard/base-card";
import { api } from "~/trpc/server";

export default async function DashboardPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  const bases = await api.base.getAll();

  return (
    <DashboardLayout user={session.user} currentPage="home">

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
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="flex gap-1.5">
              <button className="rounded-2xl p-1.5 hover:bg-gray-100" title="List view">
                <svg
                  className="h-4 w-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
              <button className="rounded-2xl bg-gray-200 p-1.5" title="Grid view">
                <svg
                  className="h-4 w-4 text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Base Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bases.map((base) => (
              <BaseCard key={base.id} base={base} />
            ))}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
