# Grid Table Component

High-performance virtualized grid table component for displaying and editing large datasets (1M+ rows).

## Architecture

### Core Components
- **grid-table.tsx** - Main GridTable component with virtualization
- **sortable-row.tsx** - Individual row component with drag-and-drop

### Utilities & Hooks
- **constants.ts** - Layout dimensions and row height mappings
- **types.ts** - TypeScript type definitions
- **ui-components.tsx** - Reusable UI elements (DragHandle, HighlightedText)
- **use-cell-tooltips.ts** - Hook for managing cell-level tooltips

## Features

- ✅ Virtual scrolling with TanStack Virtual (10+ overscan)
- ✅ Fixed row heights for performance
- ✅ Cursor-based pagination
- ✅ Frozen primary column
- ✅ Column resizing and reordering
- ✅ Row selection and multi-select
- ✅ Keyboard navigation (arrows, tab, enter)
- ✅ Cell editing with double-click or Enter key
- ✅ Search highlighting
- ✅ Context menus for rows, columns, and cells
- ✅ Cell-level validation tooltips

## Usage

```tsx
import { GridTable } from "./_components/base/grid-table";

<GridTable
  columns={columns}
  rows={rows}
  onCellUpdate={handleCellUpdate}
  onAddRow={handleAddRow}
  onDeleteRow={handleDeleteRow}
  // ... other props
/>
```

## Performance Targets

- Scroll at 60 FPS with 100k rows
- Page fetch < 200ms for 50 rows
- Search < 300ms with GIN index on 1M rows
- Browser memory < 500MB with 1M rows loaded
