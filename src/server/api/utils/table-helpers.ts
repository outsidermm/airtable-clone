import { LexoRank } from "lexorank";
import { faker } from "@faker-js/faker";
import type { PrismaClient } from "../../../../generated/prisma/client";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Create a fully initialized table with default columns, rows, cells, and a grid view.
 * Used by both base.create (first table) and table.create (additional tables).
 */
export async function createDefaultTable(
  tx: PrismaTransaction,
  baseId: string,
  tableName: string,
  rowCount = 5,
) {
  // Generate lexorank positions for columns and rows
  const colHeader = LexoRank.middle();
  const col1 = colHeader.genNext();
  const col2 = col1.genNext();
  const col3 = col2.genNext();

  const rowHeader = LexoRank.middle();
  let currentRowRank = rowHeader.genNext();
  const rowRanks: string[] = [];

  for (let i = 0; i < rowCount; i++) {
    rowRanks.push(currentRowRank.toString());
    currentRowRank = currentRowRank.genNext();
  }

  // Create table with columns, rows, and a default view
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
      rows: {
        create: rowRanks.map((rank) => ({
          order: rank,
        })),
      },
    },
    include: {
      columns: { orderBy: { order: "asc" } },
      rows: { orderBy: { order: "asc" } },
    },
  });

  // Create cells with faker data
  const cellsData = [];
  for (const row of table.rows) {
    for (const column of table.columns) {
      const cellValue: { textValue?: string; numberValue?: number } = {};

      if (column.type === "TEXT") {
        if (column.name === "Name") {
          cellValue.textValue = faker.person.fullName();
        } else {
          cellValue.textValue = faker.lorem.sentence();
        }
      } else if (column.type === "NUMBER") {
        cellValue.numberValue = faker.number.int({ min: 1, max: 1000 });
      }

      cellsData.push({
        tableId: table.id,
        rowId: row.id,
        columnId: column.id,
        ...cellValue,
      });
    }
  }

  await tx.cell.createMany({ data: cellsData });

  return table;
}
