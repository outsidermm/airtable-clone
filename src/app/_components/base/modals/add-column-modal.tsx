"use client";

import { useState, useEffect, useRef } from "react";
import type { ColumnType } from "generated/prisma/enums";
import type { FieldType } from "~/types/field";
import { FIELD_TYPES } from "../constants";
import { QuestionIcon, SearchIcon } from "~/components/icons";

interface AddColumnModalProps {
  onConfirm: (name: string, type: ColumnType) => void;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

export function AddColumnModal({
  onConfirm,
  onClose,
  anchorEl,
}: AddColumnModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(
    null,
  );
  const [columnName, setColumnName] = useState("");
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
      const modalHeight = modalRef.current.offsetHeight || 500;
      const padding = 8;

      let top = rect.bottom + 4;
      let left = rect.left;

      if (left + modalWidth > window.innerWidth - padding) {
        left = window.innerWidth - modalWidth - padding;
      }
      if (left < padding) {
        left = padding;
      }
      if (top + modalHeight > window.innerHeight - padding) {
        top = rect.top - modalHeight - 4;
      }

      setPosition({ top, left });
    }
  }, [anchorEl]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredFields = FIELD_TYPES.filter((field) =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const agentFields = filteredFields.filter((f) => f.category === "agent");
  const standardFields = filteredFields.filter(
    (f) => f.category === "standard",
  );

  const handleSelectField = (field: FieldType) => {
    setSelectedFieldType(field);
    setColumnName(field.name);
  };

  const handleConfirm = () => {
    if (selectedFieldType && columnName.trim()) {
      onConfirm(columnName.trim(), selectedFieldType.type);
    }
  };

  const isDropdown = !!anchorEl && !!position;
  // Logic for grid vs list
  const isSearching = searchQuery.trim().length > 0;

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        style={{ background: isDropdown ? "transparent" : "rgba(0,0,0,0.5)" }}
      />

      <div
        ref={modalRef}
        className={`z-50 w-120 rounded-lg border border-gray-200 bg-white shadow-xl ${
          isDropdown
            ? "fixed"
            : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
        style={
          isDropdown ? { top: position.top, left: position.left } : undefined
        }
      >
        {/* Header with Search */}
        <div className="flex items-center gap-3 border-b border-gray-200 p-2">
          {/* Added focus-within:ring-2 and focus-within:border-blue-500 for better UX */}
          <div className="flex w-full items-center gap-3 rounded-md border border-transparent bg-gray-100 p-3 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <SearchIcon className="h-4 w-4 text-gray-600" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a field type"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
            />
          </div>
          <QuestionIcon className="h-4 w-8 cursor-help text-gray-600" />
        </div>

        {/* Body */}
        <div className="max-h-96 overflow-y-auto px-4 py-3">
          {/* Field Agents */}
          {agentFields.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 px-2 text-xs font-medium tracking-wider text-gray-500">
                Field agents
              </h3>
              {/* Dynamic Grid: 2 columns when empty, 1 column when searching */}
              <div
                className={`grid gap-1 ${isSearching ? "grid-cols-1" : "grid-cols-2"}`}
              >
                {agentFields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => handleSelectField(field)}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-all ${
                      selectedFieldType?.id === field.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    } focus:ring-2 focus:ring-blue-400 focus:outline-none`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="shrink-0 text-purple-500">
                        {field.icon}
                      </span>
                      <span className="truncate">{field.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="my-4 border-t border-gray-200" />

          {/* Standard Fields */}
          {standardFields.length > 0 && (
            <div>
              <h3 className="mb-2 px-2 text-xs font-medium tracking-wider text-gray-500">
                Standard fields
              </h3>
              <div className="space-y-1">
                {standardFields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => handleSelectField(field)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all ${
                      selectedFieldType?.id === field.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : " text-gray-700 hover:bg-gray-50"
                    } focus:ring-2 focus:ring-blue-400 focus:outline-none`}
                  >
                    <span className="shrink-0 text-gray-400">
                      {field.icon}
                    </span>
                    <span className="truncate">{field.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredFields.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No field types found
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedFieldType && (
          <div className="rounded-b-lg border-t border-gray-200 bg-gray-50/50 px-4 py-3">
            <div className="mb-3">
              <label className="mb-1.5 block text-sm font-bold text-gray-700">
                Field name
              </label>
              <input
                type="text"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && columnName.trim()) {
                    handleConfirm();
                  } else if (e.key === "Escape") {
                    onClose();
                  }
                }}
                placeholder="Enter field name..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!columnName.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
