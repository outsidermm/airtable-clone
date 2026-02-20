-- Enable pg_trgm extension for trigram-based text search
-- Required by per-column expression trgm indexes created at column-creation time
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on Row.cells using jsonb_path_ops operator class.
-- Enables @> containment queries for efficient text-equality filters.
-- e.g.:  WHERE cells @> '{"42": "Alice"}'  uses this index.
-- jsonb_path_ops is smaller than jsonb_ops and optimal for containment (@>).
CREATE INDEX IF NOT EXISTS idx_row_cells_gin ON "Row" USING GIN (cells jsonb_path_ops);
