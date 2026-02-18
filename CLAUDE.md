# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Airtable clone built with the T3 stack (Next.js, tRPC, Prisma, Tailwind CSS) targeting high-performance handling of 1M+ rows with PostgreSQL. The application uses a JSONB-on-Row pattern — each Row has a `cells` JSONB column storing `{ "columnId": value }` — to support dynamic column creation without schema migrations.

**Key Technologies:**
- Next.js 15 (App Router)
- tRPC v11 with React Query v5
- Prisma ORM with PostgreSQL 15+
- NextAuth.js v5 (Discord OAuth, plan for Google OAuth)
- TanStack Table v8 + TanStack Virtual v3
- Tailwind CSS v4
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
pnpm db:migrate             # Deploy migrations (production)
pnpm db:studio              # Open Prisma Studio GUI
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

Example router registration:
```typescript
// src/server/api/root.ts
export const appRouter = createTRPCRouter({
  post: postRouter,
  // Add new routers here
});
```

#### 2. Authentication Flow
- NextAuth.js v5 (beta) with Prisma adapter
- Session data available in tRPC context via `ctx.session`
- `protectedProcedure` automatically throws `UNAUTHORIZED` if no session
- Current provider: Discord (Google OAuth planned per README)

#### 3. Database Schema (Prisma)
- **Custom output path**: `generated/prisma/` (not default `node_modules/.prisma`)
- Uses PostgreSQL with JSONB-on-Row pattern for dynamic columns
- Auto-generates after `pnpm install` via postinstall hook
- Current models: User, Account, Session, VerificationToken, Base, AirtableTable, Column, Row, View

**Critical JSONB Schema Requirements:**
- Use `Int @id @default(autoincrement())` on Row model for cursor pagination performance
- Row.cells is `Json @default("{}")` — stores `{ "columnId": value }` where keys are column ID strings
- Cell values are stored as native JSON types (strings, numbers, null)
- Missing keys in JSONB = empty cell (frontend handles gracefully)
- GIN index on `Row.cells` for JSONB query performance

#### 4. Type Safety & Validation
- All environment variables validated in `src/env.js` using Zod
- tRPC inputs must use Zod schemas for validation
- TypeScript strict mode enabled with `noUncheckedIndexedAccess`
- Path alias: `~/*` maps to `./src/*`

#### 5. Performance Considerations (1M Row Target)

**Frontend:**
- Fixed row height (36px) required for virtualization
- Use `display: grid` on table elements for TanStack Virtual
- Set `overscan: 10` in virtualizer config
- Memoize flattened row arrays with `useMemo`
- Debounce cell edits (300ms) and search input (300ms)

**Backend:**
- Use cursor-based pagination with Prisma `findMany`
- Batch bulk inserts in 1k chunks inside `$transaction`
- Use `$queryRaw` for complex search+filter+sort queries (Prisma limitation)
- Add `pg_trgm` GIN index for full-text search performance
- Use `$executeRawUnsafe` for 100k+ row inserts

#### 6. tRPC Timing Middleware
Development mode adds 100-400ms artificial delay to catch waterfall issues. This is intentional and configured in `src/server/api/trpc.ts`. Remove if needed but understand it helps identify serial request chains.

## Implementation Priorities from README

The README contains a comprehensive implementation checklist organized by priority:
- **P0 - Critical**: Must be implemented for core functionality
- **P1 - High**: Important for user experience
- **P2 - Medium**: Nice-to-have enhancements

Key P0 items include:
1. NextAuth configuration with Google OAuth
2. Complete Prisma schema (Base, AirtableTable, Column, Row, View models)
3. tRPC routers for CRUD operations
4. TanStack Table + Virtual integration
5. Cursor-based pagination for 1M rows
6. Vercel deployment with Neon/Supabase PostgreSQL

## Database Schema Design Notes

### Why Int IDs on Row Model
UUID/CUID are ~100x slower for cursor pagination at deep offsets. The `Row` model must use `Int @id @default(autoincrement())` for performance with large datasets.

### Why JSONB-on-Row Pattern
Allows users to dynamically create columns without `ALTER TABLE` operations. Cell data is stored as a JSONB object on each Row: `{ "colId": value }`. This eliminates the N+1 Cell table JOINs, reduces storage ~10x vs EAV, and makes writes dramatically simpler (1 row insert vs N+1).

### Critical Indexes
```prisma
model Row {
  @@index([tableId, id])      // Cursor pagination
}
```

### GIN Index for JSONB Search (Raw SQL)
```sql
CREATE INDEX idx_row_cells_gin ON "Row" USING GIN (cells jsonb_path_ops);
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
  orderBy: { id: 'asc' },
  // cells are already on the row as JSONB — no include needed
});
```

## Known Constraints & Limitations

1. **Prisma JSON Limitations**: Prisma cannot natively filter/sort on JSONB keys. Use `$queryRaw` with JSONB operators (`->>`, `jsonb_set`, `? `) for search+filter+sort operations on cell data.

2. **Vercel Function Timeout**: Default 10s (60s on Pro). Bulk inserts must be batched to stay within limits.

3. **Connection Pooling**: Add `?pgbouncer=true&connection_limit=1` to DATABASE_URL for serverless environments.

4. **NextAuth v5 Beta**: Using beta version (5.0.0-beta.25). Refer to v5 documentation, not v4.

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for auth
- `NEXTAUTH_URL`: Application URL
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`: OAuth credentials
- (Planned) `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

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
5. **Not batching bulk inserts**: createMany without batching will OOM at 100k+ rows
6. **Client-side filtering**: All search, filter, sort must be database-level for 1M row performance
7. **JSONB key format**: Cell keys in Row.cells must be column ID strings (e.g., `"42"`, not `42`). Use `String(columnId)` when building keys.

## Current Architecture: Virtualized Infinite Scroll

The table grid uses TanStack Virtual + TanStack Table with cursor-based infinite queries:
- **Virtualizer count** = `totalRowCount` from backend (first page includes `COUNT(*)`)
- Scrollbar is proportionate to the full dataset, not just loaded rows
- Unloaded rows render as animated skeleton placeholders
- Aggressive prefetching: triggers `fetchNextPage()` when within 10 rows of unloaded territory
- Key files: `grid-table.tsx` (virtualizer), `base-content.tsx` (infinite query + totalRowCount extraction)

## Future Tasks (NOT YET IMPLEMENTED)

The following are planned improvements to be implemented in future iterations:

1. **Backend Database Optimization**: Use `EXPLAIN ANALYZE` with the query planner to audit indexes on Row, Column, and View tables. Evaluate whether composite indexes, partial indexes, or index-only scans can improve cursor pagination and JSONB filter/sort query performance at scale.

2. **Optimistic UI**: Implement optimistic updates for cell edits, row creation, row deletion, and column operations using React Query's `onMutate`/`onError`/`onSettled` pattern. This eliminates perceived latency by updating the UI immediately and rolling back on server error.

3. **Frontend Performance Optimization**: Profile React re-renders with DevTools Profiler. Investigate memoization gaps, unnecessary context re-renders, and component splitting opportunities. Evaluate whether `React.memo` boundaries and `useDeferredValue` can improve scroll performance at 100k+ rows.

## Must not do
1. Must ask user for permission before drastically changing design architecture in order to fulfill requests
2. Design choices should be recommended and changed under EXPLICIT permission
3. Production database should not be touched unless explicit permission