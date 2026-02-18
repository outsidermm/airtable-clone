/*
  Warnings:

  - The primary key for the `AirtableTable` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `AirtableTable` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `order` on the `Row` table. All the data in the column will be lost.
  - The primary key for the `View` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `View` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Cell` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `tableId` on the `Column` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tableId` on the `Row` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tableId` on the `View` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Cell" DROP CONSTRAINT "Cell_columnId_fkey";

-- DropForeignKey
ALTER TABLE "Cell" DROP CONSTRAINT "Cell_rowId_fkey";

-- DropForeignKey
ALTER TABLE "Cell" DROP CONSTRAINT "Cell_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Column" DROP CONSTRAINT "Column_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Row" DROP CONSTRAINT "Row_tableId_fkey";

-- DropForeignKey
ALTER TABLE "View" DROP CONSTRAINT "View_tableId_fkey";

-- DropIndex
DROP INDEX "Row_tableId_order_idx";

-- AlterTable
ALTER TABLE "AirtableTable" DROP CONSTRAINT "AirtableTable_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "AirtableTable_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Base" ALTER COLUMN "name" SET DEFAULT 'Untitled Base';

-- AlterTable
ALTER TABLE "Column" ADD COLUMN     "primary" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "tableId",
ADD COLUMN     "tableId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Row" DROP COLUMN "order",
ADD COLUMN     "cells" JSONB NOT NULL DEFAULT '{}',
DROP COLUMN "tableId",
ADD COLUMN     "tableId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "View" DROP CONSTRAINT "View_pkey",
ADD COLUMN     "order" TEXT NOT NULL DEFAULT 'a0',
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tableId",
ADD COLUMN     "tableId" INTEGER NOT NULL,
ALTER COLUMN "config" DROP NOT NULL,
ADD CONSTRAINT "View_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "Cell";

-- CreateIndex
CREATE INDEX "Row_tableId_id_idx" ON "Row"("tableId", "id");

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "AirtableTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Row" ADD CONSTRAINT "Row_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "AirtableTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "View" ADD CONSTRAINT "View_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "AirtableTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
