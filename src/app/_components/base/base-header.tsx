"use client";

import { useState } from "react";
import Link from "next/link";
import { UserMenu } from "../dashboard/user-menu";

interface BaseHeaderProps {
  base: {
    id: string;
    name: string;
    icon: string;
  };
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function BaseHeader({ base, user }: BaseHeaderProps) {
  const [activeTab, setActiveTab] = useState("data");

  return (
    <header className="border-b border-gray-200 bg-white">
      {/* Top Bar */}
      <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4">
        {/* Left: Back & Base Name */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>

          <button className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100">
            <span className="text-base">{base.icon}</span>
            {base.name}
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <span className="text-xs text-gray-600">Trial: 13 days left</span>

          <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            🚀 Launch
          </button>

          <button className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800">
            Share
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-4">
        <button
          onClick={() => setActiveTab("data")}
          className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === "data"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Data
        </button>
        <button
          onClick={() => setActiveTab("automations")}
          className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === "automations"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Automations
        </button>
        <button
          onClick={() => setActiveTab("interfaces")}
          className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === "interfaces"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Interfaces
        </button>
        <button
          onClick={() => setActiveTab("forms")}
          className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === "forms"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Forms
        </button>

        {/* Right side - Tools dropdown */}
        <div className="ml-auto flex items-center">
          <button className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
            Tools
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
        </div>
      </div>
    </header>
  );
}
