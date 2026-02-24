"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CalendarIcon,
  FormIcon,
  GalleryIcon,
  GanttIcon,
  GridIcon,
  KanbanIcon,
  ListIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  SectionIcon,
  TeamIcon,
  TimelineIcon,
  UserIcon,
  UsersIcon,
} from "~/app/_components/ui/icons";
import { useBase } from "../base-context";
import { useViewMutations } from "../../hooks/use-view-mutations";
import { SortableViewItem } from "./sortable-view-item";
import type { View } from "~/types/view";
import { MenuBadge, MenuDivider, MenuItem } from "../../ui/menu";

interface ViewSidebarProps {
  views: View[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function ViewSidebar({
  views,
  onMouseEnter,
  onMouseLeave,
}: ViewSidebarProps) {
  const { isSidebarOpen, activeTableId, activeViewId, setActiveViewId } =
    useBase();
  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );

  const [editingViewId, setEditingViewId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newViewName, setNewViewName] = useState("Grid view");
  const [newViewType, setNewViewType] = useState<string>("grid");
  const [whoCanEdit, setWhoCanEdit] = useState<
    "collaborative" | "personal" | "locked"
  >("collaborative");
  const [viewMenuId, setViewMenuId] = useState<number | null>(null);
  const [createMenuPosition, setCreateMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [localViewOrder, setLocalViewOrder] = useState<number[]>([]);
  const editInputRef = useRef<HTMLInputElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  const viewPermissionOptions = [
    {
      id: "collaborative" as const,
      label: "Collaborative",
      icon: <UsersIcon className="h-4 w-4 text-gray-400" />,
    },
    {
      id: "personal" as const,
      label: "Personal",
      icon: <UserIcon className="h-4 w-4 text-gray-400" />,
    },
    {
      id: "locked" as const,
      label: "Locked",
      icon: <LockIcon className="h-4 w-4 text-gray-400" />,
    },
  ];

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentOrder =
      localViewOrder.length > 0 ? localViewOrder : views.map((v) => v.id);
    const oldIndex = currentOrder.indexOf(active.id as number);
    const newIndex = currentOrder.indexOf(over.id as number);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = [...currentOrder];
      const [movedId] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedId!);
      setLocalViewOrder(newOrder);
      // Frontend only - no backend persistence
    }
  };

  useEffect(() => {
    if (editingViewId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingViewId]);

  const handleDoubleClick = (view: View) => {
    setEditingViewId(view.id);
    setEditingName(view.name);
  };

  // Apply local view order (frontend only, no backend persistence)
  const orderedViews = useMemo(() => {
    if (localViewOrder.length === 0) return views;

    const viewMap = new Map(views.map((v) => [v.id, v]));
    const ordered: View[] = [];

    // Add views in the stored order
    for (const id of localViewOrder) {
      const view = viewMap.get(id);
      if (view) {
        ordered.push(view);
        viewMap.delete(id);
      }
    }

    // Add any new views not in the order
    for (const view of viewMap.values()) {
      ordered.push(view);
    }

    return ordered;
  }, [views, localViewOrder]);

  const filteredViews = searchQuery
    ? orderedViews.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : orderedViews;

  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-all duration-200 ease-in-out ${
        isSidebarOpen ? "w-64 opacity-100" : "w-0 border-r-0 opacity-0"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="min-w-64 flex-1 overflow-y-auto p-2">
        {/* Create new view */}
        <div className="relative mb-2">
          <button
            ref={createButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              if (!showCreateMenu && createButtonRef.current) {
                const rect = createButtonRef.current.getBoundingClientRect();
                setCreateMenuPosition({
                  top: rect.top,
                  left: rect.right + 8,
                });
              } else {
                setCreateMenuPosition(null);
              }
              setShowCreateMenu(!showCreateMenu);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
          >
            <PlusIcon className="h-4 w-4" />
            Create new...
          </button>

          {/* View type selection popup */}
          {showCreateMenu && !showCreateForm && createMenuPosition && (
            <>
              <div
                role="presentation"
                className="fixed inset-0 z-30"
                onClick={() => {
                  setShowCreateMenu(false);
                  setCreateMenuPosition(null);
                }}
                onKeyDown={() => {
                  setShowCreateMenu(false);
                  setCreateMenuPosition(null);
                }}
              />
              <div
                className="fixed z-50 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
                style={{
                  top: createMenuPosition.top,
                  left: createMenuPosition.left,
                }}
              >
                <MenuItem
                  onClick={() => {
                    setNewViewType("grid");
                    setShowCreateMenu(false);
                    setShowCreateForm(true);
                    // Keep createMenuPosition for the form
                  }}
                  label="Grid"
                  icon={<GridIcon className="h-4 w-4 text-blue-400" />}
                />
                <MenuItem
                  label="Calendar"
                  icon={<CalendarIcon className="h-4 w-4 text-orange-400" />}
                />
                <MenuItem
                  label="Gallery"
                  icon={<GalleryIcon className="h-4 w-4 text-purple-400" />}
                />
                <MenuItem
                  label="Kanban"
                  icon={<KanbanIcon className="h-4 w-4 text-green-400" />}
                />
                <MenuItem
                  label="Timeline"
                  icon={<TimelineIcon className="h-4 w-4 text-red-400" />}
                  rightElement={
                    <MenuBadge variant="blue">
                      <TeamIcon className="h-2.5 w-2.5" />
                      Team
                    </MenuBadge>
                  }
                />
                <MenuItem
                  label="List"
                  icon={<ListIcon className="h-4 w-4 text-violet-400" />}
                />
                <MenuItem
                  label="Gantt"
                  icon={<GanttIcon className="h-4 w-4 text-green-700" />}
                  rightElement={
                    <MenuBadge variant="blue">
                      <TeamIcon className="h-2.5 w-2.5" />
                      Team
                    </MenuBadge>
                  }
                />
                <MenuDivider />
                <MenuItem
                  label="Form"
                  icon={<FormIcon className="h-4 w-4 text-pink-400" />}
                />
                <MenuDivider />
                <MenuItem
                  label="Section"
                  icon={<SectionIcon className="h-4 w-4 text-gray-400" />}
                  rightElement={
                    <MenuBadge variant="blue">
                      <TeamIcon className="h-2.5 w-2.5" />
                      Team
                    </MenuBadge>
                  }
                />
              </div>
            </>
          )}

          {/* Create view form popup */}
          {showCreateForm && createMenuPosition && (
            <>
              <div
                role="presentation"
                className="fixed inset-0 z-45"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateMenuPosition(null);
                }}
                onKeyDown={() => {
                  setShowCreateForm(false);
                  setCreateMenuPosition(null);
                }}
              />
              <div
                className="fixed z-50 w-100 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
                style={{
                  top: createMenuPosition.top,
                  left: createMenuPosition.left,
                }}
              >
                <div className="mb-6">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                  />
                </div>

                <div className="mb-4">
                  <span className="block font-medium text-gray-700">
                    Who can edit
                  </span>
                  <div className="flex flex-row items-center gap-4 text-xs">
                    {viewPermissionOptions.map((option) => {
                      const isSelected = whoCanEdit === option.id;

                      return (
                        <button
                          key={option.id}
                          onClick={() => setWhoCanEdit(option.id)}
                          className="group flex items-center gap-1 py-2 transition-colors"
                        >
                          {/* Outer Circle */}
                          <div className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 bg-white transition-all">
                            {/* Inner Dot */}
                            <div
                              className={`h-2 w-2 rounded-full bg-blue-600 transition-transform ${isSelected ? "scale-100" : "scale-0"} `}
                            />
                          </div>
                          {option.icon}
                          <span className="text-gray-600">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-600">
                    {whoCanEdit === "collaborative" &&
                      "All collaborators can edit the configuration"}
                    {whoCanEdit === "personal" &&
                      "Only you can edit the view configuration"}
                    {whoCanEdit === "locked" &&
                      "Nobody can edit the configuration"}
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateMenuPosition(null);
                    }}
                    className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      viewMutations.handleAddView();
                      setShowCreateForm(false);
                      setCreateMenuPosition(null);
                      setNewViewName("Grid view");
                      setNewViewType("grid");
                      setWhoCanEdit("collaborative");
                    }}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    Create new view
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search views */}
        <div className="mb-2">
          {showSearch ? (
            <div className="flex items-center gap-2 bg-white px-2 py-1.5">
              <SearchIcon className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a view"
                className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                autoFocus
                onBlur={() => {
                  if (!searchQuery) setShowSearch(false);
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex w-full items-center gap-2 bg-white px-2 py-1.5 text-xs text-gray-500 hover:border-gray-300"
            >
              <SearchIcon className="h-3.5 w-3.5 text-gray-400" />
              Find a view
            </button>
          )}
        </div>

        {/* View list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredViews.map((v) => v.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredViews.map((view) => (
              <SortableViewItem
                key={view.id}
                view={view}
                isEditing={editingViewId === view.id}
                editingName={editingName}
                viewMenuId={viewMenuId}
                viewsLength={views.length}
                onDoubleClick={handleDoubleClick}
                onSetEditingName={setEditingName}
                onSetEditingViewId={setEditingViewId}
                onSetViewMenuId={setViewMenuId}
                editInputRef={editInputRef}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}
