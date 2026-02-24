"use client";
import { useState, useEffect } from "react";
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
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  ClockIcon,
  RocketIcon,
} from "~/app/_components/ui/icons";
import type { Base } from "~/types/base";
import { TableTabs } from "./table-tabs";
import type { Table } from "~/types/table";
import { DeleteBaseConfirmModal } from "../modals/delete-base-confirm-modal";
import { EditBaseModal } from "../modals/edit-base-modal";

interface BaseHeaderProps {
  base: Base;
  tables: Table[];
}

export function BaseHeader({ base, tables = [] }: BaseHeaderProps) {
  const baseMutations = useBaseMutations();
  const [activeTab, setActiveTab] = useState("data");
  const [showBaseMenu, setShowBaseMenu] = useState(false);
  const [isRenamingBase, setIsRenamingBase] = useState(false);
  const [baseNameValue, setBaseNameValue] = useState(base.name);
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
    setShowBaseMenu(false);
  };

  useEffect(() => {
    if (!isRenamingBase) {
      setBaseNameValue(base.name);
    }
  }, [base.name, isRenamingBase]);

  return (
    <>
      <header className="shrink-0 bg-white">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowBaseMenu(!showBaseMenu)}
              className="text-md flex items-center gap-2 rounded-md px-2 py-1 font-semibold text-gray-900"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${iconColor}`}
              >
                <Image
                  src="/airtable-black.svg"
                  alt="Base icon"
                  width={22}
                  height={22}
                  className="brightness-0 invert"
                />
              </div>
              {base.name}
              <ChevronDownIcon className="h-3 w-3 text-gray-500" />
            </button>

            {showBaseMenu && !isRenamingBase && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => {
                    setShowBaseMenu(false);
                    setShowBaseSubMenu(false);
                  }}
                />
                <div className="absolute top-full left-0 z-100 mt-1 w-100 rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
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
                          baseMutations.handleRename(
                            base.id,
                            baseNameValue.trim(),
                          );
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (
                            baseNameValue.trim() &&
                            baseNameValue !== base.name
                          ) {
                            baseMutations.handleRename(
                              base.id,
                              baseNameValue.trim(),
                            );
                          }
                        }
                      }}
                      className="w-full rounded-md px-3 py-1.5 text-xl hover:bg-gray-100 focus:border-blue-500 focus:bg-gray-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
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

                      {showBaseSubMenu && (
                        <EditBaseModal
                          handleDuplicateBase={handleDuplicateBase}
                          handleDeleteBase={handleDeleteBase}
                          setShowBaseSubMenu={setShowBaseSubMenu}
                        />
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-2">
                    <div className="mb-2">
                      <button
                        onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
                        className="flex w-full items-center justify-start gap-2 px-2 py-1.5 text-lg text-gray-900 hover:bg-gray-50"
                      >
                        <ChevronRightIcon
                          className={`h-4 w-4 transition-transform ${
                            isAppearanceOpen ? "rotate-90" : ""
                          }`}
                        />
                        Appearance
                      </button>
                      {isAppearanceOpen && (
                        <div className="mt-2 px-2">
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

                          {appearanceTab === "icon" && (
                            <div className="text-xs text-gray-500">
                              Icon selector coming soon...
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-300 pt-2" />

                    <div>
                      <button
                        onClick={() => setIsBaseGuideOpen(!isBaseGuideOpen)}
                        className="flex w-full items-center justify-start gap-2 px-2 py-1.5 text-lg text-gray-900 hover:bg-gray-50"
                      >
                        <ChevronRightIcon
                          className={`h-4 w-4 transition-transform ${
                            isBaseGuideOpen ? "rotate-90" : ""
                          }`}
                        />
                        Base guide
                      </button>
                      {isBaseGuideOpen && (
                        <div className="mt-2 px-2">
                          <textarea
                            value={baseGuideValue}
                            onChange={(e) => setBaseGuideValue(e.target.value)}
                            className="w-full resize-none rounded-md px-2 py-1.5 text-[13px] text-gray-600 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 focus:outline-none"
                            rows={16}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
            {showDeleteBaseConfirm && (
              <DeleteBaseConfirmModal
                base={base}
                setShowDeleteBaseConfirm={setShowDeleteBaseConfirm}
              />
            )}
          </div>

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

          <div className="flex items-center gap-2">
            <button className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
              <ClockIcon className="h-4 w-4" />
            </button>

            <button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <RocketIcon className="h-4 w-4" />
              Launch
            </button>

            <button
              className={`rounded-md px-3 py-1.5 text-xs text-white ${iconColor} hover:opacity-90`}
            >
              Share
            </button>
          </div>
        </div>
        <TableTabs base={base} tables={tables} iconColor={iconColor} />
      </header>
    </>
  );
}
