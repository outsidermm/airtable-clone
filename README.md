# 🗂️ High-Performance Airtable Clone



A full-stack, highly optimized data grid application mirroring the core functionality of Airtable. Built with the T3 Stack, this project was engineered to handle massive datasets (smoothly scaling to 3 million+ rows) while maintaining a strict 60 FPS scrolling experience and sub-200ms query responses. 

It features a dynamic schema using a PostgreSQL JSONB-on-Row pattern, robust CI/CD pipelines, and complex state management for optimistic UI updates.

## ✨ Technical Highlights (At a Glance)
* **Massive Dataset Handling:** Virtualized infinite scrolling combined with cursor-based pagination effortlessly handles databases scaling up to 3,000,000 rows without browser memory bloat.
* **Dynamic Database Schema:** Utilizes a `JSONB-on-Row` architecture, allowing users to instantly create, delete, and modify typed columns without triggering blocking `ALTER TABLE` SQL migrations.
* **Zero-Latency UX:** Extensively uses React Query's `setQueryData` and optimistic UI patterns for cell edits, row deletions, and drag-and-drop reordering.
* **Production-Ready Testing:** Comprehensive unit testing (Vitest) and end-to-end browser testing (Playwright), all automated through a GitHub Actions CI/CD pipeline.

---

## 🛠️ Tech Stack & Architecture

| Category | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React, Tailwind CSS v4 |
| **Data Grid** | TanStack Table v8, TanStack Virtual v3, DnD Kit |
| **Backend** | tRPC v11, React Query v5 |
| **Database** | PostgreSQL 15+, Prisma v7 |
| **Sorting Engine** | LexoRank (for efficient Row/Column Drag-and-Drop) |
| **Quality Assurance** | Vitest, Playwright, GitHub Actions, ESLint |



---

## 🏗️ Core System Architecture

### 1. The JSONB-on-Row Pattern
Traditional relational databases struggle with user-defined columns. To solve this, each `Row` record contains a `cells` JSONB column storing key-value pairs (`{ "columnId": value }`). Prisma's `Json` type maps directly to Postgres JSONB, enabling dynamic schema evolution while maintaining full-text searchability via `pg_trgm` GIN indexes.

### 2. High-Fidelity Virtualization & State
TanStack Virtual renders only the visible DOM nodes. A custom `pageStore` reference tracks fetched pages, seamlessly merging them into a flat array per render cycle. This allows immediate rendering of cached rows while adjacent cursor-paginated pages (fetched in blocks of 50) load in the background.

### 3. LexoRank Ordering Algorithm
Instead of recalculating integer-based index fields across thousands of rows during a drag-and-drop operation, this app implements **LexoRank**. Moving a row or column simply generates a new lexicographical string between the surrounding items, requiring only a single `O(1)` database update.

### 4. Advanced View Management
Users can create multiple personalized "Views" of the same table. View configurations (hidden columns, nested AND/OR filters, multi-column sorts, and frozen column limits) are stored as JSON and executed as highly optimized raw SQL queries using Postgres JSONB operators (`->>`, `@>`).

---

## 🚀 Features

* **Dynamic Workspaces:** Create Bases, Tables, and typed Columns (Text, Number).
* **Keyboard-First Navigation:** Excel-like cell editing and traversal using Arrows, Tab, Enter, and Escape.
* **Drag-and-Drop Everything:** Reorder columns, rows, and views effortlessly.
* **Performance Analytics:** Built-in real-time developer panel showing raw SQL query execution times per operation.
* **Faker.js Integration:** Bulk-seed up to 100k rows instantly to stress-test the UI.
* **Authentication:** Secure Discord OAuth flow powered by NextAuth v5.

---

## 🚦 Local Development Setup

### Prerequisites
* Node.js 20+
* `pnpm` package manager
* PostgreSQL 15+ (Local or Hosted via Neon)

### Quick Start

1. **Clone & Install**
   ```bash
   git clone [https://github.com/yourusername/airtable-clone.git](https://github.com/yourusername/airtable-clone.git)
   cd airtable-clone
   pnpm install