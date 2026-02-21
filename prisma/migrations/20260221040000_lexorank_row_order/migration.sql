-- Convert Row."order" from DOUBLE PRECISION to TEXT using LexoRank-format strings.
-- LexoRank strings are lexicographically sortable, match the format used by columns,
-- and allow unlimited insertions between any two rows without precision loss.

-- Helper: convert an integer to a 6-character base-36 string (LexoRank rank portion).
-- Alphabet: '0123456789abcdefghijklmnopqrstuvwxyz'
CREATE OR REPLACE FUNCTION _lexorank_int_to_rank(n BIGINT) RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789abcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := substr(chars, (n % 36)::int + 1, 1) || result;
    n := n / 36;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add a new TEXT column for the LexoRank order.
ALTER TABLE "Row" ADD COLUMN "order_lexo" TEXT;

-- Assign LexoRank values to existing rows based on their current sort position within
-- each table. Starting point: LexoRank.middle() = '0|hzzzzz:' (numeric = 1088391167).
-- Row 1 gets 1088391167 + 1 = 1088391168 = '0|i000000:',
-- Row 2 gets '0|i000001:', etc.
UPDATE "Row" r
SET "order_lexo" = '0|' || _lexorank_int_to_rank(1088391167 + ranked.rn::BIGINT) || ':'
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "tableId" ORDER BY "order", id) AS rn
  FROM "Row"
) AS ranked
WHERE r.id = ranked.id;

-- Make non-nullable with the same default as LexoRank.middle().
ALTER TABLE "Row" ALTER COLUMN "order_lexo" SET NOT NULL;
ALTER TABLE "Row" ALTER COLUMN "order_lexo" SET DEFAULT '0|hzzzzz:';

-- Swap columns.
ALTER TABLE "Row" DROP COLUMN "order";
ALTER TABLE "Row" RENAME COLUMN "order_lexo" TO "order";

-- Recreate index (drop first in case it already exists from the previous migration).
DROP INDEX IF EXISTS "Row_tableId_order_id_idx";
CREATE INDEX "Row_tableId_order_id_idx" ON "Row"("tableId", "order", "id");

-- Drop helper function.
DROP FUNCTION _lexorank_int_to_rank;
