"use client";

import { useState, useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import { GridView } from "./grid-view";
import { BaseSidebar } from "./base-sidebar";
import { BaseHeader } from "./base-header";

interface Table {
  id: number;
  name: string;
  baseId: string;
}

interface BaseContentProps {
  baseId: string;
  tables: Table[];
  initialTableId: number;
  base: { id: string; name: string; icon: string };
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function BaseContent({
  baseId,
  tables: initialTables,
  initialTableId,
  base,
  user,
}: BaseContentProps) {
  const [activeTableId, setActiveTableId] = useState(initialTableId);

  const utils = api.useUtils();

  // Fetch tables list (falls back to initial data from server)
  const tablesQuery = api.table.getAllByBase.useQuery(
    { baseId },
    { initialData: initialTables as never },
  );

  const tables = useMemo(() => {
    if (tablesQuery.data) {
      return (tablesQuery.data as Table[]).map((t) => ({
        id: t.id,
        name: t.name,
        baseId: t.baseId,
      }));
    }
    return initialTables;
  }, [tablesQuery.data, initialTables]);

  // Fetch active table details (columns, views)
  const tableQuery = api.table.getById.useQuery(
    { id: activeTableId },
    { enabled: !!activeTableId },
  );

  // Fetch rows with cursor-based pagination
  const rowsQuery = api.row.getRows.useInfiniteQuery(
    { tableId: activeTableId, limit: 50 },
    {
      enabled: !!activeTableId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Mutations
  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      void utils.row.getRows.invalidate({ tableId: activeTableId });
    },
  });

  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      void utils.table.getById.invalidate({ id: activeTableId });
      void utils.row.getRows.invalidate({ tableId: activeTableId });
    },
  });

  const updateCell = api.cell.update.useMutation();

  const createTable = api.table.create.useMutation({
    onSuccess: (newTable) => {
      void utils.table.getAllByBase.invalidate({ baseId });
      setActiveTableId(newTable.id);
    },
  });

  // Flatten paginated rows
  const rows = useMemo(() => {
    if (!rowsQuery.data) return [];
    return rowsQuery.data.pages.flatMap((page) => page.rows);
  }, [rowsQuery.data]);

  // Map columns from table query
  const columns = useMemo(() => {
    if (!tableQuery.data) return [];
    return tableQuery.data.columns.map((col) => ({
      id: col.id,
      name: col.name,
      type: col.type,
      width: col.primary ? 250 : 200,
    }));
  }, [tableQuery.data]);

  // Map rows to GridView format
  const gridRows = useMemo(() => {
    return rows.map((row) => ({
      id: row.id,
      cells: Object.fromEntries(
        row.cells.map((cell) => [
          cell.columnId,
          cell.column.type === "NUMBER"
            ? (cell.numberValue?.toString() ?? "")
            : (cell.textValue ?? ""),
        ]),
      ),
    }));
  }, [rows]);

  const handleCellUpdate = useCallback(
    (rowId: number, columnId: number, value: string) => {
      const col = tableQuery.data?.columns.find((c) => c.id === columnId);
      if (!col) return;

      if (col.type === "NUMBER") {
        const num = parseFloat(value);
        updateCell.mutate({
          rowId,
          columnId,
          numberValue: isNaN(num) ? null : num,
          textValue: null,
        });
      } else {
        updateCell.mutate({
          rowId,
          columnId,
          textValue: value,
          numberValue: null,
        });
      }
    },
    [tableQuery.data?.columns, updateCell],
  );

  const handleAddRow = useCallback(() => {
    createRow.mutate({ tableId: activeTableId });
  }, [activeTableId, createRow]);

  const handleAddColumn = useCallback(() => {
    createColumn.mutate({ tableId: activeTableId });
  }, [activeTableId, createColumn]);

  const handleTableChange = useCallback((tableId: number) => {
    setActiveTableId(tableId);
  }, []);

  const handleAddTable = useCallback(() => {
    createTable.mutate({ baseId });
  }, [baseId, createTable]);

  return (
    <>
      <BaseSidebar
        baseId={baseId}
        tables={tables}
        activeTableId={activeTableId}
        onTableChange={handleTableChange}
        onAddTable={handleAddTable}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <BaseHeader base={base} user={user} />

        {/* Grid View */}
        {tableQuery.isLoading || rowsQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <GridView
              columns={columns}
              rows={gridRows}
              onCellUpdate={handleCellUpdate}
              onAddRow={handleAddRow}
              onAddColumn={handleAddColumn}
            />
          </div>
        )}
      </div>
    </>
  );
}
