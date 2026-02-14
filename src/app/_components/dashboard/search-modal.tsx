"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

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
  const [hoveredBaseId, setHoveredBaseId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const utils = api.useUtils();

  const { data: allBases = [] } = api.base.getAll.useQuery(undefined, {
    enabled: isOpen,
  });

  const toggleStarredMutation = api.base.toggleStarred.useMutation({
    onMutate: async ({ id }) => {
      await utils.base.getAll.cancel();
      const previousBases = utils.base.getAll.getData();
      utils.base.getAll.setData(undefined, (old) =>
        old?.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b))
      );
      return { previousBases };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBases) {
        utils.base.getAll.setData(undefined, context.previousBases);
      }
    },
    onSettled: () => {
      void utils.base.getAll.invalidate();
      void utils.base.getStarred.invalidate();
    },
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 pointer-events-none"
      onClick={handleClickOutside}
    >
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl pointer-events-auto">
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
                  {validRecentBases.map((base, index) => {
                    const recentBase = recentBases.find((r) => r.id === base.id);
                    const timeAgo = recentBase ? getTimeAgo(recentBase.timestamp) : "";
                    return (
                      <div
                        key={base.id}
                        className={`group relative w-full rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          selectedIndex === index
                            ? "bg-blue-50"
                            : "hover:bg-gray-100"
                        }`}
                        onMouseEnter={() => setHoveredBaseId(base.id)}
                        onMouseLeave={() => setHoveredBaseId(null)}
                      >
                        <button
                          onClick={() => handleSelectBase(base)}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {base.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{base.name}</div>
                            {timeAgo && (
                              <div className="text-xs text-gray-500">{timeAgo}</div>
                            )}
                          </div>
                        </button>
                        {hoveredBaseId === base.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStarredMutation.mutate({ id: base.id });
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                          >
                            {base.starred ? (
                              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
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
                    const recentBase = recentBases.find((r) => r.id === base.id);
                    const timeAgo = recentBase ? getTimeAgo(recentBase.timestamp) : "";
                    return (
                      <div
                        key={base.id}
                        className={`group relative w-full rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          selectedIndex === resultIndex
                            ? "bg-blue-50"
                            : "hover:bg-gray-100"
                        }`}
                        onMouseEnter={() => setHoveredBaseId(base.id)}
                        onMouseLeave={() => setHoveredBaseId(null)}
                      >
                        <button
                          onClick={() => handleSelectBase(base)}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {base.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{base.name}</div>
                            {timeAgo && (
                              <div className="text-xs text-gray-500">{timeAgo}</div>
                            )}
                          </div>
                        </button>
                        {hoveredBaseId === base.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStarredMutation.mutate({ id: base.id });
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                          >
                            {base.starred ? (
                              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
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
