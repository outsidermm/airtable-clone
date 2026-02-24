"use client";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableHeaderCell } from "./sortable-header-cell";
import { HEADER_HEIGHT, CHECKBOX_WIDTH } from "../../constants";
import type { GridColumn, GridRow } from "~/types/grid";
import type { Header } from "@tanstack/react-table";
import {
  ChevronDownIcon,
  NumberIcon,
  PlusIcon,
  TextIcon,
} from "~/app/_components/ui/icons";
import { useBase } from "../../base-context";

interface GridHeaderProps {
  frozenWidth: number;
  totalScrollableWidth: number;
  primaryColumn: GridColumn | null;
  nonPrimaryColumns: GridColumn[];
  primaryColumnWidth: number;
  handlePrimaryResizeStart: (e: React.MouseEvent) => void;
  isAllSelected: boolean;
  onToggleAllSelected: (e: unknown) => void;
  columnOrder: string[];
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragEnd: (e: DragEndEvent) => void;
  headerGroups: Header<GridRow, unknown>[];
  frozenNonPrimaryCount: number;
  filteredColumnIds: Set<number>;
  sortedColumnIds: Set<number>;
}

export function GridHeader({
  frozenWidth,
  totalScrollableWidth,
  primaryColumn,
  nonPrimaryColumns,
  primaryColumnWidth,
  handlePrimaryResizeStart,
  isAllSelected,
  onToggleAllSelected,
  columnOrder,
  sensors,
  handleDragEnd,
  headerGroups,
  frozenNonPrimaryCount,
  filteredColumnIds,
  sortedColumnIds,
}: GridHeaderProps) {
  const { openModal, setContextMenu, setEditingColumnId } = useBase();

  const handleHeaderDoubleClick = (col: GridColumn, e: React.MouseEvent) => {
    setEditingColumnId(col.id);
    openModal("edit-column", e.currentTarget as HTMLElement);
  };

  return (
    <div
      role="row"
      className="sticky top-0 z-40 flex shrink-0"
      style={{ minWidth: "fit-content" }}
    >
      <div
        className="sticky left-0 z-50 flex shrink-0 border-b border-gray-200 bg-white"
        style={{
          width: frozenWidth,
          height: HEADER_HEIGHT,
          borderRight: "2px solid rgb(209, 213, 219)",
        }}
      >
        {/* Checkbox / row-selection column */}
        <div
          role="columnheader"
          aria-label="Row selection"
          className="flex items-center"
          style={{ width: CHECKBOX_WIDTH }}
        >
          <div className="w-5 shrink-0 pl-1.5" />
          <div className="flex flex-1 justify-center">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
              checked={isAllSelected}
              // Explicit label required: this input has no visible text sibling
              aria-label="Select all rows"
              onChange={onToggleAllSelected}
            />
          </div>
        </div>

        {primaryColumn && (
          <div
            role="columnheader"
            aria-label={primaryColumn.name}
            className={`relative flex items-center border-b border-gray-200 ${
              filteredColumnIds.has(primaryColumn.id)
                ? "bg-green-100"
                : sortedColumnIds.has(primaryColumn.id)
                  ? "bg-orange-100"
                  : "bg-white"
            }`}
            style={{ width: primaryColumnWidth, height: HEADER_HEIGHT }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                type: "column",
                position: { x: e.clientX, y: e.clientY },
                anchorEl: e.currentTarget as HTMLElement,
                data: { columnId: primaryColumn.id },
              });
            }}
          >
            <div
              className="group flex h-full w-full items-center justify-between px-2 py-1.5"
              onDoubleClick={(e) => handleHeaderDoubleClick(primaryColumn, e)}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <TextIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                <span className="truncate text-xs font-medium text-gray-900">
                  {primaryColumn.name}
                </span>
              </div>
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={`Resize ${primaryColumn.name} column`}
              onMouseDown={handlePrimaryResizeStart}
              className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500"
            />
          </div>
        )}

        {headerGroups.slice(0, frozenNonPrimaryCount).map((header) => {
          const col = nonPrimaryColumns.find((c) => String(c.id) === header.id);
          if (!col) return null;
          const ColumnTypeIcon = col.type === "NUMBER" ? NumberIcon : TextIcon;
          return (
            <div
              key={header.id}
              role="columnheader"
              aria-label={col.name}
              className={`relative border border-gray-200 ${
                filteredColumnIds.has(col.id)
                  ? "bg-green-100"
                  : sortedColumnIds.has(col.id)
                    ? "bg-orange-100"
                    : "bg-white"
              }`}
              style={{ width: header.getSize(), height: HEADER_HEIGHT }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  type: "column",
                  position: { x: e.clientX, y: e.clientY },
                  anchorEl: e.currentTarget as HTMLElement,
                  data: { columnId: col.id },
                });
              }}
            >
              <div
                className="h-full"
                onDoubleClick={(e) => handleHeaderDoubleClick(col, e)}
              >
                <div className="group flex h-full items-center justify-between bg-transparent px-2 py-1.5">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <ColumnTypeIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="truncate text-xs font-medium text-gray-900">
                      {col.name}
                    </span>
                  </div>
                  <button
                    className="invisible rounded p-0.5 group-hover:visible hover:text-gray-700"
                    aria-label={`Column options for ${col.name}`}
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        type: "column",
                        position: { x: e.clientX, y: e.clientY },
                        anchorEl: e.currentTarget as HTMLElement,
                        data: { columnId: col.id },
                      });
                    }}
                  >
                    <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label={`Resize ${col.name} column`}
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500"
              />
            </div>
          );
        })}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        autoScroll={false}
      >
        <SortableContext
          items={columnOrder}
          strategy={horizontalListSortingStrategy}
        >
          <div
            className="flex border-b border-gray-200"
            style={{ width: totalScrollableWidth }}
          >
            {headerGroups.slice(frozenNonPrimaryCount).map((header) => {
              const col = nonPrimaryColumns.find(
                (c) => String(c.id) === header.id,
              );
              if (!col) return null;

              return (
                <div
                  key={header.id}
                  role="columnheader"
                  aria-label={col.name}
                  className={`relative border-r border-gray-200 ${
                    filteredColumnIds.has(col.id)
                      ? "bg-green-100"
                      : sortedColumnIds.has(col.id)
                        ? "bg-orange-100"
                        : "bg-white"
                  }`}
                  style={{ width: header.getSize(), height: HEADER_HEIGHT }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      type: "column",
                      position: { x: e.clientX, y: e.clientY },
                      anchorEl: e.currentTarget as HTMLElement,
                      data: { columnId: col.id },
                    });
                  }}
                >
                  <div
                    className="h-full"
                    onDoubleClick={(e) => handleHeaderDoubleClick(col, e)}
                  >
                    <SortableHeaderCell column={col} isPrimary={false}>
                      <button
                        className="invisible rounded p-0.5 group-hover:visible hover:text-gray-700"
                        aria-label={`Column options for ${col.name}`}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            type: "column",
                            position: { x: e.clientX, y: e.clientY },
                            anchorEl: e.currentTarget as HTMLElement,
                            data: { columnId: col.id },
                          });
                        }}
                      >
                        <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </SortableHeaderCell>
                  </div>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${col.name} column`}
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500"
                  />
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <button
        key="_add"
        aria-label="Add column"
        onClick={(e) => {
          openModal("add-column", e.currentTarget);
        }}
        className="group flex cursor-pointer items-center justify-center border-r border-b border-gray-200 bg-white transition-colors hover:bg-gray-100"
        style={{ width: 80, height: HEADER_HEIGHT }}
      >
        <PlusIcon className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" aria-hidden="true" />
      </button>
    </div>
  );
}
