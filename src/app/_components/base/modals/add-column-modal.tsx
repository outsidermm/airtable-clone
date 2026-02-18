"use client";

import { useState, useEffect, useRef } from "react";
import type { FieldType } from "~/types/field";
import { FIELD_TYPES } from "../constants";
import {
  QuestionIcon,
  SearchIcon,
  ChevronDownIcon,
} from "~/app/_components/ui/icons";
import { useBase } from "../base-context";
import { useColumnMutations } from "../../hooks/use-column-mutations";

interface AddColumnModalProps {
  anchorEl?: HTMLElement | null;
}

export function AddColumnModal({ anchorEl }: AddColumnModalProps) {
  const { activeTableId, openModal } = useBase();
  const columnMutations = useColumnMutations(activeTableId);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(
    null,
  );
  const [columnName, setColumnName] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (anchorEl && modalRef.current) {
      const rect = anchorEl.getBoundingClientRect();
      const modalWidth = 480;
      const modalHeight = modalRef.current.offsetHeight || 400;
      const padding = 8;

      let top = rect.bottom + 4;
      let left = rect.left;

      if (left + modalWidth > window.innerWidth - padding)
        left = window.innerWidth - modalWidth - padding;
      if (left < padding) left = padding;
      if (top + modalHeight > window.innerHeight - padding)
        top = rect.top - modalHeight - 4;

      setPosition({ top, left });
    }
  }, [anchorEl, isConfiguring]);

  useEffect(() => {
    if (!isConfiguring) searchInputRef.current?.focus();
  }, [isConfiguring]);

  const filteredFields = FIELD_TYPES.filter((field) =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const agentFields = filteredFields.filter((f) => f.category === "agent");
  const standardFields = filteredFields.filter(
    (f) => f.category === "standard",
  );

  const handleSelectField = (field: FieldType) => {
    setSelectedFieldType(field);
    setIsConfiguring(true);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleConfirm = () => {
    if (selectedFieldType) {
      if (columnName.trim() === "") {
        columnMutations.handleAddColumn({
          type: selectedFieldType.type,
        });
      } else {
        columnMutations.handleAddColumn({
          name: columnName.trim(),
          type: selectedFieldType.type,
        });
      }
      openModal(null);
    }
  };

  const isDropdown = !!anchorEl && !!position;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={() => openModal(null)}
        style={{ background: isDropdown ? "transparent" : "rgba(0,0,0,0.4)" }}
      />

      <div
        ref={modalRef}
        className={`z-50 w-120 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl transition-all ${
          isDropdown
            ? "fixed"
            : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
        style={
          isDropdown ? { top: position.top, left: position.left } : undefined
        }
      >
        {!isConfiguring ? (
          /* PAGE 1: SELECTION VIEW */
          <div className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-gray-100 p-3">
              <div className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-gray-100 px-3 py-2 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                <SearchIcon className="h-4 w-4 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a field type"
                  className="w-full bg-transparent text-sm text-gray-900 outline-none"
                />
              </div>
              <QuestionIcon className="h-4 w-8 cursor-help text-gray-400 hover:text-gray-600" />
            </div>

            <div className="max-h-100 overflow-y-auto p-2">
              {filteredFields.length > 0 ? (
                <>
                  {agentFields.length > 0 && (
                    <div className="mb-4">
                      <h3 className="mb-2 px-3 text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                        Field Agents
                      </h3>
                      <div
                        className={`grid gap-1 ${isSearching ? "grid-cols-1" : "grid-cols-2"}`}
                      >
                        {agentFields.map((field) => (
                          <button
                            key={field.id}
                            onClick={() => handleSelectField(field)}
                            className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-all hover:border-gray-200 hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                          >
                            <span className="text-purple-500">
                              {field.icon}
                            </span>
                            <span className="font-medium text-gray-700">
                              {field.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {standardFields.length > 0 && (
                    <div>
                      <h3 className="mb-2 px-3 text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                        Standard fields
                      </h3>
                      <div className="space-y-0.5">
                        {standardFields.map((field) => (
                          <button
                            key={field.id}
                            onClick={() => handleSelectField(field)}
                            className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-all hover:border-gray-200 hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                          >
                            <span className="text-gray-400">{field.icon}</span>
                            <span className="text-gray-700">{field.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* EMPTY STATE */
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center text-gray-600">
                  <p>
                    No field types or table names matching &quot;{searchQuery}
                    &quot;
                  </p>
                  <button
                    onClick={handleClearSearch}
                    className="mt-4 text-xs text-gray-600 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PAGE 2: CONFIGURATION VIEW */
          <div className="flex flex-col p-5">
            <div className="space-y-5">
              <div>
                <input
                  autoFocus
                  type="text"
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="Field name (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              <div>
                <button
                  onClick={() => {
                    setIsConfiguring(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        selectedFieldType?.category === "agent"
                          ? "text-purple-500"
                          : "text-gray-400"
                      }
                    >
                      {selectedFieldType?.icon}
                    </span>
                    <span className="font-medium text-gray-900">
                      {selectedFieldType?.name}
                    </span>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <p className="text-gray-600">
                Enter text, or prefill each new cell with a default value.
              </p>

              <div>
                <label className="my-4 text-sm">Default</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter default value (optional)"
                  className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                onClick={() => openModal(null)}
                className="rounded-md px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedFieldType}
                className="rounded-md bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create field
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
