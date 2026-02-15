"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { SearchIcon, StarIcon, StarOutlineIcon } from "~/components/icons";

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
        const selected = uniqueResults[selectedIndex];
        if (selected) {
          handleSelectBase(selected);
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
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32"
      onClick={handleClickOutside}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
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
                              <StarIcon className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <StarOutlineIcon className="h-4 w-4 text-gray-400" />
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
                              <StarIcon className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <StarOutlineIcon className="h-4 w-4 text-gray-400" />
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
