export interface GridTableHandle {
  scrollToRow: (rowId: number) => void;
}

export interface Table {
  id: number;
  name: string;
  baseId: string;
}