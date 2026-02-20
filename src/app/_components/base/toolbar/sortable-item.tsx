"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "../grid-table/drag-handle";
import type { CSSProperties, ReactNode } from "react";

interface SortableItemProps {
  id: string;
  children: ReactNode;
  hideDragHandle?: boolean;
  dragHandleClassName?: string;
}

export function SortableItem({ 
  id, 
  children, 
  hideDragHandle = false, 
  dragHandleClassName = "" 
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center w-full">
      <div className="flex-1 min-w-0">{children}</div>
      
      {!hideDragHandle && (
        <div
          {...attributes}
          {...listeners}
          className={`shrink-0 cursor-grab touch-none active:cursor-grabbing ${dragHandleClassName}`}
        >
          {/* If you want the icon itself to inherit classes, you can pass className down, 
              but usually styling the wrapper div is safer for hit-areas. */}
          <DragHandle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
        </div>
      )}
    </div>
  );
}