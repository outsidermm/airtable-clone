"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BASE_COLORS } from "~/lib/base-icon-utils";
import {
  getStoredBaseColor,
  setStoredBaseColor,
} from "~/lib/base-color-storage";
import { useBaseMutations } from "../../hooks/use-base-mutations";
import {
  StarIcon,
  StarOutlineIcon,
  DotsHorizontalIcon,
  DuplicateIcon,
  SlackIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  ImportIcon,
  ClockIcon,
  RocketIcon,
  TeamIcon,
  DocumentIcon,
  ExcelIcon,
  GSheetIcon,
  ClipboardIcon,
  PencilIcon,
  RenameIcon,
  HideIcon,
  TextIcon,
  CalendarIcon,
  LockIcon,
  XIcon,
  SearchIcon,
  PlusIcon,
} from "~/components/icons";
import type { Base } from "~/types/base";

interface Table {
  id: number;
  name: string;
}

interface BaseHeaderProps {
  base: Base;
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
  const [baseGuideValue, setBaseGuideValue] = useState(
    `Use this space to share the goals and details of your base with your team.

Start by outlining your goal.

Next, share details about key information in your base:
This table contains…
This view shows…
This link contains…

Teammates will see this guide when they first open the base and can find it anytime by clicking the down arrow on the top of their screen.`,
  );
  const [iconColor, setIconColor] = useState(getStoredBaseColor(base.id));
  const [showDeleteBaseConfirm, setShowDeleteBaseConfirm] = useState(false);
  const tableSearchRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const baseMutations = useBaseMutations();

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    baseMutations.handleToggleStarred(base.id);
  };

  const handleColorChange = (color: string) => {
    setIconColor(color);
    setStoredBaseColor(base.id, color);
  };

  const handleDuplicateBase = () => {
    setShowBaseSubMenu(false);
    alert(
      "Base duplication coming soon. This will create a copy of all tables, columns, rows, and views.",
    );
  };

  const handleDeleteBase = () => {
    setShowBaseSubMenu(false);
    setShowDeleteBaseConfirm(true);
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
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${iconColor}`}
                >
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
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${iconColor}`}
                >
                  <Image
                    src="/airtable-black.svg"
                    alt="Base icon"
                    width={16}
                    height={16}
                    className="brightness-0 invert"
                  />
                </div>
                {base.name}
                <ChevronDownIcon className="h-3 w-3 text-gray-500" />
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
                <div className="absolute top-full left-0 z-100 mt-1 w-100 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                  {/* Base name input */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={baseNameValue}
                      onChange={(e) => setBaseNameValue(e.target.value)}
                      onBlur={() => {
                        if (
                          baseNameValue.trim() &&
                          baseNameValue !== base.name
                        ) {
                          onRenameBase?.(baseNameValue.trim());
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (
                            baseNameValue.trim() &&
                            baseNameValue !== base.name
                          ) {
                            onRenameBase?.(baseNameValue.trim());
                          }
                        }
                      }}
                      className="w-full rounded-md px-3 py-1.5 text-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    {/* Star Button */}
                    <button
                      onClick={handleStarClick}
                      className="rounded bg-white p-1"
                      title={
                        base.starred ? "Remove from starred" : "Add to starred"
                      }
                    >
                      {base.starred ? (
                        <StarIcon className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <StarOutlineIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowBaseSubMenu(!showBaseSubMenu)}
                        className="rounded-md p-1 text-gray-700 hover:bg-gray-50"
                      >
                        <DotsHorizontalIcon className="h-4 w-4" />
                      </button>

                      {/* Sub menu */}
                      {showBaseSubMenu && (
                        <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-lg">
                          <button
                            onClick={handleDuplicateBase}
                            className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <DuplicateIcon className="h-4 w-4 text-gray-500" />
                            Duplicate base
                          </button>
                          <button
                            onClick={() => setShowBaseSubMenu(false)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <SlackIcon className="h-4 w-4 text-gray-500" />
                            Slack notifications
                          </button>
                          <button
                            onClick={handleDeleteBase}
                            className="flex w-full items-center gap-2 px-3 py-2 text-red-800 hover:bg-gray-50"
                          >
                            <TrashIcon className="h-4 w-4 text-gray-500" />
                            Delete base
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-2">
                    {/* Appearance expander */}
                    <div className="mb-2">
                      <button
                        onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
                        className="flex w-full items-center justify-start gap-2 px-2 py-1.5 text-lg text-gray-700 hover:bg-gray-50"
                      >
                        <ChevronRightIcon
                          className={`h-4 w-4 transition-transform ${isAppearanceOpen ? "rotate-90" : ""}`}
                        />
                        Appearance
                      </button>
                      {isAppearanceOpen && (
                        <div className="mt-2 px-2">
                          {/* Tabs */}
                          <div className="mb-3 flex gap-8 border-b border-gray-200">
                            <button
                              onClick={() => setAppearanceTab("color")}
                              className={`py-1.5 text-xs font-medium ${
                                appearanceTab === "color"
                                  ? "border-b-2 border-blue-500 text-blue-600"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              Color
                            </button>
                            <button
                              onClick={() => setAppearanceTab("icon")}
                              className={`py-1.5 text-xs font-medium ${
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
                            <div className="grid grid-cols-10 gap-1.5">
                              {BASE_COLORS.map((color, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleColorChange(color)}
                                  className={`h-7 w-8 rounded-lg border-2 border-gray-200 transition-all hover:scale-110 ${color}`}
                                >
                                  <div className="flex h-full w-full items-center justify-center">
                                    {iconColor === color && (
                                      <CheckIcon className="h-4 w-4 text-white" />
                                    )}
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

                    <div className="border-t border-gray-300 pt-2" />

                    {/* Base guide expander */}
                    <div>
                      <button
                        onClick={() => setIsBaseGuideOpen(!isBaseGuideOpen)}
                        className="flex w-full items-center justify-start gap-2 px-2 py-1.5 text-lg text-gray-700 hover:bg-gray-50"
                      >
                        <ChevronRightIcon
                          className={`h-4 w-4 transition-transform ${isBaseGuideOpen ? "rotate-90" : ""}`}
                        />
                        Base guide
                      </button>
                      {isBaseGuideOpen && (
                        <div className="mt-2 px-2">
                          <textarea
                            value={baseGuideValue}
                            onChange={(e) => setBaseGuideValue(e.target.value)}
                            className="w-full resize-none rounded-md px-2 py-1.5 text-xs focus:border-blue-300 focus:ring-1 focus:ring-blue-300 focus:outline-none"
                            rows={13}
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
                      <div
                        className={`absolute right-0 bottom-0 left-0 h-0.5 ${iconColor}`}
                      />
                    )}
                  </button>
                );
              },
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
              <ClockIcon className="h-4 w-4" />
            </button>

            <button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <RocketIcon className="h-4 w-4" />
              Launch
            </button>

            <button
              className={`rounded-md px-3 py-1 text-xs font-semibold text-white ${iconColor} hover:opacity-90`}
            >
              Share
            </button>
          </div>
        </div>

        {/* Table Tabs Row */}
        <div
          className={`flex items-end ${"bg-" + iconColor.split("-")[1] + "-100"}`}
        >
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
                        <ChevronDownIcon className="h-3 w-3" />
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
                      <div className="absolute top-full z-1000 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                        <div className="mb-2">
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renamingTableValue}
                            onChange={(e) =>
                              setRenamingTableValue(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                renamingTableValue.trim()
                              ) {
                                onRenameTable?.(
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
                                onRenameTable?.(
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

                  {/* Table context menu */}
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={closeMenu} />
                      <div className="absolute top-full left-0 z-100 mt-0.5 w-80 rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-lg">
                        {/* Import data - with submenu */}
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
                                  <TeamIcon className="h-2.5 w-2.5" />
                                  Team
                                </span>
                              </button>
                              <button
                                onClick={closeMenu}
                                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {/* CSV icon */}
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
                                {/* Google Sheets icon */}
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

                        {/* Rename table */}
                        <button
                          onClick={() => {
                            closeMenu();
                            setRenamingTableId(table.id);
                            setRenamingTableValue(table.name);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <RenameIcon className="h-4 w-4 text-gray-400" />
                          Rename table
                        </button>

                        {/* Hide table */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <HideIcon className="h-4 w-4 text-gray-400" />
                          Hide table
                        </button>

                        {/* Manage fields */}
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

                        {/* Duplicate table */}
                        <button
                          onClick={() => {
                            if (onDuplicateTable) onDuplicateTable(table.id);
                            closeMenu();
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <DuplicateIcon className="h-4 w-4 text-gray-400" />
                          Duplicate table
                        </button>

                        <div className="my-1 border-t border-gray-100" />

                        {/* Configure date dependencies */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <span className="flex flex-row items-center gap-2">
                          <CalendarIcon  className="h-4 w-4 text-gray-400" />

                            Configure date dependencies
                          </span>
                          <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                            <TeamIcon className="h-2.5 w-2.5" />
                            Team
                          </span>
                        </button>

                        <div className="my-1 border-t border-gray-100" />

                        {/* Edit table description */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <PencilIcon className="h-4 w-4 text-gray-400" />
                          Edit table description
                        </button>

                        {/* Edit table permissions */}
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

                        {/* Clear data */}
                        <button
                          onClick={closeMenu}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <XIcon className="h-4 w-4 text-gray-400" />
                          Clear data
                        </button>

                        {/* Delete table */}
                        <button
                          onClick={() => {
                            setDeleteConfirmTableId(table.id);
                            closeMenu();
                          }}
                          disabled={tables.length === 1}
                          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm ${tables.length===1 ? "text-gray-400" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          <TrashIcon className={`h-4 w-4 ${tables.length===1 ? "text-gray-400": "text-gray-200"}`} />
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
                              onTableChange?.(table.id);
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
                        onAddTable?.(e);
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
              onClick={onAddTable}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <PlusIcon className="h-3.5 w-3.5" />
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
      </header>

      {/* Delete Base Confirmation Dialog */}
      {showDeleteBaseConfirm && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Delete base?
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              This will permanently delete &quot;{base.name}&quot; and all its
              tables, columns, rows, and views. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteBaseConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  baseMutations.handleDeleteConfirm(base.id);
                  router.push("/dashboard");
                }}
                disabled={baseMutations.deleteBaseMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {baseMutations.deleteBaseMutation.isPending
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
