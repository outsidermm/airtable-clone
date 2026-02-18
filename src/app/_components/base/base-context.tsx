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