"use client";

import { useState, useRef } from "react";
import type { GridColumn } from "~/types/grid";
import {
  ChevronDownIcon,
  NumberIcon,
  TextIcon,
  XIcon,
} from "~/app/_components/ui/icons";
import { useBase } from "../base-context";
import { useColumnMutations } from "../../hooks/use-column-mutations";
import { SearchableSelect } from "~/app/_components/ui/searchable-select";

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

  const modalRef = useRef<HTMLDivElement>(null);

  const selectedColumn = columns.find((c) => c.id === selectedColumnId);

  const handleConfirm = () => {
    if (selectedColumnId !== currentPrimaryId) {
      columnMutations.handleSetPrimaryColumn(selectedColumnId);
    }
    openModal(null);
  };

  // Map columns to the format expected by SearchableSelect
  const columnOptions = columns.map((col) => ({
    id: col.id,
    label: col.name,
    icon:
      col.type === "NUMBER" ? (
        <NumberIcon className="h-4 w-4 shrink-0 text-gray-400" />
      ) : (
        <TextIcon className="h-4 w-4 shrink-0 text-gray-400" />
      ),
  }));

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/25"
        onClick={() => {
          openModal(null);
        }}
      />

      <div
        ref={modalRef}
        className="fixed top-1/2 left-1/2 z-50 w-138 -translate-x-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white p-6 shadow-2xl"
      >
        <button
          onClick={() => openModal(null)}
          className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <div className="p-2">
          <h2 className="text-lg font-medium text-gray-900">
            Change the primary field
          </h2>
        </div>

        <div className="px-2 py-1">
          <div>
            <label className="mb-2 block text-xs tracking-wider text-gray-500">
              Primary Field
            </label>

            {/* Isolate the relative wrapper for JUST the button and dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-all hover:border-gray-400 focus:outline-none"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {selectedColumn?.type === "NUMBER" ? (
                    <NumberIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <TextIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <span className="truncate text-gray-900">
                    {selectedColumn?.name}
                  </span>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              </button>

              {isMenuOpen && (
                <SearchableSelect
                  options={columnOptions}
                  onSelect={(opt) => setSelectedColumnId(opt.id as number)}
                  onClose={() => setIsMenuOpen(false)}
                  searchPlaceholder="Find a field..."
                  widthClass="w-full"
                />
              )}
            </div>

            {/* The helper text now sits outside the relative block, meaning the absolute dropdown will cover it */}
            {selectedColumn?.id === currentPrimaryId && (
              <div className="mt-2 ml-1 text-[13px] text-gray-600">
                &quot;{selectedColumn?.name}&quot; is currently the primary
                field.
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-3 rounded-b-xl bg-gray-50/50 px-2 py-2">
          <button
            onClick={() => openModal(null)}
            className="rounded-lg px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedColumnId === currentPrimaryId}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Change primary field
          </button>
        </div>
      </div>
    </>
  );
}
