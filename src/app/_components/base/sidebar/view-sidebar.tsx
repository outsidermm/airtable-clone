"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type CSSProperties,
} from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "../grid-table/drag-handle";
import {
  CalendarIcon,
  DotsHorizontalIcon,
  DuplicateIcon,
  FormIcon,
  GalleryIcon,
  GanttIcon,
  GridIcon,
  KanbanIcon,
  ListIcon,
  LockIcon,
  PlusIcon,
  RenameIcon,
  SearchIcon,
  SectionIcon,
  StarOutlineIcon,
  TeamIcon,
  TimelineIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
} from "~/components/icons";
import { useBase } from "../base-context";
import { useViewMutations } from "../../hooks/use-view-mutations";

interface View {
  id: number;
  name: string;
}

interface ViewSidebarProps {
  views: View[];
  // onDuplicateView: (viewId: number) => void;
  // onReorderViews: (viewIds: number[]) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// --- Sortable View Item ---
interface SortableViewItemProps {
  view: View;
  isEditing: boolean;
  editingName: string;
  viewMenuId: number | null;
  viewsLength: number;
  onDoubleClick: (view: View) => void;
  onSetEditingName: (name: string) => void;
  onSetEditingViewId: (id: number | null) => void;
  onSetViewMenuId: (id: number | null) => void;
  // onDuplicateView: (viewId: number) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}

function SortableViewItem({
  view,
  isEditing,
  editingName,
  viewMenuId,
  viewsLength,
  onDoubleClick,
  onSetEditingName,
  onSetEditingViewId,
  onSetViewMenuId,
  // onDuplicateView,
  editInputRef,
}: SortableViewItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: view.id,
  });
  const { activeTableId, setActiveViewId, activeViewId } = useBase();
  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );
  const isActive = activeTableId === view.id;
  // Only apply vertical transform, ignore horizontal
  const constrainedTransform = transform ? { ...transform, x: 0 } : transform;

  const style: CSSProperties = {
    transform: CSS.Translate.toString(constrainedTransform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRenameSubmit = (viewId: number) => {
    if (editingName.trim() && editingName.trim() !== view.name.trim()) {
      viewMutations.handleRenameView(viewId, editingName.trim());
    }
    onSetEditingViewId(null);
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {isEditing ? (
        <div className="flex items-center gap-2 rounded-md bg-gray-100 px-2 py-1.5">
          <GridIcon className="h-4 w-4 text-blue-500" />
          <input
            ref={editInputRef}
            type="text"
            value={editingName}
            onChange={(e) => onSetEditingName(e.target.value)}
            onBlur={() => handleRenameSubmit(view.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit(view.id);
              if (e.key === "Escape") onSetEditingViewId(null);
            }}
            className="w-full border border-gray-600 bg-white text-xs font-medium text-gray-700 outline-none"
          />
        </div>
      ) : (
        <div className="relative flex items-center gap-1 hover:bg-gray-100">
          <button
            onClick={() => setActiveViewId(view.id)}
            onDoubleClick={() => onDoubleClick(view)}
            className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
              isActive
                ? "bg-gray-100 font-medium text-gray-700"
                : "text-gray-700"
            }`}
          >
            <GridIcon className="h-4 w-4 text-blue-500" />
            <span className="truncate">{view.name}</span>
          </button>

          {/* Three-dot menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetViewMenuId(viewMenuId === view.id ? null : view.id);
            }}
            className="hidden rounded p-1 text-gray-400 group-hover:block hover:text-gray-700"
          >
            <DotsHorizontalIcon className="h-3.5 w-3.5" />
          </button>

          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="hidden cursor-grab rounded p-1 text-gray-400 group-hover:block hover:text-gray-700 active:cursor-grabbing"
          >
            <DragHandle className="h-3.5 w-3.5" />
          </div>

          {/* Three-dot menu dropdown */}
          {viewMenuId === view.id && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => onSetViewMenuId(null)}
              />
              <div className="absolute top-full right-0 z-40 mt-1 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => onSetViewMenuId(null)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <StarOutlineIcon className="h-4 w-4" />
                  Add to &apos;my favourites&apos;
                </button>
                <div className="mx-4 border-b border-gray-200 py-0.5" />
                <button
                  onClick={() => {
                    onDoubleClick(view);
                    onSetViewMenuId(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RenameIcon className="h-4 w-4" />
                  Rename view
                </button>
                <button
                  onClick={() => {
                    // onDuplicateView(view.id);
                    onSetViewMenuId(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <DuplicateIcon className="h-4 w-4" />
                  Duplicate view
                </button>
                <button
                  onClick={() => {
                    viewMutations.handleDeleteView(view.id);
                    onSetViewMenuId(null);
                  }}
                  disabled={viewsLength <= 1}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 text-gray-400" />
                  Delete view
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ViewSidebar({
  views,
  // onDuplicateView,
  // onReorderViews,
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
                className="fixed inset-0 z-30"
                onClick={() => {
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
                <button
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setNewViewType("grid");
                    setShowCreateMenu(false);
                    setShowCreateForm(true);
                    // Keep createMenuPosition for the form
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <GridIcon className="h-4 w-4 text-blue-400" />
                    Grid
                  </span>
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5">
                    <CalendarIcon className="h-4 w-4 text-orange-400" />
                    Calendar
                  </span>
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5">
                    <GalleryIcon className="h-4 w-4 text-purple-400" />
                    Gallery
                  </span>
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5">
                    <KanbanIcon className="h-4 w-4 text-green-400" />
                    Kanban
                  </span>
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5">
                    <TimelineIcon className="h-4 w-4 text-red-400" />
                    Timeline
                  </span>
                  <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                    <TeamIcon className="h-2.5 w-2.5" />
                    Team
                  </span>
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5">
                    <ListIcon className="h-4 w-4 text-violet-400" />
                    List
                  </span>
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5">
                    <GanttIcon className="h-4 w-4 text-green-700" />
                    Gantt
                  </span>
                  <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                    <TeamIcon className="h-2.5 w-2.5" />
                    Team
                  </span>
                </button>
                <div className="mx-2 my-1 border-t border-gray-200" />
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5">
                    <FormIcon className="h-4 w-4 text-pink-400" />
                    Form
                  </span>
                </button>
                <div className="mx-2 my-1 border-t border-gray-200" />
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5">
                    <SectionIcon className="h-4 w-4 text-gray-400" />
                    Section
                  </span>
                  <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                    <TeamIcon className="h-2.5 w-2.5" />
                    Team
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Create view form popup */}
          {showCreateForm && createMenuPosition && (
            <>
              <div
                className="fixed inset-0 z-45"
                onClick={() => {
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
                  <label className="block font-medium text-gray-700">
                    Who can edit
                  </label>
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
                // onDuplicateView={onDuplicateView}
                editInputRef={editInputRef}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}
