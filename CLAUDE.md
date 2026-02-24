# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Airtable clone built with the T3 stack (Next.js, tRPC, Prisma, Tailwind CSS) targeting high-performance handling of 1M+ rows with PostgreSQL. The application uses a JSONB-on-Row pattern — each Row has a `cells` JSONB column storing `{ "columnId": value }` — to support dynamic column creation without schema migrations.

**Key Technologies:**
- Next.js 15 (App Router, Turbo dev)
- tRPC v11 with React Query v5
- Prisma v7 (custom output: `generated/prisma/`) + PostgreSQL 15+
- NextAuth.js v5 beta (Discord OAuth)
- TanStack Table v8 + TanStack Virtual v3
- DnD Kit (drag-and-drop for rows, columns, views)
- LexoRank (ordering for rows AND columns)
- Tailwind CSS v4
- Faker.js (bulk seed data generation)
- pnpm package manager

## Essential Commands

### Development
```bash
pnpm dev                    # Start dev server with Turbo (port 3000)
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm preview                # Build and start production preview
```

### Database Operations
```bash
pnpm db:push                # Push schema to DB (development)
pnpm db:generate            # Generate Prisma Client + run migrations
pnpm db:studio              # Open Prisma Studio GUI
pnpm db:prod:push           # Push schema to production DB
pnpm db:prod:generate       # Run migrations on production DB
npx prisma generate         # Generate Prisma Client manually
```

### Code Quality
```bash
pnpm check                  # Run lint + typecheck together
pnpm lint                   # Run ESLint
pnpm lint:fix               # Auto-fix ESLint issues
pnpm typecheck              # TypeScript type checking
pnpm format:check           # Check Prettier formatting
pnpm format:write           # Auto-format with Prettier
```

## Project Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── auth/          # NextAuth.js route handlers
│   │   └── trpc/          # tRPC API route handlers
│   ├── _components/       # Private route-specific components
│   │   ├── base/
│   │   │   ├── base-content.tsx        # Main table view orchestrator
│   │   │   ├── table/grid-table.tsx    # Virtualized grid
│   │   │   └── hooks/                  # Grid hooks
│   │   └── hooks/                      # Shared mutation hooks
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page
├── server/
│   ├── api/
│   │   ├── routers/       # tRPC router definitions
│   │   ├── root.ts        # Main tRPC router aggregator
│   │   └── trpc.ts        # tRPC context, procedures, middleware
│   ├── auth/
│   │   ├── config.ts      # NextAuth configuration
│   │   └── index.ts       # Auth exports
│   └── db.ts              # Prisma Client singleton
├── trpc/
│   ├── query-client.ts    # React Query client config
│   ├── react.tsx          # tRPC React Query hooks
│   └── server.ts          # Server-side tRPC caller
├── styles/                # Global styles
└── env.js                 # Environment variable validation

prisma/
└── schema.prisma          # Prisma schema definition

generated/
└── prisma/                # Generated Prisma Client (custom output)
```

### Key Architectural Patterns

#### 1. tRPC Router Structure
All tRPC routers must be:
- Defined in `src/server/api/routers/`
- Manually registered in `src/server/api/root.ts` in the `appRouter`
- Use `protectedProcedure` for authenticated routes
- Use `publicProcedure` for unauthenticated routes

Registered routers: `base`, `table`, `column`, `row`, `cell`, `view`.

Example router registration:
```typescript
// src/server/api/root.ts
export const appRouter = createTRPCRouter({
  base: baseRouter,
  table: tableRouter,
  // Add new routers here
});
```

#### 2. Authentication Flow
- NextAuth.js v5 beta with Prisma adapter
- Session data available in tRPC context via `ctx.session`
- `protectedProcedure` automatically throws `UNAUTHORIZED` if no session
- Current provider: **Discord OAuth only**

#### 3. Database Schema (Prisma)
- **Custom output path**: `generated/prisma/` (not default `node_modules/.prisma`)
- Uses PostgreSQL with JSONB-on-Row pattern for dynamic columns
- Auto-generates after `pnpm install` via postinstall hook
- Models: User, Account, Session, VerificationToken, Base, AirtableTable, Column, Row, View

**Prisma Schema Summary:**
```prisma
model Base {
  id        String   @id @default(cuid())
  name      String
  userId    String
  starred   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AirtableTable {
  id        Int      @id @default(autoincrement())
  name      String
  baseId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Column {
  id      Int    @id @default(autoincrement())
  name    String
  type    ColumnType  // TEXT | NUMBER
  tableId Int
  order   String      // LexoRank
  primary Boolean @default(false)
  @@index([tableId, order])
}

model Row {
  id        Int      @id @default(autoincrement())
  tableId   Int
  cells     Json     @default("{}")  // { "columnId": value }
  order     String                   // LexoRank
  createdAt DateTime @default(now())
  @@index([tableId, order, id])
}

model View {
  id        Int      @id @default(autoincrement())
  name      String
  tableId   Int
  config    Json?    // ViewConfig
  order     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Critical JSONB Schema Requirements:**
- Use `Int @id @default(autoincrement())` on Row model for cursor pagination performance
- Row.cells is `Json @default("{}")` — stores `{ "columnId": value }` where keys are column ID strings
- Cell values are stored as native JSON types (strings, numbers, null)
- Missing keys in JSONB = empty cell (frontend handles gracefully)
- GIN index on `Row.cells` for JSONB query performance

#### 4. LexoRank Ordering
Both `Row.order` and `Column.order` are LexoRank strings. All mutations that create or move rows/columns (`create`, `insertNear`, `reorder`, `duplicate`) must compute new LexoRank values using `LexoRank.parse/between/genNext/genPrev` in the application layer before writing to the database. Results are ordered by `(order ASC, id ASC)`.

#### 5. ViewConfig
Each View stores a `config` JSONB object with all per-view display settings:

```typescript
interface ViewConfig {
  sorts: { columnId: number; direction: "asc" | "desc" }[];
  filters: { columnId: number; operator: string; value: string }[];
  filterGroupLogic: "AND" | "OR";
  hiddenColumns: number[];           // column IDs hidden in this view
  rowHeight: "SHORT" | "MEDIUM" | "TALL" | "EXTRA_TALL";
  columnOrder: number[];             // explicit column ordering for this view
  frozenColumns: number;             // count of extra non-primary frozen columns
}
```

#### 6. Type Safety & Validation
- All environment variables validated in `src/env.js` using Zod
- tRPC inputs must use Zod schemas for validation
- TypeScript strict mode enabled with `noUncheckedIndexedAccess`
- Path alias: `~/*` maps to `./src/*`

#### 7. Performance Considerations (1M Row Target)

**Frontend:**
- Fixed row heights required for virtualization: SHORT=36px, MEDIUM=54px, TALL=108px, EXTRA_TALL=162px
- Use `display: grid` on table elements for TanStack Virtual
- Set `overscan: 10` in virtualizer config
- Debounce cell edits (300ms) and search input (300ms)

**Backend:**
- Use cursor-based pagination with Prisma `findMany` (page size 50)
- Batch bulk inserts in 10k chunks via `$executeRawUnsafe` with `jsonb_array_elements_text`
- Use `$queryRaw` for complex search+filter+sort queries (Prisma JSONB limitation)
- Add `pg_trgm` GIN index for full-text search performance
- `view.getData` uses single-query approach (SELECT id, cells, order together) — no second findMany round-trip

#### 8. tRPC Timing Middleware
Development mode adds 100-400ms artificial delay to catch waterfall issues. This is intentional and configured in `src/server/api/trpc.ts`.

## Current Architecture: Virtualized Infinite Scroll + pageStore

The table grid uses TanStack Virtual + TanStack Table with cursor-based infinite queries:
- **Virtualizer count** = `totalRowCount` from backend (first page includes `COUNT(*)`)
- Scrollbar is proportionate to the full dataset, not just loaded rows
- Unloaded rows render as animated skeleton placeholders
- Aggressive prefetching: triggers `fetchNextPage()` when within 10 rows of unloaded territory

### pageStore Pattern
The grid maintains a `pageStore` — a `Map<pageIndex, GridRow[]>` ref — tracking fetched pages of rows. This ref is merged into a flat array for the virtualizer on each render cycle. Direct mutations to `pageStore` entries (e.g., for cell edit optimistic updates) avoid triggering a full re-render; a separate `useState` counter forces re-render only when needed.

Key files:
- `grid-table.tsx` — virtualizer setup, frozen column rendering, row height
- `base-content.tsx` — infinite query, totalRowCount extraction, view config wiring
- `hooks/useOptimisticGrid.ts` — pageStore ref + flush mechanism
- `hooks/useGridNavigation.ts` — keyboard navigation
- `hooks/useGridSelection.ts` — multi-cell selection

## Optimistic Update Patterns

The following mutations apply optimistic updates to avoid perceived latency:

| Mutation | Strategy |
|---|---|
| Cell edit | Write directly into `pageStore` ref; debounced 300ms save |
| Row create | Append optimistic row to `pageStore` immediately; remove on error |
| Row delete | Remove row from `pageStore` immediately; restore on error |
| Column create | Patch table schema cache via React Query `setQueryData` |
| Column delete | Patch table schema cache via React Query `setQueryData` |
| Table rename | Patch tables list cache via React Query `setQueryData` |
| View rename | Patch views list cache via React Query `setQueryData` |
| Frozen columns | Debounced 400ms local state; persist to DB on settle |

All mutations follow `onMutate` / `onError` / `onSettled` with `invalidateQueries` on settle.

## Database Schema Design Notes

### Why Int IDs on Row Model
UUID/CUID are ~100x slower for cursor pagination at deep offsets. The `Row` model must use `Int @id @default(autoincrement())` for performance with large datasets.

### Why JSONB-on-Row Pattern
Allows users to dynamically create columns without `ALTER TABLE` operations. Cell data is stored as a JSONB object on each Row: `{ "colId": value }`. This eliminates the N+1 Cell table JOINs, reduces storage ~10x vs EAV, and makes writes dramatically simpler (1 row insert vs N+1).

### Critical Indexes
```prisma
model Row {
  @@index([tableId, order, id])   // Cursor pagination + LexoRank sort
}
model Column {
  @@index([tableId, order])       // Column ordering per table
}
```

### GIN Index for JSONB Search (Raw SQL)
Applied via migration `20260220000000`:
```sql
CREATE INDEX idx_row_cells_gin ON "Row" USING GIN (cells jsonb_path_ops);
```

### Per-Column pg_trgm Indexes
Created fire-and-forget in `column.create`, dropped in `column.delete`:
```sql
CREATE INDEX CONCURRENTLY idx_row_cells_col{id}_trgm
  ON "Row" USING GIN ((cells->>{id}) gin_trgm_ops);
```

## Code Style & Patterns

### tRPC Procedures
```typescript
// Protected procedure example
export const exampleRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.model.create({
        data: {
          name: input.name,
          userId: ctx.session.user.id,
        },
      });
    }),
});
```

### Prisma Client Access
Always use `ctx.db` in tRPC procedures, never import `db` directly in routers.

### Cursor Pagination Pattern
```typescript
const rows = await ctx.db.row.findMany({
  take: 50,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: [{ order: 'asc' }, { id: 'asc' }],
  // cells are already on the row as JSONB — no include needed
});
```

### JSONB Cell Key Format
Cell keys in Row.cells must always be column ID strings (e.g., `"42"`, not `42`). Use `String(columnId)` when building keys on the frontend. The backend uses JSONB operators:
- `->>` for text extraction
- `@>` with `jsonb_build_object` for equality filters (hits GIN index)
- `jsonb_set` for cell updates

### Bulk Insert Pattern
`bulkCreateRows` generates LexoRank order strings in JS, inserts in batches of 10k via `$executeRawUnsafe` using `jsonb_array_elements_text` with `WITH ORDINALITY` to join cells and orders arrays.

## Known Constraints & Limitations

1. **Prisma JSON Limitations**: Prisma cannot natively filter/sort on JSONB keys. Use `$queryRaw` with JSONB operators (`->>`, `jsonb_set`, `@>`) for search+filter+sort operations on cell data.

2. **Vercel Function Timeout**: Default 10s (60s on Pro). Bulk inserts must be batched to stay within limits.

3. **Connection Pooling**: Add `?pgbouncer=true&connection_limit=1` to DATABASE_URL for serverless environments.

4. **NextAuth v5 Beta**: Using beta version. Refer to v5 documentation, not v4.

5. **Prisma `$executeRawUnsafe` return type**: Returns `Promise<number>` (affected row count), not an array of IDs.

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for auth
- `NEXTAUTH_URL`: Application URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth credentials

## Testing Strategy

Per README performance targets:
- Scroll at 60 FPS with 100k rows (Chrome DevTools Performance)
- Page fetch < 200ms for 50 rows
- Search < 300ms with GIN index on 1M rows
- Browser memory < 500MB with 1M rows loaded
- Bulk insert 100k rows < 30s (batched)

## Deployment Notes

1. **Database**: Neon recommended for Vercel (built-in connection pooling)
2. **Build Command**: `pnpm build` (includes `prisma generate`)
3. **Migration Strategy**: Use `npx prisma migrate deploy` in production, `db:push` in development
4. **Prisma Generate**: Runs automatically in postinstall hook

## Common Pitfalls

1. **Forgetting to register routers**: New tRPC routers must be added to `appRouter` in `src/server/api/root.ts`
2. **Using wrong Prisma Client path**: Import from `~/server/db`, not `@prisma/client`
3. **Missing GIN index on Row.cells**: JSONB queries degrade without `idx_row_cells_gin` GIN index
4. **Using CUID for Row IDs**: Must use Int autoincrement for cursor pagination performance
5. **Not batching bulk inserts**: `createMany` without batching will OOM at 100k+ rows
6. **Client-side filtering**: All search, filter, sort must be database-level for 1M row performance
7. **JSONB key format**: Cell keys in Row.cells must be column ID strings (e.g., `"42"`, not `42`). Use `String(columnId)` when building keys.
8. **LexoRank on both models**: Row.order and Column.order are both LexoRank — never use raw integers or timestamps for ordering.
9. **pageStore is a ref, not state**: Do not setState on pageStore mutations directly; use the flush/trigger mechanism in `useOptimisticGrid`.
10. **ViewConfig fields**: When adding new per-view settings, add to the `ViewConfig` interface and handle missing keys gracefully (older views will not have the field).

## Must not do
1. Must ask user for permission before drastically changing design architecture in order to fulfill requests
2. Design choices should be recommended and changed under EXPLICIT permission
3. Production database should not be touched unless explicit permission
