# 🗂️ Airtable Clone

A high-performance Airtable clone built with the T3 stack, targeting smooth handling of 1M+ rows using PostgreSQL with a JSONB-on-Row storage pattern, virtualized infinite scroll, and full view management.

---

## 🚀 What It Does

- Create and manage **Bases** (workspaces) and **Tables** within them
- Define typed **Columns** (Text, Number) with drag-to-reorder support
- Edit **Cells** inline with keyboard navigation (arrows, Tab, Enter, Escape)
- Create, delete, duplicate, and bulk-insert **Rows** (up to 100k at a time via Faker.js seed)
- Configure per-table **Views** with independent filters, sorts, column visibility, row height, column order, and frozen columns
- Full-text **search** powered by PostgreSQL pg_trgm GIN indexes
- **Drag-and-drop** reordering for rows, columns, and views (DnD Kit + LexoRank)
- **Optimistic updates** for cell edits, row creation/deletion, column create/delete, table/view rename, and frozen columns
- Real-time **performance panel** showing query timing per operation

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbo dev) |
| API | tRPC v11 + React Query v5 |
| ORM | Prisma v7 (custom output: `generated/prisma/`) |
| Database | PostgreSQL 15+ |
| Auth | NextAuth v5 beta (Discord OAuth) |
| Table UI | TanStack Table v8 + TanStack Virtual v3 |
| Drag & Drop | DnD Kit |
| Ordering | LexoRank (rows and columns) |
| Styling | Tailwind CSS v4 |
| Seed Data | Faker.js |
| Package Manager | pnpm |

---

## ⚙️ Setup

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL 15+ instance (local or hosted, e.g. Neon)
- Discord OAuth app (for authentication)

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/airtable_clone"
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
```

### Installation & First Run

```bash
# Install dependencies
pnpm install

# Push the schema to your database
pnpm db:push

# Apply raw SQL migrations (GIN indexes, trgm extension)
npx prisma db execute --file prisma/migrations/20260220000000_add_gin_index/migration.sql

# Start the dev server (http://localhost:3000)
pnpm dev
```

---

## 📋 Key Commands

### Development

```bash
pnpm dev              # Start dev server with Turbo (port 3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm preview          # Build + start production preview
```

### Database

```bash
pnpm db:push          # Push schema to DB (development)
pnpm db:generate      # Generate Prisma Client + run migrations
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:prod:push     # Push schema to production DB
pnpm db:prod:generate # Run migrations on production DB
```

### Code Quality

```bash
pnpm check            # Run lint + typecheck together
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix ESLint issues
pnpm typecheck        # TypeScript type checking
pnpm format:write     # Auto-format with Prettier
pnpm format:check     # Check Prettier formatting
```

---

## 🏗️ Architecture

### JSONB-on-Row Pattern

Each `Row` has a `cells` JSONB column storing `{ "columnId": value }` — for example `{ "1": "Alice", "2": 42 }`. This allows users to dynamically create and delete columns without `ALTER TABLE` migrations. Prisma's `Json` type maps directly to PostgreSQL JSONB. Cell keys are always column ID strings (never numbers).

### Cursor-Based Pagination

Row IDs are `Int @default(autoincrement())`. Pages of 50 rows are fetched using Prisma cursor pagination (`take`, `skip: 1`, `cursor: { id }`), ordered by `(order ASC, id ASC)`. The first page also returns a total `COUNT(*)` so the virtualizer can render a proportionate scrollbar over the full dataset, with skeleton placeholders for unloaded rows.

### pageStore Pattern

The virtual grid maintains a `pageStore` — a `Map<pageIndex, GridRow[]>` ref — to track which pages of rows have been fetched. This allows the virtualizer to render loaded rows immediately while fetching adjacent pages in the background. The store is merged into a flat array on each render cycle.

### View System

Each View stores a `config` JSONB with all per-view settings:

```typescript
interface ViewConfig {
  sorts: { columnId: number; direction: "asc" | "desc" }[];
  filters: { columnId: number; operator: string; value: string }[];
  filterGroupLogic: "AND" | "OR";
  hiddenColumns: number[];
  rowHeight: "SHORT" | "MEDIUM" | "TALL" | "EXTRA_TALL";
  columnOrder: number[];
  frozenColumns: number; // count of frozen non-primary columns
}
```

Filters, sorts, and search all execute as a single raw SQL query using JSONB operators (`->>`, `@>`) against `Row.cells`.

### LexoRank Ordering

Both rows and columns use LexoRank strings for their `order` field. All mutations that create or move rows/columns (`create`, `insertNear`, `reorder`, `duplicate`) compute new LexoRank values in the application layer before writing to the database.

### Optimistic Updates

Several mutations apply optimistic updates to avoid perceived latency:

- **Cell edits**: Updated in `pageStore` ref directly (no re-render triggered until debounced save settles)
- **Row create/delete**: Grid rows mutated optimistically; invalidated on settle
- **Column create/delete**: Table schema cache updated immediately via React Query `setQueryData`
- **Table/View rename**: React Query cache patched before the mutation resolves
- **Frozen column count**: Debounced 400ms local state, then persisted to DB

### Full-Text Search

Per-column `pg_trgm` GIN indexes (`idx_row_cells_col{id}_trgm`) are created when a column is created and dropped when it is deleted. The `cell.search` procedure uses these indexes for `ILIKE`-based trigram matching.

### Virtualization

TanStack Virtual renders only the visible rows at a fixed height:

| Row Height | px |
|---|---|
| SHORT | 36 |
| MEDIUM | 54 |
| TALL | 108 |
| EXTRA_TALL | 162 |

`overscan: 10` is set so rows are pre-rendered just outside the viewport.

---

## ✅ Implemented Features

### Authentication
- Discord OAuth sign-in / sign-out via NextAuth v5

### Base Dashboard
- Create, rename, delete bases
- Star / unstar bases
- Search bases, recent bases list

### Table Management
- Create, rename (inline), delete tables
- Tab bar navigation between tables

### Column Management
- TEXT and NUMBER column types
- Drag-to-reorder columns (DnD Kit + LexoRank)
- Rename, delete, duplicate, set primary column
- Hide/show columns per view
- Right-click context menu

### Row Management
- Create rows, insert near (above/below), delete, duplicate
- Bulk insert 100k rows with Faker.js seed data
- Drag-to-reorder rows (DnD Kit + LexoRank)
- Right-click context menu

### Cell Editing
- Inline editing for all column types
- Debounced save (300ms)
- Keyboard navigation: arrows, Tab/Shift+Tab, Enter/Shift+Enter, Escape
- Multi-cell selection with Shift+click

### Views
- Create, rename (inline), delete, duplicate, drag-reorder views
- Per-view: filters (text/number operators, AND/OR group logic)
- Per-view: sorts (ASC/DESC per column)
- Per-view: column visibility toggle
- Per-view: row height (SHORT / MEDIUM / TALL / EXTRA_TALL)
- Per-view: column order
- Per-view: frozen columns (draggable border handle, persisted)

### Search
- Full-text grid search via toolbar (pg_trgm, debounced 300ms)

### UI / UX
- Virtualized grid with skeleton loading states for unloaded rows
- Performance panel with per-query SQL timing
- Toast notifications

---

## 📈 Performance Targets

| Metric | Target |
|---|---|
| Scroll FPS (100k rows) | 60 FPS |
| Page fetch (50 rows) | < 200ms |
| Search (1M rows, GIN index) | < 300ms |
| Browser memory (1M rows) | < 500MB |
| Bulk insert (100k rows) | < 30s |

---

## 🗄️ Database Notes

- **Neon** is the recommended PostgreSQL host for Vercel deployments (built-in connection pooling)
- For serverless environments, append `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`
- Prisma Client is generated to `generated/prisma/` (custom output path), not `node_modules/.prisma`
- Always import from `~/server/db`, not from `@prisma/client` directly

---

## 🧪 Testing

The project uses **Vitest** for unit tests and **Playwright** for end-to-end (E2E) browser tests.

---

### Unit Tests (Vitest)

```bash
pnpm test              # Run all unit tests once
pnpm test:watch        # Run in watch mode (reruns on file change)
pnpm test:coverage     # Run with coverage report (enforces 80% on src/lib/**)
pnpm test:ui           # Open the Vitest browser UI
```

**What is tested:**
- `src/lib/` utility functions (`query-log`, `date`, `base-icon-utils`, `base-color-storage`)
- ViewConfig Zod schema validation (`src/server/api/routers/view`)
- LexoRank ordering invariants (`src/server/api/utils/row-helpers`)

**Coverage:**
Coverage is collected for `src/lib/**` and `src/server/api/utils/**`. An 80% threshold is enforced on `src/lib/**`. Server-side tRPC routers require a live database and are covered by E2E tests instead.

To view the HTML coverage report after running `pnpm test:coverage`:
```bash
open coverage/index.html    # macOS
xdg-open coverage/index.html  # Linux
```

---

### E2E Tests (Playwright)

E2E tests run against a **live dev server** (started automatically). They test the full browser interaction including auth, grid navigation, context menus, drag-and-drop, filters, sorts, and modals.

#### Prerequisites

1. **Test database** — the dev server's `DATABASE_URL` must be reachable. The E2E tests create all their data under a dedicated test user (`playwright-test@e2e.internal`) and delete it in teardown. Your own developer data is **never modified**.

2. No additional OAuth credentials are required — the global setup creates a session token directly in the database, bypassing the Google OAuth flow.

#### Running E2E tests

```bash
# Headless (fastest, suitable for CI)
pnpm test:e2e

# Headed browser (watch the tests run in a real browser window)
pnpm test:e2e -- --headed

# Interactive UI mode (step through tests visually in Playwright's debugger)
pnpm test:e2e:ui

# Run a specific spec file
pnpm test:e2e -- e2e/grid-navigation.spec.ts

# Debug a single test
pnpm test:e2e -- --debug e2e/context-menus.spec.ts
```

#### How the test database is managed

| Step | What happens |
|---|---|
| **global-setup** | Creates `playwright-test@e2e.internal` user + a 30-day session token directly in the DB via Prisma |
| **Each spec** | Calls `base.create` via the tRPC API to get a fresh base with a default table; deletes it in `afterAll` |
| **global-teardown** | Deletes the test user, cascading to all sessions, bases, tables, rows created during the run |

The session cookie (`authjs.session-token`) is written to `playwright/.auth/user.json` (git-ignored) and loaded by each test via `test.use({ storageState: ... })`.

#### Viewing the Playwright report

After a test run, open the HTML report:
```bash
pnpm exec playwright show-report
# or
open playwright-report/index.html
```

#### E2E spec files

| File | Coverage |
|---|---|
| `e2e/auth.spec.ts` | Redirect, sign-in page, 401 on unauthenticated API |
| `e2e/home.spec.ts` | Landing page load, nav bar, sign-in affordance |
| `e2e/grid-navigation.spec.ts` | Arrow keys, Tab, Enter/Escape, Shift+Enter, Delete |
| `e2e/toolbar.spec.ts` | Filter (AND/OR), sort, hide fields, bulk seed 1K, view rename, row height |
| `e2e/context-menus.spec.ts` | Row context menu (insert/delete/duplicate), column header context menu |
| `e2e/modals.spec.ts` | Add column modal (search, select type, configure, create), add table |
| `e2e/drag-and-drop.spec.ts` | Column reorder, row reorder, column resize via pointer events |
| `e2e/frozen-columns.spec.ts` | Frozen column sticky behaviour, drag border, persist across reload, network rollback |

---

## 📁 Key Files

```
src/server/api/routers/         # tRPC routers (base, table, column, row, cell, view)
src/app/_components/base/
  base-content.tsx              # Main table view orchestrator (infinite query, view config)
  table/grid-table.tsx          # Virtualized grid (TanStack Virtual + TanStack Table)
  hooks/                        # Grid hooks: navigation, selection, resizing, pageStore, optimistic grid
src/app/_components/hooks/      # Shared mutation hooks
prisma/schema.prisma            # Database schema
src/server/db.ts                # Prisma singleton
src/env.js                      # Environment variable validation (Zod)
```
