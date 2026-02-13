import { LexoRank } from "lexorank";
import { faker } from "@faker-js/faker";
import type { PrismaClient } from "../../../../generated/prisma/client";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Create a fully initialized table with default columns, rows (with JSONB cells), and a grid view.
 * Used by both base.create (first table) and table.create (additional tables).
 */
export async function createDefaultTable(
  tx: PrismaTransaction,
  baseId: string,
  tableName: string,
  rowCount = 5,
) {
  // Generate lexorank positions for columns
  const colHeader = LexoRank.middle();
  const col1 = colHeader.genNext();
  const col2 = col1.genNext();
  const col3 = col2.genNext();

  // Create table with columns and a default view (rows added separately with cells JSON)
  const table = await tx.airtableTable.create({
    data: {
      name: tableName,
      baseId,
      views: {
        create: {
          name: "Grid view",
          config: {},
        },
      },
      columns: {
        create: [
          { name: "Name", type: "TEXT", order: col1.toString(), primary: true },
          {
            name: "Number",
            type: "NUMBER",
            order: col2.toString(),
            primary: false,
          },
          {
            name: "Notes",
            type: "TEXT",
            order: col3.toString(),
            primary: false,
          },
        ],
      },
    },
    include: {
      columns: { orderBy: { order: "asc" } },
    },
  });

  // Build rows with inline JSONB cells containing faker data
  const rowsData = Array.from({ length: rowCount }, () => {
    const cells: Record<string, string | number> = {};
    for (const column of table.columns) {
      if (column.type === "TEXT") {
        cells[String(column.id)] =
          column.name === "Name"
            ? faker.person.fullName()
            : faker.lorem.sentence();
      } else if (column.type === "NUMBER") {
        cells[String(column.id)] = faker.number.int({ min: 1, max: 1000 });
      }
    }
    return { tableId: table.id, cells };
  });

  await tx.row.createMany({ data: rowsData });

  // Re-fetch with rows included
  return tx.airtableTable.findUniqueOrThrow({
    where: { id: table.id },
    include: {
      columns: { orderBy: { order: "asc" } },
      rows: { orderBy: { id: "asc" } },
    },
  });
}
