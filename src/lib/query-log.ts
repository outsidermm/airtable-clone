export interface QueryEntry {
  id: number;
  path: string;
  label: string;
  sqlMs?: number;
  totalMs: number;
  rowCount?: number;
  timestamp: number;
}

const MAX_ENTRIES = 50;
let entries: QueryEntry[] = [];
let nextId = 0;

export function pushQueryEntry(entry: Omit<QueryEntry, "id" | "timestamp">) {
  entries = [
    { ...entry, id: nextId++, timestamp: Date.now() },
    ...entries,
  ].slice(0, MAX_ENTRIES);
}

export function getQueryLog(): QueryEntry[] {
  return entries;
}

export function clearQueryLog() {
  entries = [];
}
