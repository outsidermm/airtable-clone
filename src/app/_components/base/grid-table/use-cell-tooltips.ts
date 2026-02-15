/**
 * Cell tooltip management hook
 * Provides functions to set, clear, and get tooltips for grid cells
 */

import { useState, useCallback } from "react";

export function useCellTooltips() {
  const [cellTooltips, setCellTooltips] = useState<Map<string, string>>(
    new Map(),
  );

  /**
   * Set a tooltip for a specific cell
   * @param rowId - Row ID
   * @param columnId - Column ID
   * @param message - Tooltip message to display
   * @param duration - Auto-dismiss duration in ms (0 = persistent)
   */
  const setCellTooltip = useCallback(
    (rowId: number, columnId: number, message: string, duration = 3000) => {
      const key = `${rowId}-${columnId}`;
      setCellTooltips((prev) => new Map(prev).set(key, message));

      // Auto-clear after duration
      if (duration > 0) {
        setTimeout(() => {
          setCellTooltips((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }, duration);
      }
    },
    [],
  );

  /**
   * Clear tooltip for a specific cell
   */
  const clearCellTooltip = useCallback(
    (rowId: number, columnId: number) => {
      const key = `${rowId}-${columnId}`;
      setCellTooltips((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    },
    [],
  );

  /**
   * Get tooltip message for a specific cell
   */
  const getCellTooltip = useCallback(
    (rowId: number, columnId: number): string | undefined => {
      const key = `${rowId}-${columnId}`;
      return cellTooltips.get(key);
    },
    [cellTooltips],
  );

  /**
   * Clear all tooltips
   */
  const clearAllTooltips = useCallback(() => {
    setCellTooltips(new Map());
  }, []);

  return {
    setCellTooltip,
    clearCellTooltip,
    getCellTooltip,
    clearAllTooltips,
  };
}
