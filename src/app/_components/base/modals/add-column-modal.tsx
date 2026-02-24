"use client";

import { useState, useEffect, useRef } from "react";
import type { FieldType } from "~/types/field";
import type { GridColumn } from "~/types/grid";
import { FIELD_TYPES } from "../constants";
import {
  QuestionIcon,
  SearchIcon,
  ChevronDownIcon,
  PlusIcon,
  AIIcon,
  InfoIcon,
} from "~/app/_components/ui/icons";
import { useBase } from "../base-context";
import { useColumnMutations } from "../../hooks/use-column-mutations";

interface AddColumnModalProps {
  anchorEl?: HTMLElement | null;
  editColumnId?: number | null;
  columns?: GridColumn[];
}

export function AddColumnModal({
  anchorEl,
  editColumnId,
  columns,
}: AddColumnModalProps) {
  const {
    activeTableId,
    openModal,
    insertAfterColumnId,
    insertBeforeColumnId,
  } = useBase();
  const columnMutations = useColumnMutations(activeTableId);

  const editColumn = columns?.find((c) => c.id === editColumnId);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(
    editColumn
      ? (FIELD_TYPES.find((f) => f.type === editColumn.type) ?? null)
      : null,
  );
  const [columnName, setColumnName] = useState(
    editColumn ? editColumn.name : "",
  );
  const [isConfiguring, setIsConfiguring] = useState(!!editColumn);

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
      if (editColumnId) {
        columnMutations.handleUpdateColumn(
          editColumnId,
          columnName.trim() || (editColumn?.name ?? ""),
          selectedFieldType.type,
        );
      } else {
        const commonPayload = {
          type: selectedFieldType.type,
          afterColumnId: insertAfterColumnId ?? undefined,
          beforeColumnId: insertBeforeColumnId ?? undefined,
        };
        if (columnName.trim() === "") {
          columnMutations.handleAddColumn(commonPayload);
        } else {
          columnMutations.handleAddColumn({
            ...commonPayload,
            name: columnName.trim(),
          });
        }
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
        className="fixed z-50 w-116 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
        style={
          isDropdown ? { top: position.top, left: position.left } : undefined
        }
      >
        {!isConfiguring ? (
          /* PAGE 1: SELECTION VIEW */
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-gray-100 p-2">
              <div className="flex w-full items-center gap-3 rounded border border-transparent bg-gray-100 px-3 py-2 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-600">
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

            <div className="max-h-180 overflow-y-auto p-2">
              {filteredFields.length > 0 ? (
                <>
                  {agentFields.length > 0 && (
                    <div className="mb-4">
                      <h3 className="mb-2 px-3 text-xs text-gray-500">
                        Field Agents
                      </h3>
                      <div
                        className={`grid gap-1 ${isSearching ? "grid-cols-1" : "grid-cols-2"}`}
                      >
                        {agentFields.map((field) => (
                          <button
                            key={field.id}
                            onClick={() => handleSelectField(field)}
                            className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-all hover:border-gray-200 hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                          >
                            <span className="text-purple-500">
                              {field.icon}
                            </span>
                            <span className="text-gray-700">{field.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {standardFields.length > 0 && (
                    <div>
                      <h3 className="mb-2 px-3 text-xs text-gray-500">
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
          <div className="flex flex-col">
            <div className="space-y-3 px-4 py-2">
              <div>
                <input
                  autoFocus
                  type="text"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="Field name (optional)"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <button
                  onClick={() => {
                    setIsConfiguring(false);
                  }}
                  className="flex w-full items-center justify-between rounded border border-gray-300 px-3 py-2 text-sm transition-all hover:bg-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  disabled={editColumn?.primary} // Do not allow primary field type change natively
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
                    <span className="text-gray-900">
                      {selectedFieldType?.name}
                    </span>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <p className="text-[13.5px] text-gray-500">
                Enter text, or prefill each new cell with a default value.
              </p>

              <div>
                <label className="my-4 text-xs text-gray-600">Default</label>
                <input
                  type="text"
                  placeholder="Enter default value (optional)"
                  className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-sm shadow transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div className="mt-4 mb-2 flex items-center justify-between">
                <button
                  onClick={() => openModal(null)}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  <PlusIcon className="inline h-4 w-4" />
                  Add description
                </button>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openModal(null)}
                    className="rounded-md px-3 py-1.5 text-[13px] text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedFieldType}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-[13px] text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {editColumnId ? "Save" : "Create field"}
                  </button>
                </div>
              </div>
            </div>
            <div className="m-0.5 flex items-center justify-between bg-gray-100 px-4 py-3">
              <div className="flex items-center gap-1">
                <AIIcon className="h-4 w-4 text-green-800" />
                <span className="ml-2 text-sm text-gray-600">
                  Automate this field with an agent
                </span>
                <InfoIcon className="ml-1 h-3 w-3 text-gray-600" />
              </div>
              <button className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600">
                Convert
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
