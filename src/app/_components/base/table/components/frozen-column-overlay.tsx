import { useBase } from "../../base-context";
import { HEADER_HEIGHT } from "../../constants";

interface FrozenColumnOverlayProps {
  frozenWidth: number;
  handleFrozenBorderDragStart: (e: React.MouseEvent) => void;
  isDraggingFreezeRef: React.RefObject<boolean>;
  setFreezeLineHoverY: (y: number | null) => void;
  freezeLineHoverY: number | null;
}

export function FrozenColumnOverlay({
  frozenWidth,
  handleFrozenBorderDragStart,
  isDraggingFreezeRef,
  setFreezeLineHoverY,
  freezeLineHoverY,
}: FrozenColumnOverlayProps) {
  const { contextMenu, activeModal} = useBase();
  return (
    // This overlay sits on top of the frozen/scrollable border and intercepts
    // mousedown to start a drag that updates frozenExtraCount in grid-table.tsx.
    // It is intentionally outside the scroll container so it stays fixed at the
    // frozen column boundary regardless of horizontal scroll position.
    <div
      aria-label="Drag to adjust frozen columns"
      className="group absolute bottom-4 z-40 flex w-4 cursor-col-resize justify-center"
      style={{ left: frozenWidth - 8, top: HEADER_HEIGHT }}
      onMouseDown={handleFrozenBorderDragStart}
      onMouseMove={(e) => {
        if (isDraggingFreezeRef.current || activeModal || contextMenu) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setFreezeLineHoverY(e.clientY - rect.top);
      }}
      onMouseLeave={() => setFreezeLineHoverY(null)}
    >
      <div aria-hidden="true" className="h-full w-0.5 bg-transparent transition-colors group-hover:bg-gray-400" />

      {freezeLineHoverY !== null && !isDraggingFreezeRef.current && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 h-8 w-2 -translate-x-1/2 rounded-full bg-blue-500 shadow-sm"
            style={{ top: freezeLineHoverY - 6 }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-4 rounded border border-gray-600 bg-white px-2 py-1 text-xs whitespace-nowrap text-gray-600 shadow transition-opacity"
            style={{ top: freezeLineHoverY - 12 }}
          >
            Drag to adjust the number of frozen columns
          </div>
        </>
      )}
    </div>
  );
}
