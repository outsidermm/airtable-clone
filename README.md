# Airtable Clone

**README & Implementation Guide**

A full-featured Airtable clone built with the T3 stack (Next.js, tRPC, Prisma ORM, Tailwind CSS) with PostgreSQL, TanStack Table + Virtual, and deployed on Vercel.

---

## 📋 Project Overview

This application allows authenticated users to create bases, manage tables with dynamic columns, edit cells inline, and handle datasets of 1M+ rows with zero-lag scrolling. All search, filter, and sort operations are executed at the database level for optimal performance.

### 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (via create-t3-app) |
| API | tRPC v11 with React Query v5 |
| ORM | Prisma ORM (with @prisma/client) |
| Database | PostgreSQL 15+ |
| Auth | NextAuth.js v4 (Google OAuth) |
| Table UI | TanStack Table v8 |
| Virtualization | TanStack Virtual v3 |
| Styling | Tailwind CSS |
| Deployment | Vercel (Serverless Functions) |
| Fake Data | @faker-js/faker |
| Validation | Zod |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x and pnpm
- PostgreSQL 15+ instance (local, Neon, Supabase, or Railway)
- Google Cloud Console project with OAuth 2.0 credentials
- Vercel account for deployment

### Environment Variables (.env)

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"
NEXTAUTH_SECRET="<random-secret>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="<from-google-console>"
GOOGLE_CLIENT_SECRET="<from-google-console>"
```

### Setup Commands

```bash
git clone <repo-url> && cd airtable-clone
pnpm install
npx prisma db push          # push schema to DB
npx prisma generate         # generate Prisma Client
npx prisma db seed          # (optional) seed default data
pnpm dev                    # start dev server on :3000
```

---

## ✅ Implementation Checklist

### 🔐 Authentication & User Management

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Configure NextAuth.js with GoogleProvider | Auth | P0 - Critical |
| ⬜ | Add Account, Session, User, VerificationToken models to schema.prisma | Auth | P0 - Critical |
| ⬜ | Create SessionProvider wrapper in _app.tsx or layout.tsx | Auth | P0 - Critical |
| ⬜ | Build sign-in / sign-out UI components | Auth | P1 - High |
| ⬜ | Protect tRPC routes with middleware (ctx.session check) | Auth | P0 - Critical |
| ⬜ | Redirect unauthenticated users from base/table pages | Auth | P1 - High |

### 🗄 Prisma Schema Design

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Define Base model (id, name, userId, createdAt, updatedAt) | Schema | P0 - Critical |
| ⬜ | Define AirtableTable model (id, name, baseId, createdAt) | Schema | P0 - Critical |
| ⬜ | Define Column model (id, name, type enum [TEXT, NUMBER], tableId, order) | Schema | P0 - Critical |
| ⬜ | Define Row model (id Int @id @default(autoincrement()), tableId, order, createdAt) | Schema | P0 - Critical |
| ⬜ | Define Cell model (id, rowId, columnId, textValue, numberValue) | Schema | P0 - Critical |
| ⬜ | Define View model (id, name, tableId, config Json) | Schema | P1 - High |
| ⬜ | Add @@unique([rowId, columnId]) on Cell for upsert support | Schema | P0 - Critical |
| ⬜ | Add @@index([tableId, id]) on Row for cursor pagination | Schema | P0 - Critical |
| ⬜ | Add @@index([columnId, numberValue]) on Cell for numeric filters | Schema | P1 - High |
| ⬜ | Add @@index([columnId, textValue]) on Cell for text filters | Schema | P1 - High |
| ⬜ | Use Int autoincrement ID on Row (NOT cuid/uuid) for cursor perf | Schema | P0 - Critical |
| ⬜ | Run npx prisma db push && npx prisma generate, verify in Studio | Schema | P0 - Critical |
| ⬜ | Create raw SQL migration for pg_trgm extension + GIN index | Schema | P1 - High |

### 🔌 tRPC API Layer (Routers)

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Create bases router: list, create, rename, delete | API | P0 - Critical |
| ⬜ | Create tables router: list by base, create (with Faker defaults), rename | API | P0 - Critical |
| ⬜ | Create columns router: list by table, add column (TEXT/NUMBER), reorder | API | P0 - Critical |
| ⬜ | Create rows router: infiniteQuery with Prisma cursor-based pagination | API | P0 - Critical |
| ⬜ | Create cells router: update single cell (prisma.cell.upsert) | API | P0 - Critical |
| ⬜ | Create views router: create, list, update config, delete | API | P1 - High |
| ⬜ | Implement server-side search: prisma.cell.findMany with contains/ILIKE | API | P1 - High |
| ⬜ | Implement server-side filters: where clause builders for number + text | API | P1 - High |
| ⬜ | Implement server-side sort: orderBy on joined cell values | API | P1 - High |
| ⬜ | Implement bulkInsertRows mutation: batched createMany (1k/batch) | API | P0 - Critical |
| ⬜ | Use $queryRaw for complex search+filter+sort queries (Prisma limitation) | API | P1 - High |
| ⬜ | Add input validation with Zod on every procedure | API | P1 - High |

### 🖥 Table UI & Interactions

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Set up TanStack Table with dynamic column definitions from API | UI | P0 - Critical |
| ⬜ | Match Airtable 1:1 visual design (grid lines, row colors, fonts, spacing) | UI | P0 - Critical |
| ⬜ | Implement inline cell editing (click to edit, blur/Enter to save) | UI | P0 - Critical |
| ⬜ | Implement arrow key (Up/Down/Left/Right) navigation across cells | UI | P0 - Critical |
| ⬜ | Implement Tab key to move right, Shift+Tab to move left | UI | P0 - Critical |
| ⬜ | Implement Enter to confirm + move down, Escape to cancel edit | UI | P1 - High |
| ⬜ | Build dynamic "Add Column" button with type selector (Text / Number) | UI | P0 - Critical |
| ⬜ | Build frozen row-number column (first column, always visible) | UI | P1 - High |
| ⬜ | Build sticky header row that stays on scroll | UI | P0 - Critical |
| ⬜ | Build "+ New Row" button at bottom of visible rows | UI | P1 - High |
| ⬜ | Style active/selected cell with blue border (Airtable style) | UI | P1 - High |

### ⚡ Virtualization & Performance (100k–1M rows)

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Integrate TanStack Virtual useVirtualizer for row virtualization | Perf | P0 - Critical |
| ⬜ | Set table/thead/tbody to display: grid, rows to display: flex | Perf | P0 - Critical |
| ⬜ | Set fixed row height (36px) and overscan: 10 in virtualizer config | Perf | P0 - Critical |
| ⬜ | Wire tRPC useInfiniteQuery to Prisma cursor pagination | Perf | P0 - Critical |
| ⬜ | Connect virtualizer scroll position to fetchNextPage trigger | Perf | P0 - Critical |
| ⬜ | Add "Load 100k Rows" button with progress indicator | Perf | P0 - Critical |
| ⬜ | Implement batched createMany (1k rows/batch) in $transaction | Perf | P0 - Critical |
| ⬜ | For 100k+ inserts, use $executeRawUnsafe with multi-row VALUES | Perf | P1 - High |
| ⬜ | Verify 60fps scrolling at 100k rows (Chrome DevTools Performance) | Perf | P1 - High |
| ⬜ | Test 1M rows: confirm no crash, < 500MB browser memory | Perf | P0 - Critical |
| ⬜ | Memoize flattened row array with useMemo to prevent re-allocation | Perf | P1 - High |
| ⬜ | Debounce cell edit mutations (300ms) to reduce API calls | Perf | P2 - Medium |

### 🔍 Search, Filter & Sort

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Build global search bar with debounced input (300ms) | Search | P1 - High |
| ⬜ | Implement search at DB level: $queryRaw with ILIKE or pg_trgm GIN index | Search | P1 - High |
| ⬜ | Search result acts as row filter (only matched rows shown) | Search | P1 - High |
| ⬜ | Build filter builder UI (pick column, pick operator, enter value) | Filter | P1 - High |
| ⬜ | Number operators: greater than, less than, equals, >=, <= | Filter | P1 - High |
| ⬜ | Text operators: contains, not contains, is empty, is not empty, equals | Filter | P1 - High |
| ⬜ | Build sort UI (pick column, toggle ASC/DESC) | Sort | P1 - High |
| ⬜ | Text sort: A→Z / Z→A via ORDER BY at DB level | Sort | P1 - High |
| ⬜ | Number sort: increasing / decreasing via ORDER BY at DB level | Sort | P1 - High |
| ⬜ | Compose search + filter + sort in single $queryRaw (Prisma can't do complex JOINs natively) | Sort | P0 - Critical |

### 👁 Views

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Build "Create View" UI (name input + save) | Views | P1 - High |
| ⬜ | Save view config as JSON: { filters, sorts, search, hiddenColumnIds } | Views | P1 - High |
| ⬜ | Load + apply saved view config when user selects a view | Views | P1 - High |
| ⬜ | Build column visibility toggle (show/hide per view) | Views | P1 - High |
| ⬜ | Build view switcher tabs/sidebar | Views | P2 - Medium |
| ⬜ | Support rename and delete views | Views | P2 - Medium |

### 🗂 Bases & Table Management

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Build base dashboard (grid/list of user's bases) | Base | P0 - Critical |
| ⬜ | Create base → auto-creates one default table | Base | P0 - Critical |
| ⬜ | Create table → generates default columns + rows with Faker.js | Base | P0 - Critical |
| ⬜ | Build table tab bar within a base (switch between tables) | Base | P1 - High |
| ⬜ | Implement rename base / rename table | Base | P2 - Medium |

### 🎨 Loading States & UX Polish

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Skeleton loader for table grid on initial load | UX | P1 - High |
| ⬜ | Spinner at bottom of table for infinite scroll fetching | UX | P1 - High |
| ⬜ | Progress bar/counter for bulk 100k row insert | UX | P1 - High |
| ⬜ | Optimistic cell updates (instant UI, background save) | UX | P2 - Medium |
| ⬜ | Toast notifications for errors (failed save, network issues) | UX | P2 - Medium |
| ⬜ | Empty state for new bases / tables (illustration + CTA) | UX | P2 - Medium |

### 🚀 Deployment & DevOps

| Status | Task | Category | Priority |
|--------|------|----------|----------|
| ⬜ | Deploy to Vercel, configure env vars in dashboard | Deploy | P0 - Critical |
| ⬜ | Provision PostgreSQL (Neon recommended for Vercel + connection pooling) | Deploy | P0 - Critical |
| ⬜ | Add ?pgbouncer=true&connection_limit=1 to DATABASE_URL for serverless | Deploy | P0 - Critical |
| ⬜ | Run npx prisma migrate deploy in Vercel build step | Deploy | P1 - High |
| ⬜ | Set up Prisma Accelerate or connection pool for production | Deploy | P1 - High |
| ⬜ | Performance test: 1M rows on production DB, verify scroll + search perf | Deploy | P0 - Critical |
| ⬜ | Add README.md with setup instructions to repo | Deploy | P1 - High |

---

## 🏗 Architecture & Database Design

### The EAV Pattern: Why It's Required

Airtable lets users create columns dynamically. The Entity-Attribute-Value (EAV) pattern solves this by storing each cell as a row in a separate table. Adding a "column" just inserts a record in the columns table—no schema changes, no locks, instant operation.

### Core Prisma Schema

```prisma
model Row {
  id        Int      @id @default(autoincrement())
  tableId   String
  order     Int
  createdAt DateTime @default(now())
  
  table AirtableTable @relation(fields: [tableId], references: [id], onDelete: Cascade)
  cells Cell[]
  
  @@index([tableId, id])    // cursor pagination
  @@index([tableId, order]) // ordered display
}

model Cell {
  id          String @id @default(cuid())
  rowId       Int
  columnId    String
  textValue   String?
  numberValue Float?
  
  row    Row    @relation(fields: [rowId], references: [id], onDelete: Cascade)
  column Column @relation(fields: [columnId], references: [id], onDelete: Cascade)
  
  @@unique([rowId, columnId])
  @@index([columnId, numberValue])
  @@index([columnId, textValue])
}
```

### Critical Schema Decisions (⭐ Cannot be changed easily later)

- **⭐ Use Int @id @default(autoincrement()) on Row model**: Required for cursor pagination performance. UUID/CUID are ~100x slower at deep offsets
- **⭐ Separate textValue and numberValue columns**: Enables type-specific indexes and ORDER BY operations
- **⭐ EAV pattern (Row + Cell tables)**: Essential for dynamic columns without ALTER TABLE operations
- **⭐ Add @@unique([rowId, columnId])**: Required for upsert operations and creates composite index

### Index Strategy

1. **Row(tableId, id)** - Cursor pagination backbone
2. **Cell(rowId, columnId) UNIQUE** - Cell lookup and upserts  
3. **Cell(columnId, numberValue)** - Numeric filters and sorts
4. **Cell(columnId, textValue)** - Text filters and sorts
5. **GIN(textValue gin_trgm_ops)** - Global search with ILIKE '%term%'

### Performance Considerations

#### Frontend (Critical for 1M rows)
- **F1**: Use CSS Grid layout on table/thead/tbody (required for TanStack Virtual)
- **F2**: Fixed row height (36px) - dynamic height kills virtualization performance
- **F3**: Set overscan: 10 for smooth scrolling without blank rows
- **F4**: Memoize flattened row array to prevent re-renders
- **F5**: Debounce cell edits (300ms) and search input (300ms)

#### Backend (Database Level)
- **B1**: Use Int autoincrement for Row.id (cursor performance)
- **B2**: Create GIN index with pg_trgm for search (100ms vs 8s)
- **B3**: Use $queryRaw for complex search+filter+sort (Prisma limitation)
- **B4**: Batch bulk inserts in 1k chunks to avoid memory limits

---

## 📊 Performance Targets

| Metric | Target | Measurement Tool |
|--------|--------|------------------|
| Scroll FPS (100k rows) | 60 FPS sustained | Chrome DevTools Performance |
| Initial page load | < 2s FCP | Lighthouse |
| Page fetch (50 rows) | < 200ms end-to-end | Network tab |
| Search (1M rows) | < 300ms with GIN index | EXPLAIN ANALYZE |
| Bulk insert 100k | < 30s total (batched) | Server logs + UI progress |
| Cell edit round-trip | < 100ms (optimistic) | Network latency |
| Browser memory (1M) | < 500MB heap | Chrome Memory profiler |

---

## 📅 Suggested Daily Schedule

| Day | Focus Area |
|-----|------------|
| Day 1 | Scaffold T3 app, Prisma schema design, Google OAuth, DB provisioning |
| Day 2 | Base CRUD, Table CRUD, Faker.js default data on table creation |
| Day 3 | Column management (dynamic add TEXT/NUMBER), Cell model + upsert mutation |
| Day 4 | TanStack Table setup, Airtable UI match, inline cell editing |
| Day 5 | Arrow key + Tab + Enter + Escape keyboard navigation |
| Day 6 | TanStack Virtual integration, Prisma cursor infinite scroll wiring |
| Day 7 | 100k bulk insert (batched createMany / $executeRaw), perf testing |
| Day 8 | DB-level search ($queryRaw ILIKE + pg_trgm GIN), search bar UI |
| Day 9 | DB-level filter + sort, compose with search in $queryRaw |
| Day 10 | Views: create, save, load, column visibility toggle |
| Day 11 | Loading states, error handling, UX polish, optimistic updates |
| Day 12 | 1M row stress test, EXPLAIN ANALYZE on all queries, fix bottlenecks |
| Day 13 | Vercel deploy, Neon/Supabase prod DB, connection pooling config |
| Day 14 | Final QA, README polish, documentation |

---

## ⚠️ Risk Matrix & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Prisma createMany OOM at 100k | High | High | Chunk into 1k batches; fall back to $executeRawUnsafe |
| UUID cursor kills deep-scroll perf | High | Critical | Use Int autoincrement on Row.id ⭐ |
| Missing GIN index = 8s search | Medium | High | Add pg_trgm GIN index in raw migration |
| Vercel function timeout on bulk insert | High | Medium | Use Vercel Pro (60s); split into smaller batches |
| Connection pool exhaustion | High | Critical | pgBouncer + connection_limit=1; Prisma singleton |
| N+1 cell queries per page | High | High | Always use include: { cells: true } or $queryRaw pivot |

---

## 🔧 Prisma-Specific Implementation Notes

### Cursor Pagination
Use `findMany` with `take`, `skip: 1`, `cursor: { id: lastId }`, `orderBy: { id: 'asc' }`. The cursor field MUST be unique and sequential. Prefer Int autoincrement over cuid() for performance.

### Bulk Inserts
Use `prisma.cell.createMany({ data: [...], skipDuplicates: true })` in batches of 500-1,000 rows inside a `$transaction`. For 100k+ rows, fall back to `$executeRawUnsafe` with multi-row INSERT VALUES.

### Complex Queries
Prisma's query builder cannot express multi-table JOINs with dynamic WHERE clauses. Use `$queryRaw` with tagged template literals for combined search+filter+sort operations.

### Indexes
Create GIN indexes and extensions (pg_trgm) via raw SQL migrations:

```sql
-- In prisma/migrations/XXXX_add_gin_index/migration.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_cell_text_trgm ON "Cell" USING GIN ("textValue" gin_trgm_ops);
```

---

## 📚 References

- [Prisma Cursor-Based Pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)
- [TanStack Virtual Documentation](https://tanstack.com/virtual/latest)
- [TanStack Table Virtualized Examples](https://tanstack.com/table/latest/docs/framework/react/examples/virtualized-infinite-scrolling)
- [PostgreSQL GIN Index Guide](https://pganalyze.com/blog/gin-index)
- [pg_trgm Extension Docs](https://www.postgresql.org/docs/current/pgtrgm.html)

---

*Mark each checklist item with ✅ as completed and reference in daily progress updates.*
