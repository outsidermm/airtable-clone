"use client";

import { useState, useRef, useEffect } from "react";
import type { GridColumn } from "~/types/grid";
import {
  SearchIcon,
  ChevronDownIcon,
  NumberIcon,
  TextIcon,
  XIcon,
} from "~/components/icons";
import { useBase } from "../base-context";
import { useColumnMutations } from "../../hooks/use-column-mutations";

interface SetPrimaryModalProps {
  columns: GridColumn[];
  currentPrimaryId: number;
}

export function SetPrimaryModal({
  columns,
  currentPrimaryId,
}: SetPrimaryModalProps) {
  const { activeTableId, openModal } = useBase();
  const columnMutations = useColumnMutations(activeTableId);

  const [selectedColumnId, setSelectedColumnId] =
    useState<number>(currentPrimaryId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<number>(currentPrimaryId);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedColumn = columns.find((c) => c.id === selectedColumnId);
  const filtered = columns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleConfirm = () => {
    if (selectedColumnId !== currentPrimaryId) {
      columnMutations.handleSetPrimaryColumn(selectedColumnId);
      openModal(null);
    }
    openModal(null);
  };

  useEffect(() => {
    if (isMenuOpen) {
      setHighlightedId(selectedColumnId);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isMenuOpen, selectedColumnId]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={() => {
          openModal(null);
        }}
      />

      <div
        ref={modalRef}
        className="fixed top-1/2 left-1/2 z-50 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-8 shadow-2xl"
      >
        <button
          onClick={() => openModal(null)}
          className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <div className="p-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Change the primary field
          </h2>
        </div>

        <div className="p-2">
          <div className="relative">
            <label className="mb-2 block text-xs tracking-wider text-gray-500">
              Primary Field
            </label>

            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="mb-4 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm transition-all hover:border-gray-400 focus:outline-none"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {selectedColumn?.type === "NUMBER" ? (
                    <NumberIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <TextIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <span className="truncate font-medium text-gray-900">
                    {selectedColumn?.name}
                  </span>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              </button>
              {selectedColumn?.id === currentPrimaryId && (
                <span className="ml-1 text-gray-500">
                  &quot;{selectedColumn?.name}&quot; is currently the primary
                  field.
                </span>
              )}

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsMenuOpen(false)}
                  />

                  <div className="absolute top-10 left-0 z-20 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
                    <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2.5">
                      <SearchIcon className="h-4 w-4 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                        placeholder="Find a field..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1">
                      {filtered.map((col) => {
                        const isHighlighted = highlightedId === col.id;

                        return (
                          <button
                            key={col.id}
                            onMouseEnter={() => setHighlightedId(col.id)}
                            onClick={() => {
                              setSelectedColumnId(col.id);
                              setIsMenuOpen(false);
                              setSearchQuery("");
                            }}
                            className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                              isHighlighted ? "bg-gray-100" : ""
                            }`}
                          >
                            {col.type === "NUMBER" ? (
                              <NumberIcon className="h-4 w-4 text-gray-400" />
                            ) : (
                              <TextIcon className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="truncate">{col.name}</span>
                          </button>
                        );
                      })}
                      {filtered.length === 0 && (
                        <div className="px-3 py-8 text-center text-sm text-gray-400">
                          No results
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 rounded-b-xl bg-gray-50/50 px-6 py-4">
          <button
            onClick={() => openModal(null)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedColumnId === currentPrimaryId}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Change primary field
          </button>
        </div>
      </div>
    </>
  );
}
