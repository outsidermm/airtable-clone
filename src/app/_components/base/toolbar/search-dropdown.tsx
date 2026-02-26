"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { XIcon } from "~/app/_components/ui/icons";
import { useBase } from "../base-context";
import { Popover } from "../../ui/popover";

interface SearchDropdownProps {
  onClose: () => void;
}

export function SearchDropdown({ onClose }: SearchDropdownProps) {
  const { searchQuery, setSearchQuery } = useBase();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [localQuery, setSearchQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        setSearchQuery(localQuery);
        onClose();
      }
    },
    [localQuery, setSearchQuery, onClose],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Popover
      onClose={handleClose}
      align="right"
      className="flex h-10 w-96 items-center justify-between gap-3 px-4 py-2"
    >
      <input
        ref={inputRef}
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search all fields..."
        className="h-full flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
      />

      <div className="flex shrink-0 items-center gap-3">
        <button className="rounded-md bg-black px-2 py-1 text-xs whitespace-nowrap text-white">
          Ask Omni
        </button>

        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </Popover>
  );
}
