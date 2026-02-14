"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getBaseColor, BASE_COLORS } from "~/lib/base-icon-utils";
import { getStoredBaseColor, setStoredBaseColor } from "~/lib/base-color-storage";
import { api } from "~/trpc/react";

interface Table {
  id: number;
  name: string;
}

interface BaseHeaderProps {
  base: {
    id: string;
    name: string;
    icon: string;
  };
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  tables?: Table[];
  activeTableId?: number;
  onTableChange?: (tableId: number) => void;
  onAddTable?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  onRenameTable?: (tableId: number, newName: string) => void;
  onDeleteTable?: (tableId: number) => void;
  onDuplicateTable?: (tableId: number) => void;
  onRenameBase?: (newName: string) => void;
}

export function BaseHeader({
  base,
  user,
  tables = [],
  activeTableId,
  onTableChange,
  onAddTable,
  onRenameTable,
  onDeleteTable,
  onDuplicateTable,
  onRenameBase,
}: BaseHeaderProps) {
  const [activeTab, setActiveTab] = useState("data");
  const [tableMenuId, setTableMenuId] = useState<number | null>(null);
  const [deleteConfirmTableId, setDeleteConfirmTableId] = useState<
    number | null
  >(null);
  const [isImportSubOpen, setIsImportSubOpen] = useState(false);
  const [isTableSearchOpen, setIsTableSearchOpen] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [showBaseMenu, setShowBaseMenu] = useState(false);
  const [isRenamingBase, setIsRenamingBase] = useState(false);
  const [baseNameValue, setBaseNameValue] = useState(base.name);
  const [renamingTableId, setRenamingTableId] = useState<number | null>(null);
  const [renamingTableValue, setRenamingTableValue] = useState("");
  const [showBaseSubMenu, setShowBaseSubMenu] = useState(false);
  const [appearanceTab, setAppearanceTab] = useState<"color" | "icon">("color");
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isBaseGuideOpen, setIsBaseGuideOpen] = useState(true);
  const [baseGuideValue, setBaseGuideValue] = useState("Add context to help collaborators understand what this base is for and how to use it.");
  const [iconColor, setIconColor] = useState(getStoredBaseColor(base.id));
  const [showDeleteBaseConfirm, setShowDeleteBaseConfirm] = useState(false);
  const tableSearchRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const utils = api.useUtils();

  const deleteBaseMutation = api.base.delete.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate();
      router.push("/dashboard");
    },
  });

  const handleColorChange = (color: string) => {
    setIconColor(color);
    setStoredBaseColor(base.id, color);
  };

  const handleDuplicateBase = () => {
    setShowBaseSubMenu(false);
    alert("Base duplication coming soon. This will create a copy of all tables, columns, rows, and views.");
  };

  const handleDeleteBase = () => {
    setShowBaseSubMenu(false);
    setShowDeleteBaseConfirm(true);
  };

  const handleDeleteBaseConfirm = () => {
    deleteBaseMutation.mutate({ id: base.id });
  };

  useEffect(() => {
    if (isTableSearchOpen && tableSearchRef.current) {
      tableSearchRef.current.focus();
    }
  }, [isTableSearchOpen]);

  useEffect(() => {
    if (renamingTableId !== null && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingTableId]);

  const closeMenu = useCallback(() => {
    setTableMenuId(null);
    setIsImportSubOpen(false);
  }, []);

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(tableSearchQuery.toLowerCase()),
  );

  return (
    <>
      <header className="shrink-0 bg-white">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {/* Left: Back & Base Name */}
          <div className="relative flex items-center gap-2">
            {isRenamingBase ? (
              <div className="flex items-center gap-1.5 rounded-md px-2 py-1">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${iconColor}`}>
                  <Image
                    src="/airtable-black.svg"
                    alt="Base icon"
                    width={16}
                    height={16}
                    className="brightness-0 invert"
                  />
                </div>
                <input
                  type="text"
                  value={baseNameValue}
                  onChange={(e) => setBaseNameValue(e.target.value)}
                  onBlur={() => {
                    if (baseNameValue.trim() && baseNameValue !== base.name) {
                      onRenameBase?.(baseNameValue.trim());
                    }
                    setIsRenamingBase(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (baseNameValue.trim() && baseNameValue !== base.name) {
                        onRenameBase?.(baseNameValue.trim());
                      }
                      setIsRenamingBase(false);
                    } else if (e.key === "Escape") {
                      setBaseNameValue(base.name);
                      setIsRenamingBase(false);
                    }
                  }}
                  className="rounded border border-blue-500 px-2 py-0.5 text-sm font-semibold text-gray-900 ring-1 ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setShowBaseMenu(!showBaseMenu)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${iconColor}`}>
                  <Image
                    src="/airtable-black.svg"
                    alt="Base icon"
                    width={16}
                    height={16}
                    className="brightness-0 invert"
                  />
                </div>
                {base.name}
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}

            {/* Base Menu Dropdown */}
            {showBaseMenu && !isRenamingBase && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => {
                    setShowBaseMenu(false);
                    setShowBaseSubMenu(false);
                  }}
                />
                <div className="absolute top-full left-0 z-[100] mt-1 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                  {/* Base name input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      value={baseNameValue}
                      onChange={(e) => setBaseNameValue(e.target.value)}
                      onBlur={() => {
                        if (baseNameValue.trim() && baseNameValue !== base.name) {
                          onRenameBase?.(baseNameValue.trim());
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (baseNameValue.trim() && baseNameValue !== base.name) {
                            onRenameBase?.(baseNameValue.trim());
                          }
                        }
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="mb-3 flex items-center gap-2">
                    <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-50">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Star base
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowBaseSubMenu(!showBaseSubMenu)}
                        className="rounded-md p-1 text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>

                      {/* Sub menu */}
                      {showBaseSubMenu && (
                        <div className="absolute top-full right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            onClick={handleDuplicateBase}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Duplicate base
                          </button>
                          <button
                            onClick={() => setShowBaseSubMenu(false)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            Slack notifications
                          </button>
                          <button
                            onClick={handleDeleteBase}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete base
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    {/* Appearance expander */}
                    <div className="mb-2">
                      <button
                        onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
                        className="flex w-full items-center justify-between px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Appearance
                        <svg
                          className={`h-4 w-4 transition-transform ${isAppearanceOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isAppearanceOpen && (
                        <div className="mt-2 px-2">
                          {/* Tabs */}
                          <div className="mb-3 flex gap-1 border-b border-gray-200">
                            <button
                              onClick={() => setAppearanceTab("color")}
                              className={`px-3 py-1.5 text-xs font-medium ${
                                appearanceTab === "color"
                                  ? "border-b-2 border-blue-500 text-blue-600"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              Color
                            </button>
                            <button
                              onClick={() => setAppearanceTab("icon")}
                              className={`px-3 py-1.5 text-xs font-medium ${
                                appearanceTab === "icon"
                                  ? "border-b-2 border-blue-500 text-blue-600"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              Icon
                            </button>
                          </div>

                          {/* Color grid */}
                          {appearanceTab === "color" && (
                            <div className="grid grid-cols-6 gap-1.5">
                              {BASE_COLORS.map((color, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleColorChange(color)}
                                  className={`h-8 w-8 rounded border-2 transition-all hover:scale-110 ${
                                    iconColor === color ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                                  } ${color}`}
                                >
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Image
                                      src="/airtable-black.svg"
                                      alt="Icon preview"
                                      width={16}
                                      height={16}
                                      className="brightness-0 invert"
                                    />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Icon selector placeholder */}
                          {appearanceTab === "icon" && (
                            <div className="text-xs text-gray-500">
                              Icon selector coming soon...
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Base guide expander */}
                    <div>
                      <button
                        onClick={() => setIsBaseGuideOpen(!isBaseGuideOpen)}
                        className="flex w-full items-center justify-between px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Base guide
                        <svg
                          className={`h-4 w-4 transition-transform ${isBaseGuideOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isBaseGuideOpen && (
                        <div className="mt-2 px-2">
                          <textarea
                            value={baseGuideValue}
                            onChange={(e) => setBaseGuideValue(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={4}
                            placeholder="Add context to help collaborators..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex items-center gap-3">
            {(["Data", "Automations", "Interfaces", "Forms"] as const).map(
              (tab) => {
                const tabKey = tab.toLowerCase();
                return (
                  <button
                    key={tabKey}
                    onClick={() => setActiveTab(tabKey)}
                    className={`relative px-1 py-5 text-sm font-medium transition-colors ${
                      activeTab === tabKey
                        ? "text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                    {activeTab === tabKey && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${iconColor}`} />
                    )}
                  </button>
                );
              },
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            <button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.58-5.84L18 2m-3 6l-3-3m6 6l-3-3"
                />
              </svg>
              Launch
            </button>

            <button className={`rounded-md px-3 py-1 text-xs font-semibold text-white ${iconColor} hover:opacity-90`}>
              Share
            </button>
          </div>
        </div>

        {/* Table Tabs Row */}
        <div className="flex items-end bg-gray-100">
          {/* Table Tabs */}
          <div className="flex flex-1 items-end gap-0">
            {tables.map((table, index) => {
              const isActive = table.id === activeTableId;
              const isMenuOpen = tableMenuId === table.id;

              return (
                <div key={table.id} className="relative flex items-end">
                  {/* Separator between inactive tabs */}
                  {index > 0 &&
                    !isActive &&
                    tables[index - 1]?.id !== activeTableId && (
                      <div className="mb-2 h-4 w-px bg-gray-300" />
                    )}

                  <div
                    className={`group relative flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? `rounded-t-md bg-white text-gray-900 ${iconColor}/5`
                        : "text-gray-600 hover:rounded-t-md hover:bg-gray-200/70"
                    }`}
                  >
                    <button
                      onClick={() => onTableChange?.(table.id)}
                      onDoubleClick={() => {
                        setRenamingTableId(table.id);
                        setRenamingTableValue(table.name);
                        setTableMenuId(null);
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
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Rename table popup */}
                  {renamingTableId === table.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setRenamingTableId(null)}
                      />
                      <div className="absolute top-full left-0 z-[100] mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Table name
                          </label>
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renamingTableValue}
                            onChange={(e) => setRenamingTableValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && renamingTableValue.trim()) {
                                onRenameTable?.(table.id, renamingTableValue.trim());
                                setRenamingTableId(null);
                              } else if (e.key === "Escape") {
                                setRenamingTableId(null);
                              }
                            }}
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setRenamingTableId(null)}
                            className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (renamingTableValue.trim()) {
                                onRenameTable?.(table.id, renamingTableValue.trim());
                                setRenamingTableId(null);
                              }
                            }}
                            disabled={!renamingTableValue.trim()}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

                  {/* Table context menu */}
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={closeMenu} />
                      <div className="absolute top-full left-0 z-[100] mt-0.5 w-80 rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-lg">
                        {/* Import data - with submenu */}
                        <div className="relative">
                          <button
                            onMouseEnter={() => setIsImportSubOpen(true)}
                            onMouseLeave={() => setIsImportSubOpen(false)}
                            className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <span className="flex items-center gap-2.5">
                              <svg
                                className="h-4 w-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                />
                              </svg>
                              Import data
                            </span>
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
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>

                          {/* Import submenu */}
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
                                  <svg
                                    className="h-2.5 w-2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2.5}
                                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                  Team
                                </span>
                              </button>
                              <button
                                onClick={closeMenu}
                                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {/* CSV icon */}
                                <svg
                                  className="h-4 w-4 text-gray-400"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                CSV file
                              </button>
                              <button
                                onClick={closeMenu}
                                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {/* Excel icon */}
                                <svg
                                  className="h-4 w-4 text-green-700"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM7.5 17.5L10 14l-2.5-3.5h1.75L10.75 13l1.5-2.5H14L11.5 14l2.5 3.5h-1.75l-1.5-2.5-1.5 2.5H7.5z" />
                                </svg>
                                Microsoft Excel
                              </button>
                              <button
                                onClick={closeMenu}
                                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {/* Google Sheets icon */}
                                <svg
                                  className="h-4 w-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                                    fill="#0F9D58"
                                  />
                                  <path d="M14 2v6h6" fill="#87CEAC" />
                                  <rect
                                    x="7"
                                    y="12"
                                    width="10"
                                    height="7"
                                    rx="0.5"
                                    fill="white"
                                  />
                                  <line
                                    x1="7"
                                    y1="14.5"
                                    x2="17"
                                    y2="14.5"
                                    stroke="#0F9D58"
                                    strokeWidth="0.5"
                                  />
                                  <line
                                    x1="7"
                                    y1="16.5"
                                    x2="17"
                                    y2="16.5"
                                    stroke="#0F9D58"
                                    strokeWidth="0.5"
                                  />
                                  <line
                                    x1="11"
                                    y1="12"
                                    x2="11"
                                    y2="19"
                                    stroke="#0F9D58"
                                    strokeWidth="0.5"
                                  />
                                </svg>
                                Google Sheets
                              </button>
                              <button
                                onClick={closeMenu}
                                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {/* Paste icon */}
                                <svg
                                  className="h-4 w-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                  />
                                </svg>
                                Paste table data
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="my-1 border-t border-gray-100" />

                        {/* Rename table */}
                        <button
                          onClick={() => {
                            closeMenu();
                            setRenamingTableId(table.id);
                            setRenamingTableValue(table.name);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Rename table
                        </button>

                        {/* Hide table */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                            />
                          </svg>
                          Hide table
                        </button>

                        {/* Manage fields */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <span className="flex items-center gap-2.5">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16m-7 6h7"
                              />
                            </svg>
                            Manage fields
                          </span>
                          <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                            <svg
                              className="h-2.5 w-2.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            Team
                          </span>
                        </button>

                        {/* Duplicate table */}
                        <button
                          onClick={() => {
                            if (onDuplicateTable) onDuplicateTable(table.id);
                            closeMenu();
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Duplicate table
                        </button>

                        <div className="my-1 border-t border-gray-100" />

                        {/* Configure date dependencies */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <span className="flex flex-row items-center gap-2">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Configure date dependencies
                          </span>
                          <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                            <svg
                              className="h-2.5 w-2.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            Team
                          </span>
                        </button>

                        <div className="my-1 border-t border-gray-100" />

                        {/* Edit table description */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Edit table description
                        </button>

                        {/* Edit table permissions */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <span className="flex items-center gap-2.5">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            Edit table permissions
                          </span>
                          <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                            <svg
                              className="h-2.5 w-2.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            Team
                          </span>
                        </button>

                        <div className="my-1 border-t border-gray-100" />

                        {/* Clear data */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Clear data
                        </button>

                        {/* Delete table */}
                        <button
                          onClick={() => {
                            setDeleteConfirmTableId(table.id);
                            closeMenu();
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete table
                        </button>
                      </div>
                    </>
                  )}

                  {/* Delete confirmation dropdown */}
                  {deleteConfirmTableId === table.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setDeleteConfirmTableId(null)}
                      />
                      <div className="absolute top-full left-0 z-[100] mt-0.5 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
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
                              onDeleteTable?.(deleteConfirmTableId);
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
                className="mb-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-gray-400 hover:bg-gray-200/70 hover:text-gray-600"
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Table search dropdown */}
              {isTableSearchOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsTableSearchOpen(false)}
                  />
                  <div className="absolute top-full left-0 z-[100] mt-1 w-96 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-lg">
                    <div className="pb-2">
                      <div className="flex items-center gap-2 rounded-md border-b border-gray-200 px-2 py-1.5">
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
                          ref={tableSearchRef}
                          type="text"
                          value={tableSearchQuery}
                          onChange={(e) => setTableSearchQuery(e.target.value)}
                          placeholder="Find a table"
                          className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
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
                              onTableChange?.(table.id);
                              setIsTableSearchOpen(false);
                              setTableSearchQuery("");
                            }}
                            className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 transition-all hover:bg-gray-50"
                          >
                            <span className="flex items-center gap-2">
                              {isActive ? (
                                <svg
                                  className="h-4 w-4 text-gray-900"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
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
                      onClick={() => {
                        onAddTable?.();
                        setIsTableSearchOpen(false);
                        setTableSearchQuery("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
                    >
                      <span className="flex items-center gap-2">
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Add table
                      </span>
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Add or import button */}
            <button
              onClick={onAddTable}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:rounded-t-md hover:bg-gray-200/70 hover:text-gray-700"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add or import
            </button>
          </div>

          {/* Right: Tools */}
          <div className="mb-0 ml-auto flex items-center py-1.5">
            <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-200/70 hover:text-gray-700">
              Tools
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Delete Base Confirmation Dialog */}
      {showDeleteBaseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Delete base?</h2>
            <p className="mb-4 text-sm text-gray-600">
              This will permanently delete &quot;{base.name}&quot; and all its tables, columns, rows, and views. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteBaseConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBaseConfirm}
                disabled={deleteBaseMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteBaseMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
