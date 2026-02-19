"use client";

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react";
import type { ContextMenuState } from "~/types/grid";

// Define the types of modals that can be opened globally
type BaseModalType = "add-table" | "add-column" | "set-primary" | null;

interface BaseContextType {
  // Navigation State
  activeTableId: number;
  setActiveTableId: (id: number) => void;
  activeViewId: number | null;
  setActiveViewId: (id: number | null) => void;

  // Sidebar UI State
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarPersistent: boolean;
  setIsSidebarPersistent: (persistent: boolean) => void;

  // Global Interaction & Modals
  activeModal: BaseModalType;
  openModal: (type: BaseModalType, anchor?: HTMLElement | null) => void;
  modalAnchor: HTMLElement | null;

  // Search & Highlight State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  highlightedCells: Map<number, Set<number>>;
  setHighlightedCells: (cells: Map<number, Set<number>>) => void;
  activeSearchCell: { rowId: number; columnId: number } | undefined;
  setActiveSearchCell: (cell: { rowId: number; columnId: number } | undefined) => void;

  contextMenu: ContextMenuState | null;
  setContextMenu: (menu: ContextMenuState | null) => void;

  // Page store refresh — registered by base-content, called by mutation hooks
  refetchRows: () => void;
  registerRefetchRows: (fn: () => void) => void;

  // Optimistic row operations — registered by base-content
  optimisticAddRow: () => { tempId: number; revert: () => void };
  optimisticDeleteRow: (rowId: number) => { revert: () => void };
  registerOptimisticAddRow: (fn: () => { tempId: number; revert: () => void }) => void;
  registerOptimisticDeleteRow: (fn: (rowId: number) => { revert: () => void }) => void;

  // Called by createRow.onSuccess to swap temp ID → real ID and flush pending edits
  onRowCreated: (tempId: number, realRowId: number) => void;
  registerOnRowCreated: (fn: (tempId: number, realRowId: number) => void) => void;

  // Notifies grid-table to update its stable key map and selection state on row ID swap
  notifyRowIdSwap: (tempId: number, realId: number) => void;
  registerRowIdSwapListener: (fn: (tempId: number, realId: number) => void) => void;

  // Column parallel: flush buffered cell edits when a temp column gets its real ID
  onColumnCreated: (tempColId: number, realColId: number) => void;
  registerOnColumnCreated: (fn: (tempColId: number, realColId: number) => void) => void;

  // Notifies grid-table to update stable column key map + selection state on column ID swap
  notifyColumnIdSwap: (tempId: number, realId: number) => void;
  registerColumnIdSwapListener: (fn: (tempId: number, realId: number) => void) => void;
}

const BaseContext = createContext<BaseContextType | undefined>(undefined);

export function BaseProvider({ 
  children, 
  initialTableId 
}: { 
  children: ReactNode; 
  initialTableId: number;
}) {
  // Navigation
  const [activeTableId, setActiveTableId] = useState(initialTableId);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  // Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPersistent, setIsSidebarPersistent] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState<BaseModalType>(null);
  const [modalAnchor, setModalAnchor] = useState<HTMLElement | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedCells, setHighlightedCells] = useState<Map<number, Set<number>>>(new Map());
  const [activeSearchCell, setActiveSearchCell] = useState<{ rowId: number; columnId: number } | undefined>(undefined);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Stable ref to whichever refetchRows implementation base-content registers
  const refetchRowsFnRef = useRef<() => void>(() => { /* no-op until base-content registers */ });
  const refetchRows = useCallback(() => { refetchRowsFnRef.current(); }, []);
  const registerRefetchRows = useCallback((fn: () => void) => {
    refetchRowsFnRef.current = fn;
  }, []);

  // Optimistic row operation refs — registered by base-content
  const optimisticAddRowFnRef = useRef<() => { tempId: number; revert: () => void }>(
    () => ({ tempId: -1, revert: () => undefined })
  );
  const optimisticDeleteRowFnRef = useRef<(rowId: number) => { revert: () => void }>(
    () => ({ revert: () => undefined })
  );
  const optimisticAddRow = useCallback(() => optimisticAddRowFnRef.current(), []);
  const optimisticDeleteRow = useCallback((rowId: number) => optimisticDeleteRowFnRef.current(rowId), []);
  const registerOptimisticAddRow = useCallback(
    (fn: () => { tempId: number; revert: () => void }) => { optimisticAddRowFnRef.current = fn; },
    [],
  );
  const registerOptimisticDeleteRow = useCallback(
    (fn: (rowId: number) => { revert: () => void }) => { optimisticDeleteRowFnRef.current = fn; },
    [],
  );

  // onRowCreated — called when createRow.onSuccess fires, swaps tempId → realId in page store
  const onRowCreatedFnRef = useRef<(tempId: number, realRowId: number) => void>(() => undefined);
  const onRowCreated = useCallback(
    (tempId: number, realRowId: number) => { onRowCreatedFnRef.current(tempId, realRowId); },
    [],
  );
  const registerOnRowCreated = useCallback(
    (fn: (tempId: number, realRowId: number) => void) => { onRowCreatedFnRef.current = fn; },
    [],
  );

  // notifyRowIdSwap — tells grid-table to update stable keys + selection state
  const rowIdSwapListenerRef = useRef<(tempId: number, realId: number) => void>(() => undefined);
  const notifyRowIdSwap = useCallback(
    (tempId: number, realId: number) => { rowIdSwapListenerRef.current(tempId, realId); },
    [],
  );
  const registerRowIdSwapListener = useCallback(
    (fn: (tempId: number, realId: number) => void) => { rowIdSwapListenerRef.current = fn; },
    [],
  );

  // onColumnCreated — flush buffered cell edits when a temp column gets its real ID
  const onColumnCreatedFnRef = useRef<(tempColId: number, realColId: number) => void>(() => undefined);
  const onColumnCreated = useCallback(
    (tempColId: number, realColId: number) => { onColumnCreatedFnRef.current(tempColId, realColId); },
    [],
  );
  const registerOnColumnCreated = useCallback(
    (fn: (tempColId: number, realColId: number) => void) => { onColumnCreatedFnRef.current = fn; },
    [],
  );

  // notifyColumnIdSwap — tells grid-table to update stable column keys + selection state
  const columnIdSwapListenerRef = useRef<(tempId: number, realId: number) => void>(() => undefined);
  const notifyColumnIdSwap = useCallback(
    (tempId: number, realId: number) => { columnIdSwapListenerRef.current(tempId, realId); },
    [],
  );
  const registerColumnIdSwapListener = useCallback(
    (fn: (tempId: number, realId: number) => void) => { columnIdSwapListenerRef.current = fn; },
    [],
  );

  // Helper to open modals with an optional anchor (for positioning)
  const openModal = (type: BaseModalType, anchor: HTMLElement | null = null) => {
    setActiveModal(type);
    setModalAnchor(anchor);
  };

  return (
    <BaseContext.Provider value={{ 
      activeTableId, 
      setActiveTableId, 
      activeViewId, 
      setActiveViewId, 
      isSidebarOpen, 
      setIsSidebarOpen,
      isSidebarPersistent,
      setIsSidebarPersistent,
      activeModal,
      openModal,
      modalAnchor,
      searchQuery,
      setSearchQuery,
      highlightedCells,
      setHighlightedCells,
      activeSearchCell,
      setActiveSearchCell,
      contextMenu,
      setContextMenu,
      refetchRows,
      registerRefetchRows,
      optimisticAddRow,
      optimisticDeleteRow,
      registerOptimisticAddRow,
      registerOptimisticDeleteRow,
      onRowCreated,
      registerOnRowCreated,
      notifyRowIdSwap,
      registerRowIdSwapListener,
      onColumnCreated,
      registerOnColumnCreated,
      notifyColumnIdSwap,
      registerColumnIdSwapListener,
    }}>
      {children}
    </BaseContext.Provider>
  );
}

export const useBase = () => {
  const context = useContext(BaseContext);
  if (!context) throw new Error("useBase must be used within a BaseProvider");
  return context;
};