"use client";

import { useBase } from "../base-context";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Base } from "~/types/base";
import { useTableMutations } from "../../hooks/use-table-mutations";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ImportIcon,
  TeamIcon,
  DocumentIcon,
  ExcelIcon,
  GSheetIcon,
  ClipboardIcon,
  RenameIcon,
  HideIcon,
  TextIcon,
  DuplicateIcon,
  CalendarIcon,
  LockIcon,
  PencilIcon,
  XIcon,
  TrashIcon,
  PlusIcon,
  SearchIcon,
  CheckIcon,
} from "../../ui/icons";

interface Table {
  id: number;
  name: string;
  baseId: string;
}

interface TableTabsProps {
  base: Base;
  tables: Table[];
  iconColor: string;
}

export function TableTabs({ base, tables, iconColor }: TableTabsProps) {
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

  const getLightColorClass = (colorClass: string) => {
    const colorName = colorClass.split("-")[1] ?? "gray";
    const colorMap: Record<string, string> = {
      red: "bg-red-100",
      orange: "bg-orange-100",
      yellow: "bg-yellow-100",
      green: "bg-green-100",
      cyan: "bg-cyan-100",
      blue: "bg-blue-100",
      indigo: "bg-indigo-100",
      purple: "bg-purple-100",
      pink: "bg-pink-100",
      gray: "bg-gray-100",
    };
    return colorMap[colorName] ?? "bg-gray-100";
  };

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
              >
                <button
                  onClick={() => setActiveTableId(table.id)}
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
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setRenamingTableId(null)}
                  />
                  <div className="absolute top-full z-1000 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                    <div className="mb-2">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renamingTableValue}
                        onChange={(e) => setRenamingTableValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renamingTableValue.trim()) {
                            tableMutations.handleRenameTable(
                              table.id,
                              renamingTableValue.trim(),
                            );
                            setRenamingTableId(null);
                          } else if (e.key === "Escape") {
                            setRenamingTableId(null);
                          }
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <p className="mb-2 text-xs text-gray-700">
                      What should each record be called?
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setRenamingTableId(null)}
                        className="rounded-md px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (renamingTableValue.trim()) {
                            tableMutations.handleRenameTable(
                              table.id,
                              renamingTableValue.trim(),
                            );
                            setRenamingTableId(null);
                          }
                        }}
                        disabled={!renamingTableValue.trim()}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}

              {index === tables.length - 1 &&
                tables[index]?.id !== activeTableId && (
                  <div className="mb-2 h-4 w-px bg-gray-300" />
                )}

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={closeMenu} />
                  <div className="absolute top-full left-0 z-100 mt-0.5 w-80 rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-lg">
                    <div className="relative">
                      <button
                        onMouseEnter={() => setIsImportSubOpen(true)}
                        onMouseLeave={() => setIsImportSubOpen(false)}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2.5">
                          <ImportIcon className="h-4 w-4 text-gray-500" />
                          Import data
                        </span>
                        <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
                      </button>

                      {isImportSubOpen && (
                        <div
                          onMouseEnter={() => setIsImportSubOpen(true)}
                          onMouseLeave={() => setIsImportSubOpen(false)}
                          className="absolute top-0 left-full ml-0.5 w-56 rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-lg"
                        >
                          <button
                            onClick={closeMenu}
                            className="flex w-full items-center justify-between gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Airtable base
                            <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                              <TeamIcon className="h-2.5 w-2.5" />
                              Team
                            </span>
                          </button>
                          <button
                            onClick={closeMenu}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <DocumentIcon className="h-4 w-4 text-gray-400" />
                            CSV file
                          </button>
                          <button
                            onClick={closeMenu}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <ExcelIcon className="h-4 w-4 text-green-700" />
                            Microsoft Excel
                          </button>
                          <button
                            onClick={closeMenu}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <GSheetIcon className="h-4 w-4" />
                            Google Sheets
                          </button>
                          <button
                            onClick={closeMenu}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <ClipboardIcon className="h-4 w-4 text-gray-400" />
                            Paste table data
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      onClick={() => {
                        closeMenu();
                        setRenamingTableId(table.id);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <RenameIcon className="h-4 w-4 text-gray-400" />
                      Rename table
                    </button>
                    <button
                      onClick={closeMenu}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <HideIcon className="h-4 w-4 text-gray-400" />
                      Hide table
                    </button>
                    <button
                      onClick={closeMenu}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <TextIcon className="h-4 w-4 text-gray-400" />
                        Manage fields
                      </span>
                      <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                        <TeamIcon className="h-2.5 w-2.5" />
                        Team
                      </span>
                    </button>
                    <button
                      onClick={closeMenu}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <DuplicateIcon className="h-4 w-4 text-gray-400" />
                      Duplicate table
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={closeMenu}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="flex flex-row items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        Configure date dependencies
                      </span>
                      <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                        <TeamIcon className="h-2.5 w-2.5" />
                        Team
                      </span>
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      onClick={closeMenu}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4 text-gray-400" />
                      Edit table description
                    </button>

                    <button
                      onClick={closeMenu}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <LockIcon className="h-4 w-4 text-gray-400" />
                        Edit table permissions
                      </span>
                      <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                        <TeamIcon className="h-2.5 w-2.5" />
                        Team
                      </span>
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      onClick={closeMenu}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <XIcon className="h-4 w-4 text-gray-400" />
                      Clear data
                    </button>

                    <button
                      onClick={() => {
                        setDeleteConfirmTableId(table.id);
                        closeMenu();
                      }}
                      disabled={tables.length === 1}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm ${
                        tables.length === 1
                          ? "text-gray-400"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <TrashIcon
                        className={`h-4 w-4 ${
                          tables.length === 1
                            ? "text-gray-400"
                            : "text-gray-200"
                        }`}
                      />
                      Delete table
                    </button>
                  </div>
                </>
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
            className="mb-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-gray-400 hover:text-gray-600"
          >
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </button>

          {/* Table search dropdown */}
          {isTableSearchOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsTableSearchOpen(false)}
              />
              <div className="absolute top-full left-0 z-100 mt-1 w-96 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-lg">
                <div className="pb-2">
                  <div className="flex items-center gap-2 rounded-md border-b border-gray-200 px-2 py-1.5">
                    <SearchIcon className="h-3.5 w-3.5 text-gray-400" />
                    <input
                      ref={tableSearchRef}
                      type="text"
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      placeholder="Find a table"
                      className="ml-2 w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredTables.map((table) => {
                    const isActive = table.id === activeTableId;
                    return (
                      <button
                        key={table.id}
                        onClick={() => {
                          setActiveTableId?.(table.id);
                          setIsTableSearchOpen(false);
                          setTableSearchQuery("");
                        }}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 transition-all hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          {isActive ? (
                            <CheckIcon className="h-4 w-4 text-gray-500" />
                          ) : (
                            <span className="h-4 w-4" />
                          )}
                          {table.name}
                        </span>
                      </button>
                    );
                  })}
                  {filteredTables.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No tables found
                    </div>
                  )}
                </div>

                {/* Divider + Add table */}
                <div className="my-1.5 border-t border-gray-100" />
                <button
                  onClick={(e) => {
                    openModal("add-table", e.currentTarget);
                    setIsTableSearchOpen(false);
                    setTableSearchQuery("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
                >
                  <span className="flex items-center gap-2">
                    <PlusIcon className="h-4 w-4 text-gray-400" />
                    Add table
                  </span>
                  <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Add or import button */}
        <button
          onClick={(e) => {
            openModal("add-table", e.currentTarget);
          }}
          className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <PlusIcon className="h-4 w-4" />
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
