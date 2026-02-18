"use client";

import { useState } from "react";
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
import type { SortConfig } from "~/server/api/routers/view";
import type { Header } from "@tanstack/react-table"; // Adjust based on your table setup
import { ChevronDownIcon, PlusIcon, TextIcon } from "~/components/icons";
import { useBase } from "../../base-context";
import { useColumnMutations } from "~/app/_components/hooks/use-column-mutations";

interface GridHeaderProps {
  frozenWidth: number;
  totalScrollableWidth: number;
  primaryColumn: GridColumn | null;
  nonPrimaryColumns: GridColumn[];
  primaryColumnWidth: number;
  handlePrimaryResizeStart: (e: React.MouseEvent) => void;
  // Table / Data Props
  isAllSelected: boolean;
  onToggleAllSelected: (e: unknown) => void;
  sorts: SortConfig[];
  columnOrder: string[];
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragEnd: (e: DragEndEvent) => void;
  headerGroups: Header<GridRow, unknown>[]; // from TanStack
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
  sorts,
  columnOrder,
  sensors,
  handleDragEnd,
  headerGroups,
}: GridHeaderProps) {
  const {openModal, activeTableId, setContextMenu} = useBase();
  const columnMutations = useColumnMutations(activeTableId);
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState("");

  const handleHeaderDoubleClick = (col: GridColumn) => {
    setEditingHeader(col.id);
    setEditingHeaderValue(col.name);
  };

  const handleHeaderRename = (colId: number, currentName: string) => {
    if (
      editingHeaderValue.trim() &&
      editingHeaderValue.trim() !== currentName
    ) {
      columnMutations.handleUpdateColumn(colId, editingHeaderValue.trim());
    }
    setEditingHeader(null);
  };

  return (
    <div
      className="sticky top-0 z-40 flex shrink-0"
      style={{ minWidth: "fit-content" }}
    >
      {/* Frozen: checkbox + primary header */}
      <div
        className="sticky left-0 z-50 flex shrink-0 border-b border-gray-200 bg-white"
        style={{
          width: frozenWidth,
          height: HEADER_HEIGHT,
          borderRight: "2px solid rgb(209, 213, 219)",
        }}
      >
        {/* Checkbox */}
        <div className="flex items-center" style={{ width: CHECKBOX_WIDTH }}>
          <div className="w-5 shrink-0 pl-1.5" />
          <div className="flex flex-1 justify-center">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
              checked={isAllSelected}
              onChange={onToggleAllSelected}
            />
          </div>
        </div>

        {/* Primary Column */}
        {primaryColumn && (
          <div
            className="relative flex items-center border-b border-gray-200 bg-white"
            style={{ width: primaryColumnWidth, height: HEADER_HEIGHT }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                type: "column",
                position: { x: e.clientX, y: e.clientY },
                data: { columnId: primaryColumn.id },
              });
            }}
          >
            {editingHeader === primaryColumn.id ? (
              <div className="flex h-full w-full items-center px-2">
                <input
                  type="text"
                  value={editingHeaderValue}
                  onChange={(e) => setEditingHeaderValue(e.target.value)}
                  onBlur={() =>
                    handleHeaderRename(primaryColumn.id, primaryColumn.name)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      handleHeaderRename(primaryColumn.id, primaryColumn.name);
                    if (e.key === "Escape") setEditingHeader(null);
                  }}
                  className="w-full bg-transparent text-xs text-gray-700 outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <div
                className="group flex h-full w-full items-center justify-between px-2 py-1.5"
                onDoubleClick={() => handleHeaderDoubleClick(primaryColumn)}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <TextIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="truncate text-xs font-normal text-gray-700">
                    {primaryColumn.name}
                  </span>
                </div>
              </div>
            )}
            <div
              onMouseDown={handlePrimaryResizeStart}
              className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500"
            />
          </div>
        )}
      </div>

      {/* Scrollable headers */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columnOrder}
          strategy={horizontalListSortingStrategy}
        >
          <div
            className="flex border-b border-gray-200"
            style={{ width: totalScrollableWidth }}
          >
            {headerGroups.map((header) => {
              const col = nonPrimaryColumns.find(
                (c) => String(c.id) === header.id,
              );
              if (!col) return null;

              return (
                <div
                  key={header.id}
                  className="relative border-r border-gray-200 bg-white"
                  style={{ width: header.getSize(), height: HEADER_HEIGHT }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      type: "column",
                      position: { x: e.clientX, y: e.clientY },
                      data: { columnId: col.id },
                    });
                  }}
                >
                  {editingHeader === col.id ? (
                    <div className="flex h-full items-center bg-white px-2">
                      <input
                        type="text"
                        value={editingHeaderValue}
                        onChange={(e) => setEditingHeaderValue(e.target.value)}
                        onBlur={() => handleHeaderRename(col.id, col.name)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleHeaderRename(col.id, col.name);
                          if (e.key === "Escape") setEditingHeader(null);
                        }}
                        className="w-full bg-transparent text-xs text-gray-900 outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      className="h-full"
                      onDoubleClick={() => handleHeaderDoubleClick(col)}
                    >
                      <SortableHeaderCell
                        column={col}
                        sorts={sorts}
                        isPrimary={false}
                      >
                        <button
                          className="invisible rounded p-0.5 group-hover:visible hover:text-gray-700"
                          onClick={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              type: "column",
                              position: { x: e.clientX, y: e.clientY },
                              data: { columnId: col.id },
                            });
                          }}
                        >
                          <ChevronDownIcon className="h-3 w-3" />
                        </button>
                      </SortableHeaderCell>
                    </div>
                  )}
                  {/* TanStack Resize Handler */}
                  <div
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

      <div
        key="_add"
        className="flex items-center justify-center border border-gray-200 bg-white px-12"
        style={{ width: 48, height: HEADER_HEIGHT }}
      >
        <button
          onClick={(e) => {openModal("add-column",e.currentTarget)}}
          className="text-gray-400 hover:text-gray-600"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
