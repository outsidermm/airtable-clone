-- DropIndex
DROP INDEX "idx_cell_text_trgm";

-- AlterTable
ALTER TABLE "Base" ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false;
