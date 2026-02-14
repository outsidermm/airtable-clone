"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

interface RecentBase {
  id: string;
  name: string;
  timestamp: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentBases, setRecentBases] = useState<RecentBase[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { data: allBases = [] } = api.base.getAll.useQuery(undefined, {
    enabled: isOpen,
  });

  // Load recent bases from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("recentBases");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as RecentBase[];
          setRecentBases(parsed.slice(0, 5)); // Max 5 recent bases
        } catch {
          setRecentBases([]);
        }
      }
    }
  }, [isOpen]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter bases by search query
  const filteredBases = allBases.filter((base) =>
    base.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get recent bases that still exist in allBases
  const validRecentBases = recentBases
    .map((recent) => allBases.find((base) => base.id === recent.id))
    .filter((base): base is NonNullable<typeof base> => base !== undefined);

  // Combined list for keyboard navigation
  const allResults = [
    ...(searchQuery === "" ? validRecentBases : []),
    ...filteredBases,
  ];

  // Remove duplicates
  const uniqueResults = allResults.filter(
    (base, index, self) => self.findIndex((b) => b.id === base.id) === index
  );

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < uniqueResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (uniqueResults[selectedIndex]) {
          handleSelectBase(uniqueResults[selectedIndex]!);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, uniqueResults, onClose]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleSelectBase = (base: { id: string; name: string }) => {
    router.push(`/base/${base.id}`);
    onClose();
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 pt-32"
      onClick={handleClickOutside}
    >
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        {/* Search Input */}
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bases..."
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {uniqueResults.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No matching bases found
            </div>
          ) : (
            <>
              {/* Recently Opened Section */}
              {searchQuery === "" && validRecentBases.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500">
                    Recently opened
                  </div>
                  {validRecentBases.map((base, index) => (
                    <button
                      key={base.id}
                      onClick={() => handleSelectBase(base)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedIndex === index
                          ? "bg-blue-50 text-blue-900"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {base.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{base.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* All Bases Section */}
              {filteredBases.length > 0 && (
                <div>
                  {searchQuery === "" && validRecentBases.length > 0 && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500">
                      All bases
                    </div>
                  )}
                  {filteredBases.map((base, index) => {
                    const resultIndex =
                      searchQuery === ""
                        ? validRecentBases.length + index
                        : index;
                    return (
                      <button
                        key={base.id}
                        onClick={() => handleSelectBase(base)}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          selectedIndex === resultIndex
                            ? "bg-blue-50 text-blue-900"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {base.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium">{base.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500">
          <kbd className="rounded border border-gray-300 px-1.5 py-0.5">↑</kbd>
          <kbd className="ml-1 rounded border border-gray-300 px-1.5 py-0.5">
            ↓
          </kbd>{" "}
          to navigate,{" "}
          <kbd className="rounded border border-gray-300 px-1.5 py-0.5">
            Enter
          </kbd>{" "}
          to select,{" "}
          <kbd className="rounded border border-gray-300 px-1.5 py-0.5">
            Esc
          </kbd>{" "}
          to close
        </div>
      </div>
    </div>,
    document.body
  );
}
