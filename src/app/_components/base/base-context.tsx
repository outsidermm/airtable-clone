"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface BaseContextType {
  activeTableId: number;
  setActiveTableId: (id: number) => void;
  activeViewId: number | null;
  setActiveViewId: (id: number | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

const BaseContext = createContext<BaseContextType | undefined>(undefined);

export function BaseProvider({ children, initialTableId }: { children: ReactNode; initialTableId: number }) {
  const [activeTableId, setActiveTableId] = useState(initialTableId);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <BaseContext.Provider value={{ 
      activeTableId, setActiveTableId, 
      activeViewId, setActiveViewId, 
      isSidebarOpen, setIsSidebarOpen 
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