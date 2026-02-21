-- DropIndex
DROP INDEX "Row_tableId_id_idx";

-- DropIndex
DROP INDEX "idx_row_cells_gin";

-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Row_tableId_order_id_idx" ON "Row"("tableId", "order", "id");
