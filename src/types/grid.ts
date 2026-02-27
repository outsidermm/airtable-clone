import type { ColumnType } from "generated/prisma/enums";

export interface GridColumn {
  id: number;
  name: string;
  type: ColumnType;
  width: number;
  primary: boolean;
  order: string;
}

export interface GridRow {
  id: number;
  cells: Record<string, string | number | boolean | null>;
}

export interface SearchResult {
  rowId: number;
  columnId: number;
  value: string;
}

export interface ContextMenuState {
  type: "column" | "record";
  position: { x: number; y: number };
  anchorEl?: HTMLElement | null;
  data: {
    rowId?: number;
    columnId?: number;
    rowIndex?: number;
    selectedRowIds?: number[]
  };
}
