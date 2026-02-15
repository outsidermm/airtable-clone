/**
 * Grid table types
 * Type definitions for cell addresses and grid table handles
 */

export interface CellAddress {
  rowId: number;
  columnId: number;
}

export interface GridTableHandle {
  scrollToRow: (rowId: number) => void;
}
