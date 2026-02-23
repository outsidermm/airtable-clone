"use client";

import { useBase } from "../base-context";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Base } from "~/types/base";
import { useTableMutations } from "../../hooks/use-table-mutations";
import { api } from "~/trpc/react";
import { ChevronDownIcon, PlusIcon } from "../../ui/icons";
import type { Table } from "~/types/table";
import { getLightColorClass } from "~/lib/base-icon-utils";
import { RenameTableModal } from "../modals/rename-table-modal";
import { EditTableModal } from "../modals/edit-table-modal";
import { SearchTableModal } from "../modals/search-table-modal";

interface TableTabsProps {
  base: Base;
  tables: Table[];
  iconColor: string;
}

export function TableTabs({ base, tables, iconColor }: TableTabsProps) {
  const utils = api.useUtils();
  const {
    activeTableId,
    setActiveTableId,
    renamingTableId,
    setRenamingTableId,
    openModal,
  } = useBase();
  const tableMutations = useTableMutations(base.id, tables);

  const [tableMenuId, setTableMenuId] = useState<number | null>(null);
  const [deleteConfirmTableId, setDeleteConfirmTableId] = useState<
    number | null
  >(null);
  const [isImportSubOpen, setIsImportSubOpen] = useState(false);
  const [renamingTableValue, setRenamingTableValue] = useState("");
  const [isTableSearchOpen, setIsTableSearchOpen] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const tableSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isTableSearchOpen && tableSearchRef.current) {
      tableSearchRef.current.focus();
    }
  }, [isTableSearchOpen]);

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(tableSearchQuery.toLowerCase()),
  );

  useEffect(() => {
    if (renamingTableId !== null) {
      const table = tables.find((t) => t.id === renamingTableId);
      if (table) {
        setRenamingTableValue(table.name);
      }
    }
  }, [renamingTableId, tables]);

  useEffect(() => {
    if (renamingTableId !== null && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingTableId]);

  const closeMenu = useCallback(() => {
    setTableMenuId(null);
    setIsImportSubOpen(false);
  }, []);

  return (
    <div className={`flex items-end ${getLightColorClass(iconColor)}`}>
      <div className="flex flex-1 items-end gap-0">
        {tables.map((table, index) => {
          const isActive = table.id === activeTableId;
          const isMenuOpen = tableMenuId === table.id;

          return (
            <div key={table.id} className="relative flex items-end">
              {index > 0 &&
                !isActive &&
                tables[index - 1]?.id !== activeTableId && (
                  <div className="mb-2 h-4 w-px bg-gray-300" />
                )}

              <div
                className={`group relative flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? `rounded-t-md bg-white text-gray-900`
                    : `text-gray-600 hover:rounded-t-md ${getLightColorClass(
                        iconColor,
                      )} hover:bg-gray-200/70`
                }`}
                onMouseEnter={() =>
                  void utils.table.getById.prefetch({ id: table.id })
                }
              >
                <button
                  onClick={() => setActiveTableId(table.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTableMenuId(table.id);
                  }}
                  onDoubleClick={() => {
                    setRenamingTableId(table.id);
                  }}
                  className="flex-1 text-left"
                >
                  {table.name}
                </button>
                {isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTableMenuId(isMenuOpen ? null : table.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDownIcon className="h-3 w-3" />
                  </button>
                )}
              </div>

              {renamingTableId === table.id && (
                <RenameTableModal
                  base={base}
                  tables={tables}
                  table={table}
                  setRenamingTableId={setRenamingTableId}
                  renamingTableValue={renamingTableValue}
                  setRenamingTableValue={setRenamingTableValue}
                  renameInputRef={renameInputRef}
                />
              )}

              {index === tables.length - 1 &&
                tables[index]?.id !== activeTableId && (
                  <div className="mb-2 h-4 w-px bg-gray-300" />
                )}

              {isMenuOpen && (
                <EditTableModal
                  table={table}
                  tables={tables}
                  setRenamingTableId={setRenamingTableId}
                  setDeleteConfirmTableId={setDeleteConfirmTableId}
                  isImportSubOpen={isImportSubOpen}
                  setIsImportSubOpen={setIsImportSubOpen}
                  closeMenu={closeMenu}
                />
              )}

              {deleteConfirmTableId === table.id && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setDeleteConfirmTableId(null)}
                  />
                  <div className="absolute top-full left-0 z-100 mt-0.5 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                    <p className="text-sm font-medium text-gray-900">
                      Are you sure you want to delete this table?
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Recently deleted tables can be restored from trash.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setDeleteConfirmTableId(null)}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          tableMutations.handleDeleteTable(
                            deleteConfirmTableId,
                          );
                          setDeleteConfirmTableId(null);
                        }}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {/* Search tables icon */}
        <div className="relative flex items-center">
          <button
            onClick={() => {
              setIsTableSearchOpen(!isTableSearchOpen);
              setTableSearchQuery("");
            }}
            className="mb-1 flex items-center gap-1 rounded-md px-2 py-2 text-gray-400 hover:text-gray-600"
          >
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </button>

          {/* Table search dropdown */}
          {isTableSearchOpen && (
            <SearchTableModal
              setIsTableSearchOpen={setIsTableSearchOpen}
              tableSearchQuery={tableSearchQuery}
              setTableSearchQuery={setTableSearchQuery}
              filteredTables={filteredTables}
              activeTableId={activeTableId}
              setActiveTableId={setActiveTableId}
              tableSearchRef={tableSearchRef}
            />
          )}
        </div>

        {/* Add or import button */}
        <button
          onClick={(e) => {
            openModal("add-table", e.currentTarget);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <PlusIcon className="h-4 w-4" />
          Add or import
        </button>
      </div>

      {/* Right: Tools */}
      <div className="mb-0 ml-auto flex items-center py-1.5">
        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-200/70 hover:text-gray-700">
          Tools
          <ChevronDownIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
