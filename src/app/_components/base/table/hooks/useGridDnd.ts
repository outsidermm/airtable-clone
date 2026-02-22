import { PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect } from "react";
import type { GridColumn, GridRow } from "~/types/grid";

interface UseGridDndProps {
  columns: GridColumn[];
  nonNullRows: GridRow[];
  selectedRowIds: Set<string>;
  frozenWidth: number;
  parentRef: React.RefObject<HTMLDivElement | null>;
  isSelecting: boolean;
  onReorderColumns?: (newColumnOrderIds: number[]) => void;
  onReorderRow?: (movedRowIds: number[], targetRowId: number) => void;
}

export function useGridDnd({
  columns,
  nonNullRows,
  selectedRowIds,
  frozenWidth,
  parentRef,
  isSelecting,
  onReorderColumns,
  onReorderRow,
}: UseGridDndProps) {
  useEffect(() => {
    if (!isSelecting || !parentRef.current) return;
    let animationId: number;
    let lastMouseX = 0;
    const handleMouseMove = (e: MouseEvent) => {
      lastMouseX = e.clientX;
    };
    const autoScroll = () => {
      if (!parentRef.current) return;
      const container = parentRef.current;
      const { left, right } = container.getBoundingClientRect();
      const frozenEdge = left + frozenWidth;
      const EDGE_THRESHOLD = 100;

      let scrollDelta = 0;
      if (lastMouseX < frozenEdge + EDGE_THRESHOLD && lastMouseX > frozenEdge) {
        scrollDelta =
          -Math.min(
            (frozenEdge + EDGE_THRESHOLD - lastMouseX) / EDGE_THRESHOLD,
            1,
          ) * 20;
      } else if (lastMouseX > right - EDGE_THRESHOLD && lastMouseX < right) {
        scrollDelta =
          Math.min(
            (EDGE_THRESHOLD - (right - lastMouseX)) / EDGE_THRESHOLD,
            1,
          ) * 20;
      }

      if (scrollDelta !== 0) container.scrollLeft += scrollDelta;
      animationId = requestAnimationFrame(autoScroll);
    };
    window.addEventListener("mousemove", handleMouseMove);
    animationId = requestAnimationFrame(autoScroll);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [isSelecting, frozenWidth, parentRef]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeStr = String(active.id);
      const overStr = String(over.id);

      if (activeStr.startsWith("col-") && overStr.startsWith("col-")) {
        if (onReorderColumns) {
          const activeId = Number(activeStr.replace("col-", ""));
          const overId = Number(overStr.replace("col-", ""));
          const oldIdx = columns.findIndex((c) => c.id === activeId);
          const newIdx = columns.findIndex((c) => c.id === overId);
          if (oldIdx !== -1 && newIdx !== -1) {
            const newOrderIds = arrayMove(
              columns.map((c) => c.id),
              oldIdx,
              newIdx,
            );
            onReorderColumns(newOrderIds);
          }
        }
      } else if (
        activeStr.startsWith("row-") &&
        overStr.startsWith("row-") &&
        onReorderRow
      ) {
        const draggedId = Number(activeStr.replace("row-", ""));
        const targetId = Number(overStr.replace("row-", ""));
        const draggedIndex = nonNullRows.findIndex((r) => r.id === draggedId);

        if (
          draggedIndex !== -1 &&
          selectedRowIds.has(String(draggedIndex)) &&
          selectedRowIds.size > 1
        ) {
          const selected = nonNullRows
            .filter((_, i) => selectedRowIds.has(String(i)))
            .map((r) => r.id);
          onReorderRow(selected, targetId);
        } else {
          onReorderRow([draggedId], targetId);
        }
      }
    },
    [columns, nonNullRows, onReorderColumns, onReorderRow, selectedRowIds],
  );
  return {
    sensors,
    handleDragEnd,
  };
}
