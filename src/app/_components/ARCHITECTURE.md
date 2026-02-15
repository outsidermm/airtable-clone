# Frontend Architecture

## Directory Structure

```
src/app/_components/
├── base/                 # Base (workspace) view components
│   ├── grid-table/      # Modular grid table implementation
│   ├── context-menu/    # Context menu components
│   ├── toolbar/         # Toolbar components (filters, sort, search)
│   └── hooks/           # Custom hooks for mutations
├── dashboard/           # Dashboard view components
├── marketing/           # Public marketing pages
└── ui/                  # Shared UI components

src/server/
├── api/
│   ├── routers/        # tRPC route handlers
│   └── utils/          # Server-side utilities
└── auth/               # Authentication configuration
```

## Component Organization

### ✅ Well-Organized Areas

1. **Context Menus** (`base/context-menu/`)
   - Separated by entity type (cell, column, row)
   - Shared base component

2. **Toolbar Components** (`base/toolbar/`)
   - Each dropdown in its own file
   - Clear separation of concerns

3. **Hooks** (`base/hooks/`)
   - Mutation hooks separated by entity
   - Reusable across components

4. **Marketing Pages** (`marketing/`)
   - Each section in its own file
   - Composable and maintainable

### ⚠️ Areas for Improvement

1. **Grid Table** (grid-table.tsx)
   - ✅ **COMPLETED**: Extracted constants, types, utilities
   - ✅ **COMPLETED**: Using centralized icon components
   - ✅ **COMPLETED**: Removed duplicate inline SVG definitions
   - 🔄 **TODO**: Extract SortableRow component
   - 🔄 **TODO**: Extract keyboard navigation hooks
   - 🔄 **TODO**: Extract header cell components

2. **Base Header** (base-header.tsx - 1273 lines)
   - 🔄 Contains too many responsibilities
   - 🔄 Should extract view controls
   - 🔄 Should extract share/collaboration UI

3. **Base Toolbar** (base-toolbar.tsx - 809 lines)
   - 🔄 Extract each tool into separate components
   - 🔄 Create toolbar context for shared state

4. **Base Content** (base-content.tsx - 635 lines)
   - 🔄 Extract data fetching logic
   - 🔄 Separate layout from business logic

5. **View Sidebar** (view-sidebar.tsx - 601 lines)
   - 🔄 Extract view item component
   - 🔄 Extract view creation form

## Best Practices Applied

### Component Modularity
- Small, focused components (< 300 lines ideal)
- Single responsibility principle
- Composable and reusable

### Type Safety
- Comprehensive TypeScript types
- Shared type definitions in dedicated files
- Proper prop typing

### Performance
- Memoization with useMemo/useCallback
- Virtual scrolling for large lists
- Debounced updates (300ms)

### Code Organization
- Related components grouped in directories
- Custom hooks in dedicated `/hooks` folders
- Utilities separated from components
- Constants in dedicated files

## Recent Improvements

1. **Centralized Icon Library** ✅
   - Created `src/components/icons/index.tsx`
   - Added 20+ common SVG icons
   - Updated grid-table and toast components to use centralized icons
   - Reduces code duplication and ensures consistency

2. **Grid Table Modularization** ✅
   - Extracted to `grid-table/` directory with constants, types, utilities
   - Removed duplicate code
   - Updated imports and maintained backward compatibility

## Recommended Next Steps

1. **Continue Icon Migration**
   - Update remaining components to use centralized icons
   - Extract more icons as needed from dashboard components
   - Remove inline SVG definitions

2. **Complete Grid Table Refactoring**
   - Extract SortableRow to grid-table/sortable-row.tsx
   - Extract header cells to grid-table/header-cell.tsx
   - Create useKeyboardNavigation hook

3. **Refactor Base Header**
   - Extract view dropdown to view-controls.tsx
   - Extract share button to share-button.tsx
   - Reduce main file to < 400 lines

4. **Improve Toolbar**
   - Create toolbar context
   - Extract each tool button
   - Simplify main toolbar file

5. **Add Component Documentation**
   - JSDoc comments for all public components
   - README files for complex modules
   - Usage examples in comments

6. **Create Shared UI Library**
   - Extract common patterns (buttons, dropdowns, modals)
   - Create consistent design system
   - Centralize styling utilities
