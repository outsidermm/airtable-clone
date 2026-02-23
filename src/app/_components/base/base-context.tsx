"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { ContextMenuState } from "~/types/grid";

// Define the types of modals that can be opened globally
type BaseModalType = "add-table" | "add-column" | "edit-column" | "set-primary" | null;

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

  // Column Insertion & Edit State
  insertAfterColumnId: number | null;
  setInsertAfterColumnId: (id: number | null) => void;
  insertBeforeColumnId: number | null;
  setInsertBeforeColumnId: (id: number | null) => void;
  editingColumnId: number | null;
  setEditingColumnId: (id: number | null) => void;

  // Table Rename State
  renamingTableId: number | null;
  setRenamingTableId: (id: number | null) => void;

  // Search & Highlight State
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  contextMenu: ContextMenuState | null;
  setContextMenu: (menu: ContextMenuState | null) => void;

  // Page store refresh
  refetchRows: () => void;
  registerRefetchRows: (fn: () => void) => void;

  // Optimistic row operations
  optimisticAddRow: () => { tempId: number; revert: () => void };
  optimisticDeleteRow: (rowId: number) => { revert: () => void };
  optimisticInsertRowNear: (
    tableId: number,
    beforeRowId?: number | null,
    afterRowId?: number | null,
  ) => { tempId: number; revert: () => void };
  registerOptimisticAddRow: (
    fn: () => { tempId: number; revert: () => void },
  ) => void;
  registerOptimisticDeleteRow: (
    fn: (rowId: number) => { revert: () => void },
  ) => void;
  registerOptimisticInsertRowNear: (
    fn: (
      tableId: number,
      beforeRowId?: number | null,
      afterRowId?: number | null,
    ) => { tempId: number; revert: () => void },
  ) => void;

  // Handlers
  onRowCreated: (
    tempId: number,
    realRowId: number,
    cells?: Record<string, string | number | null>,
  ) => void;
  registerOnRowCreated: (
    fn: (
      tempId: number,
      realRowId: number,
      cells?: Record<string, string | number | null>,
    ) => void,
  ) => void;

  notifyRowIdSwap: (tempId: number, realId: number) => void;
  registerRowIdSwapListener: (
    fn: (tempId: number, realId: number) => void,
  ) => void;

  onColumnCreated: (tempColId: number, realColId: number) => void;
  registerOnColumnCreated: (
    fn: (tempColId: number, realColId: number) => void,
  ) => void;

  notifyColumnIdSwap: (tempId: number, realId: number) => void;
  registerColumnIdSwapListener: (
    fn: (tempId: number, realId: number) => void,
  ) => void;
}

const BaseContext = createContext<BaseContextType | undefined>(undefined);

export function BaseProvider({
  children,
  initialTableId,
  baseId,
}: {
  children: ReactNode;
  initialTableId: number;
  baseId: string;
}) {
  const router = useRouter();

  // Navigation
  const [activeTableId, setActiveTableIdState] = useState(initialTableId);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  const setActiveTableId = useCallback(
    (id: number) => {
      setActiveTableIdState(id);
      router.replace(`/base/${baseId}?tableId=${id}`, { scroll: false });
    },
    [baseId, router],
  );

  // Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPersistent, setIsSidebarPersistent] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState<BaseModalType>(null);
  const [modalAnchor, setModalAnchor] = useState<HTMLElement | null>(null);
  const [insertAfterColumnId, setInsertAfterColumnId] = useState<number | null>(null);
  const [insertBeforeColumnId, setInsertBeforeColumnId] = useState<number | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [renamingTableId, setRenamingTableId] = useState<number | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const refetchRowsFnRef = useRef<() => void>(() => {
    // hello
  });
  const refetchRows = useCallback(() => refetchRowsFnRef.current(), []);
  const registerRefetchRows = useCallback((fn: () => void) => { refetchRowsFnRef.current = fn; }, []);

  const optimisticAddRowFnRef = useRef<() => { tempId: number; revert: () => void }>(() => ({ tempId: -1, revert: () => undefined }));
  const optimisticDeleteRowFnRef = useRef<(rowId: number) => { revert: () => void }>(() => ({ revert: () => undefined }));
  const optimisticAddRow = useCallback(() => optimisticAddRowFnRef.current(), []);
  const optimisticDeleteRow = useCallback((rowId: number) => optimisticDeleteRowFnRef.current(rowId), []);

  const optimisticInsertRowNearFnRef = useRef<(tableId: number, beforeRowId?: number | null, afterRowId?: number | null) => { tempId: number; revert: () => void }>(() => ({ tempId: -1, revert: () => undefined }));
  const optimisticInsertRowNear = useCallback((tableId: number, beforeRowId?: number | null, afterRowId?: number | null) => optimisticInsertRowNearFnRef.current(tableId, beforeRowId, afterRowId), []);
  const registerOptimisticInsertRowNear = useCallback((fn: (tableId: number, beforeRowId?: number | null, afterRowId?: number | null) => { tempId: number; revert: () => void }) => { optimisticInsertRowNearFnRef.current = fn; }, []);

  const registerOptimisticAddRow = useCallback((fn: () => { tempId: number; revert: () => void }) => { optimisticAddRowFnRef.current = fn; }, []);
  const registerOptimisticDeleteRow = useCallback((fn: (rowId: number) => { revert: () => void }) => { optimisticDeleteRowFnRef.current = fn; }, []);

  const onRowCreatedFnRef = useRef<(tempId: number, realRowId: number, cells?: Record<string, string | number | null>) => void>(() => undefined);
  const onRowCreated = useCallback((tempId: number, realRowId: number, cells?: Record<string, string | number | null>) => { onRowCreatedFnRef.current(tempId, realRowId, cells); }, []);
  const registerOnRowCreated = useCallback((fn: (tempId: number, realRowId: number, cells?: Record<string, string | number | null>) => void) => { onRowCreatedFnRef.current = fn; }, []);

  const rowIdSwapListenerRef = useRef<(tempId: number, realId: number) => void>(() => undefined);
  const notifyRowIdSwap = useCallback((tempId: number, realId: number) => { rowIdSwapListenerRef.current(tempId, realId); }, []);
  const registerRowIdSwapListener = useCallback((fn: (tempId: number, realId: number) => void) => { rowIdSwapListenerRef.current = fn; }, []);

  const onColumnCreatedFnRef = useRef<(tempColId: number, realColId: number) => void>(() => undefined);
  const onColumnCreated = useCallback((tempColId: number, realColId: number) => { onColumnCreatedFnRef.current(tempColId, realColId); }, []);
  const registerOnColumnCreated = useCallback((fn: (tempColId: number, realColId: number) => void) => { onColumnCreatedFnRef.current = fn; }, []);

  const columnIdSwapListenerRef = useRef<(tempId: number, realId: number) => void>(() => undefined);
  const notifyColumnIdSwap = useCallback((tempId: number, realId: number) => { columnIdSwapListenerRef.current(tempId, realId); }, []);
  const registerColumnIdSwapListener = useCallback((fn: (tempId: number, realId: number) => void) => { columnIdSwapListenerRef.current = fn; }, []);

  const openModal = (type: BaseModalType, anchor: HTMLElement | null = null) => {
    if (type !== "add-column" && type !== "edit-column") {
      setInsertAfterColumnId(null);
      setInsertBeforeColumnId(null);
    }
    if (type !== "edit-column") {
      setEditingColumnId(null);
    }
    setActiveModal(type);
    setModalAnchor(anchor);
  };

  return (
    <BaseContext.Provider
      value={{
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
        insertAfterColumnId,
        setInsertAfterColumnId,
        insertBeforeColumnId,
        setInsertBeforeColumnId,
        editingColumnId,
        setEditingColumnId,
        renamingTableId,
        setRenamingTableId,
        searchQuery,
        setSearchQuery,
        contextMenu,
        setContextMenu,
        refetchRows,
        registerRefetchRows,
        optimisticAddRow,
        optimisticDeleteRow,
        optimisticInsertRowNear,
        registerOptimisticAddRow,
        registerOptimisticDeleteRow,
        registerOptimisticInsertRowNear,
        onRowCreated,
        registerOnRowCreated,
        notifyRowIdSwap,
        registerRowIdSwapListener,
        onColumnCreated,
        registerOnColumnCreated,
        notifyColumnIdSwap,
        registerColumnIdSwapListener,
      }}
    >
      {children}
    </BaseContext.Provider>
  );
}

export const useBase = () => {
  const context = useContext(BaseContext);
  if (!context) throw new Error("useBase must be used within a BaseProvider");
  return context;
};