"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { DashboardTopBar } from "./dashboard-top-bar";
import { SearchModal } from "./search-modal";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  currentPage?: "home" | "starred" | "shared";
}

export function DashboardLayout({
  children,
  user,
  currentPage,
}: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarPersistent, setIsSidebarPersistent] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cmd+K / Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sidebar hover handlers
  const handleSidebarHoverEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Only expand on hover if collapsed and not in persistent mode
    if (isSidebarCollapsed && !isSidebarPersistent) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsSidebarCollapsed(false);
      }, 300);
    }
  }, [isSidebarCollapsed, isSidebarPersistent]);

  const handleSidebarHoverLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Only collapse on hover leave if not in persistent mode
    if (!isSidebarPersistent) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsSidebarCollapsed(true);
      }, 300);
    }
  }, [isSidebarPersistent]);

  const handleToggleSidebar = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (isSidebarPersistent) {
      // Currently persistent - exit persistent mode and collapse
      setIsSidebarPersistent(false);
      setIsSidebarCollapsed(true);
    } else {
      // Not persistent - enter persistent mode and ensure expanded
      setIsSidebarPersistent(true);
      setIsSidebarCollapsed(false);
    }
  }, [isSidebarPersistent]);

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-white">
      {/* Top Bar */}
      <DashboardTopBar
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onSearchClick={() => setIsSearchModalOpen(true)}
      />
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentPage={currentPage}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onHoverEnter={handleSidebarHoverEnter}
          onHoverLeave={handleSidebarHoverLeave}
        />
        {/* Page Content */}
        {children}
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
}
