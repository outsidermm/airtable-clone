# Database Migrations

## Development Workflow

For development, you can use either approach:

### Option 1: Prisma Migrate (Recommended)
```bash
pnpm db:generate  # Apply migrations and generate client
```

### Option 2: Manual SQL Execution
```bash
# Apply pg_trgm extension and GIN index manually
psql $DATABASE_URL -f prisma/migrations/20260212134356_add_pg_trgm_gin_index/migration.sql
```

### Option 3: Prisma Push (Dev Only - Skips Migration History)
```bash
pnpm db:push  # Push schema changes without migration files
```
**Note:** After `db:push`, you still need to run the pg_trgm migration manually:
```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
psql $DATABASE_URL -c "CREATE INDEX IF NOT EXISTS idx_cell_text_trgm ON \"Cell\" USING GIN (\"textValue\" gin_trgm_ops);"
```

## Production Deployment

### Vercel/Neon/Supabase Deployment

Add to your build command or run before deployment:
```bash
npx prisma migrate deploy
```

This will:
1. Apply all pending migrations in order
2. Create the pg_trgm extension
3. Create the GIN index for full-text search
4. Update the migration history table

### Direct Database Access

If you have direct database access:
```bash
# Set your production DATABASE_URL
export DATABASE_URL="postgresql://..."

# Deploy all migrations
npx prisma migrate deploy
```

## Migration Rollback

To remove the GIN index and pg_trgm extension:
```sql
-- Drop the GIN index
DROP INDEX IF EXISTS idx_cell_text_trgm;

-- Drop the extension (be careful - this affects all schemas)
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
```

⚠️ **Warning:** Dropping pg_trgm will remove all trigram indexes across your database.

## Performance Impact

### Index Creation Time
- **100k rows**: ~2-5 seconds
- **1M rows**: ~20-40 seconds
- **10M rows**: ~3-5 minutes

The index is created with `IF NOT EXISTS`, so re-running is safe.

### Disk Space
- GIN index adds ~30-40% overhead to text column size
- For 1M rows with avg 50-char text: ~200-300MB

### Query Performance
- Full-text search: **100x+ faster** than sequential scan
- ILIKE '%pattern%': <300ms on 1M rows (vs 10-15s without index)
