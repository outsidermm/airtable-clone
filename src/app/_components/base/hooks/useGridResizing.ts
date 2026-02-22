import { useCallback, useRef } from "react";
import type { GridColumn } from "~/types/grid";

interface UseGridResizingProps {
  nonPrimaryColumns: GridColumn[];
  columnSizing: Record<string, number>;
  setFrozenExtraCount: (count: number) => void;
  primaryColumnWidth: number;
  setPrimaryColumnWidth: (width: number) => void;
  clampedFrozenExtraCount: number;
  parentRef: React.RefObject<HTMLDivElement | null>;
  freezeOverlayRef: React.RefObject<HTMLDivElement | null>;
  isDraggingFreezeRef: React.RefObject<boolean>;
  setFreezeLineHoverY: (y: number | null) => void;
}

export function useGridResizing({
  nonPrimaryColumns,
  columnSizing,
  setFrozenExtraCount,
  primaryColumnWidth,
  setPrimaryColumnWidth,
  clampedFrozenExtraCount,
  parentRef,
  freezeOverlayRef,
  isDraggingFreezeRef,
  setFreezeLineHoverY,
}: UseGridResizingProps) {
  const primaryResizeStartWidth = useRef<number>(0);
  const primaryResizeStartX = useRef<number>(0);
  const handlePrimaryResizeStart = useCallback(
    (e: React.MouseEvent) => {
      primaryResizeStartWidth.current = primaryColumnWidth;
      primaryResizeStartX.current = e.clientX;
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - primaryResizeStartX.current;
        setPrimaryColumnWidth(
          Math.max(80, primaryResizeStartWidth.current + delta),
        );
      };
      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [primaryColumnWidth, setPrimaryColumnWidth],
  );

  const handleFrozenBorderDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      isDraggingFreezeRef.current = true;
      setFreezeLineHoverY(null);

      const overlay = freezeOverlayRef.current;
      if (overlay && parentRef.current) {
        const containerRect = parentRef.current.getBoundingClientRect();
        overlay.style.display = "block";
        overlay.style.top = `${containerRect.top}px`;
        overlay.style.height = `${containerRect.height}px`;
        overlay.style.left = `${e.clientX}px`;
      }

      const startX = e.clientX;
      const colWidths = nonPrimaryColumns.map(
        (col) => columnSizing[String(col.id)] ?? col.width,
      );
      const initialExtraFrozenWidth = colWidths
        .slice(0, clampedFrozenExtraCount)
        .reduce((s, w) => s + w, 0);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const targetPos = Math.max(0, initialExtraFrozenWidth + delta);

        let newCount = 0;
        let accum = 0;
        for (let i = 0; i < nonPrimaryColumns.length - 1; i++) {
          const w = colWidths[i] ?? 0;
          if (targetPos >= accum + w / 2) newCount = i + 1;
          accum += w;
        }
        setFrozenExtraCount(newCount);

        if (freezeOverlayRef.current) {
          freezeOverlayRef.current.style.left = `${moveEvent.clientX}px`;
        }
      };

      const handleMouseUp = () => {
        isDraggingFreezeRef.current = false;
        if (freezeOverlayRef.current) {
          freezeOverlayRef.current.style.display = "none";
        }
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [
      nonPrimaryColumns,
      clampedFrozenExtraCount,
      columnSizing,
      freezeOverlayRef,
      isDraggingFreezeRef,
      setFreezeLineHoverY,
      parentRef,
      setFrozenExtraCount,
    ],
  );
  return {
    handlePrimaryResizeStart,
    handleFrozenBorderDragStart,
  };
}
