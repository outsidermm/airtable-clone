"use client";

import Link from "next/link";
import { useState } from "react";

export function Navigation() {
  const [platformOpen, setPlatformOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Top Banner */}
      <div className="bg-gray-900 px-4 py-2.5 text-center text-sm text-white">
        <div className="flex items-center justify-center gap-2">
          <span>Introducing Airtable's new product</span>
          <span className="font-semibold">🤖 Superagent</span>
          <Link
            href="https://superagent.com"
            className="ml-2 text-blue-400 hover:text-blue-300"
          >
            Explore Superagent.com →
          </Link>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              {/* Airtable cube logo */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 200 170"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 0L0 57.735v57.735l100 57.735 100-57.735V57.735L100 0z"
                  fill="#FCB400"
                />
                <path
                  d="M100 57.735l-50 28.868v57.735l50-28.868V57.735z"
                  fill="#18BFFF"
                />
                <path
                  d="M100 57.735l50 28.868v57.735l-50-28.868V57.735z"
                  fill="#F82B60"
                />
              </svg>
              <span className="text-xl font-bold text-gray-900">Airtable</span>
            </Link>

            {/* Nav Links */}
            <div className="hidden items-center gap-6 lg:flex">
              <div className="relative">
                <button
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                  onMouseEnter={() => setPlatformOpen(true)}
                  onMouseLeave={() => setPlatformOpen(false)}
                >
                  Platform
                  <svg
                    className="h-4 w-4"
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

              <div className="relative">
                <button
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                  onMouseEnter={() => setSolutionsOpen(true)}
                  onMouseLeave={() => setSolutionsOpen(false)}
                >
                  Solutions
                  <svg
                    className="h-4 w-4"
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

              <div className="relative">
                <button
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                  onMouseEnter={() => setResourcesOpen(true)}
                  onMouseLeave={() => setResourcesOpen(false)}
                >
                  Resources
                  <svg
                    className="h-4 w-4"
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

              <Link
                href="/enterprise"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Enterprise
              </Link>

              <Link
                href="/pricing"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Pricing
              </Link>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/contact-sales"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Book Demo
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Sign up for free
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
