"use client";

import { useState, useRef, useEffect } from "react";

interface View {
  id: number;
  name: string;
}

interface ViewSidebarProps {
  isOpen: boolean;
  views: View[];
  activeViewId: number | null;
  onSelectView: (viewId: number) => void;
  onAddView: () => void;
  onRenameView: (viewId: number, newName: string) => void;
  onDeleteView: (viewId: number) => void;
}

export function ViewSidebar({
  isOpen,
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onRenameView,
  onDeleteView,
}: ViewSidebarProps) {
  const [editingViewId, setEditingViewId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingViewId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingViewId]);

  const handleDoubleClick = (view: View) => {
    setEditingViewId(view.id);
    setEditingName(view.name);
  };

  const handleRenameSubmit = (viewId: number) => {
    if (editingName.trim() && editingName.trim() !== views.find(v => v.id === viewId)?.name) {
      onRenameView(viewId, editingName.trim());
    }
    setEditingViewId(null);
  };

  const filteredViews = searchQuery
    ? views.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : views;

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200 ease-in-out overflow-hidden ${
        isOpen ? "w-64 opacity-100" : "w-0 border-r-0 opacity-0"
      }`}
    >
      <div className="flex-1 overflow-y-auto p-2 min-w-64">
        {/* Create new view */}
        <button
          onClick={onAddView}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 mb-2"
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create new...
        </button>

        {/* Search views */}
        <div className="mb-2">
          {showSearch ? (
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
              <svg
                className="h-3.5 w-3.5 text-gray-400"
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a view"
                className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                autoFocus
                onBlur={() => {
                  if (!searchQuery) setShowSearch(false);
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500 hover:border-gray-300"
            >
              <svg
                className="h-3.5 w-3.5"
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
              Find a view
            </button>
          )}
        </div>

        {/* View list */}
        {filteredViews.map((view) => (
          <div key={view.id} className="group relative">
            {editingViewId === view.id ? (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1.5">
                <svg
                  className="h-4 w-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18M3 6h18M3 18h18"
                  />
                </svg>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRenameSubmit(view.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(view.id);
                    if (e.key === "Escape") setEditingViewId(null);
                  }}
                  className="w-full bg-transparent text-xs font-medium text-blue-700 outline-none"
                />
              </div>
            ) : (
              <button
                onClick={() => onSelectView(view.id)}
                onDoubleClick={() => handleDoubleClick(view)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                  activeViewId === view.id
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
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
                    d="M3 10h18M3 14h18M3 6h18M3 18h18"
                  />
                </svg>
                <span className="truncate">{view.name}</span>
              </button>
            )}

            {/* Delete button (not for the only remaining view) */}
            {views.length > 1 && editingViewId !== view.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteView(view.id);
                }}
                className="absolute top-1 right-1 hidden rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-500 group-hover:block"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
