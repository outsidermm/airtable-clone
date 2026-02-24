"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

interface SelectOption {
  id: string | number;
  label: string;
  icon?: ReactNode;
  // Allows passing extra data for specific logic (like column type)
  metadata?: unknown;
}

interface SearchableSelectProps {
  options: SelectOption[];
  onSelect: (option: SelectOption) => void;
  onClose: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  widthClass?: string;
  showSearch?: boolean;
}

export function SearchableSelect({
  options,
  onSelect,
  onClose,
  searchPlaceholder = "Search...",
  widthClass = "w-48",
  showSearch = true,
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) inputRef.current?.focus();
  }, [showSearch]);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      {/* Invisible backdrop to capture click-outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className={`absolute top-full left-0 z-50 mt-1 rounded-md border border-gray-200 bg-white p-1 shadow-xl ${widthClass}`}
      >
        {showSearch && (
          <div className="mb-1 flex items-center gap-2 border-b border-gray-100 px-2 pt-1 pb-1.5">
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-xs outline-none placeholder:text-gray-500"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <div className="max-h-48 overflow-y-auto">
          {filtered.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                onSelect(opt);
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
            >
              {opt.icon}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-2 pb-4 text-xs text-gray-400">
              No results
            </div>
          )}
        </div>
      </div>
    </>
  );
}
