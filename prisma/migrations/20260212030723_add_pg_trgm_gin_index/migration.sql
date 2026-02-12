-- Enable pg_trgm extension for trigram-based full-text search
-- This extension provides GIN and GiST index operator classes for efficient text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on Cell.textValue for full-text search performance
-- GIN (Generalized Inverted Index) is optimized for cases where values appear many times
-- pg_trgm operators enable fuzzy text matching and LIKE '%pattern%' queries
-- Critical for achieving <300ms search performance on 1M rows
CREATE INDEX IF NOT EXISTS idx_cell_text_trgm ON "Cell" USING GIN ("textValue" gin_trgm_ops);

-- Performance notes:
-- - This index supports ILIKE, LIKE, and similarity() operators
-- - Enables fast substring search without leading wildcard performance penalty
-- - Trade-off: ~30% larger index size vs standard btree, but 100x+ faster for text search
-- - On 1M rows with average 50-char text values, expect ~200-300MB index size
