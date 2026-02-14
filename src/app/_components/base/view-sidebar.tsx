"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
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

// --- Drag handle SVG ---
function DragHandle({ className, ...props }: { className?: string } & React.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg className={className ?? "h-3 w-3 cursor-grab text-gray-300"} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

interface View {
  id: number;
  name: string;
}

interface ViewSidebarProps {
  isOpen: boolean;
  views: View[];
  activeViewId: number | null;
  onSelectView: (viewId: number) => void;
  onAddView: () => void;
  onRenameView: (viewId: number, newName: string) => void;
  onDeleteView: (viewId: number) => void;
  onReorderViews: (viewIds: number[]) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// --- Sortable View Item ---
interface SortableViewItemProps {
  view: View;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  viewMenuId: number | null;
  viewsLength: number;
  onSelectView: (viewId: number) => void;
  onDoubleClick: (view: View) => void;
  onSetEditingName: (name: string) => void;
  onRenameSubmit: (viewId: number) => void;
  onSetEditingViewId: (id: number | null) => void;
  onSetViewMenuId: (id: number | null) => void;
  onDeleteView: (viewId: number) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}

function SortableViewItem({
  view,
  isActive,
  isEditing,
  editingName,
  viewMenuId,
  viewsLength,
  onSelectView,
  onDoubleClick,
  onSetEditingName,
  onRenameSubmit,
  onSetEditingViewId,
  onSetViewMenuId,
  onDeleteView,
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

  // Only apply vertical transform, ignore horizontal
  const constrainedTransform = transform
    ? { ...transform, x: 0 }
    : transform;

  const style: CSSProperties = {
    transform: CSS.Translate.toString(constrainedTransform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {isEditing ? (
        <div className="flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1.5">
          <svg
            className="h-4 w-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18M3 6h18M3 18h18"
            />
          </svg>
          <input
            ref={editInputRef}
            type="text"
            value={editingName}
            onChange={(e) => onSetEditingName(e.target.value)}
            onBlur={() => onRenameSubmit(view.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameSubmit(view.id);
              if (e.key === "Escape") onSetEditingViewId(null);
            }}
            className="w-full bg-transparent text-xs font-medium text-blue-700 outline-none"
          />
        </div>
      ) : (
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => onSelectView(view.id)}
            onDoubleClick={() => onDoubleClick(view)}
            className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
              isActive
                ? "bg-blue-50 font-medium text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
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
                d="M3 10h18M3 14h18M3 6h18M3 18h18"
              />
            </svg>
            <span className="truncate">{view.name}</span>
          </button>

          {/* Three-dot menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetViewMenuId(viewMenuId === view.id ? null : view.id);
            }}
            className="hidden rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 group-hover:block"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="hidden cursor-grab rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 group-hover:block active:cursor-grabbing"
          >
            <DragHandle className="h-3.5 w-3.5" />
          </div>

          {/* Three-dot menu dropdown */}
          {viewMenuId === view.id && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => onSetViewMenuId(null)} />
              <div className="absolute top-full left-0 z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => onSetViewMenuId(null)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Add to favourite
                </button>
                <button
                  onClick={() => {
                    onDoubleClick(view);
                    onSetViewMenuId(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Rename view
                </button>
                <button
                  onClick={() => onSetViewMenuId(null)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Duplicate view
                </button>
                {viewsLength > 1 && (
                  <button
                    onClick={() => {
                      onDeleteView(view.id);
                      onSetViewMenuId(null);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete view
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ViewSidebar({
  isOpen,
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onRenameView,
  onDeleteView,
  onReorderViews,
  onMouseEnter,
  onMouseLeave,
}: ViewSidebarProps) {
  const [editingViewId, setEditingViewId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newViewName, setNewViewName] = useState("Grid view");
  const [newViewType, setNewViewType] = useState<string>("grid");
  const [whoCanEdit, setWhoCanEdit] = useState<"collaborative" | "personal" | "locked">("collaborative");
  const [viewMenuId, setViewMenuId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

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

    const oldIndex = views.findIndex((v) => v.id === active.id);
    const newIndex = views.findIndex((v) => v.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newViews = [...views];
      const [movedView] = newViews.splice(oldIndex, 1);
      newViews.splice(newIndex, 0, movedView!);
      onReorderViews(newViews.map((v) => v.id));
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

  const handleRenameSubmit = (viewId: number) => {
    if (editingName.trim() && editingName.trim() !== views.find(v => v.id === viewId)?.name) {
      onRenameView(viewId, editingName.trim());
    }
    setEditingViewId(null);
  };

  const filteredViews = searchQuery
    ? views.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : views;

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200 ease-in-out overflow-hidden ${
        isOpen ? "w-64 opacity-100" : "w-0 border-r-0 opacity-0"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex-1 overflow-y-auto p-2 min-w-64">
        {/* Create new view */}
        <div className="relative mb-2">
          <button
            ref={createButtonRef}
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create new...
          </button>

          {/* View type selection popup */}
          {showCreateMenu && !showCreateForm && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute left-full top-0 z-40 ml-2 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                {[
                  { id: "grid", name: "Grid", icon: "M3 10h18M3 14h18M3 6h18M3 18h18" },
                  { id: "calendar", name: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                  { id: "gallery", name: "Gallery", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
                  { id: "kanban", name: "Kanban", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                  { id: "timeline", name: "Timeline", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
                  { id: "list", name: "List", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
                  { id: "gantt", name: "Gantt", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
                  { id: "form", name: "Form", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                  { id: "section", name: "Section", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
                ].map((viewType) => (
                  <button
                    key={viewType.id}
                    onClick={() => {
                      setNewViewType(viewType.id);
                      setNewViewName(`${viewType.name} view`);
                      setShowCreateMenu(false);
                      setShowCreateForm(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={viewType.icon} />
                    </svg>
                    {viewType.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Create view form popup */}
          {showCreateForm && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowCreateForm(false)} />
              <div className="absolute left-full top-0 z-40 ml-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Who can edit
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: "collaborative" as const, label: "Collaborative", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                      { id: "personal" as const, label: "Personal", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                      { id: "locked" as const, label: "Locked", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setWhoCanEdit(option.id)}
                        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                          whoCanEdit === option.id
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                        </svg>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onAddView();
                      setShowCreateForm(false);
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
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
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
              className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500 hover:border-gray-300"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
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
                isActive={activeViewId === view.id}
                isEditing={editingViewId === view.id}
                editingName={editingName}
                viewMenuId={viewMenuId}
                viewsLength={views.length}
                onSelectView={onSelectView}
                onDoubleClick={handleDoubleClick}
                onSetEditingName={setEditingName}
                onRenameSubmit={handleRenameSubmit}
                onSetEditingViewId={setEditingViewId}
                onSetViewMenuId={setViewMenuId}
                onDeleteView={onDeleteView}
                editInputRef={editInputRef}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}
