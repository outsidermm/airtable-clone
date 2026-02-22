import { useCallback, useRef } from "react";
import { useBase } from "../base-context";

export function useSidebarHover() {
  const { setIsSidebarOpen, isSidebarPersistent, setIsSidebarPersistent } =
    useBase();
  const sidebarHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSidebarHoverEnter = useCallback(() => {
    if (sidebarHoverTimeoutRef.current) {
      clearTimeout(sidebarHoverTimeoutRef.current);
      sidebarHoverTimeoutRef.current = null;
    }
    if (!isSidebarPersistent) {
      setIsSidebarOpen(true);
    }
  }, [isSidebarPersistent, setIsSidebarOpen]);

  const handleSidebarHoverLeave = useCallback(() => {
    if (!isSidebarPersistent) {
      sidebarHoverTimeoutRef.current = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 300);
    }
  }, [isSidebarPersistent, setIsSidebarOpen]);

  const handleToggleSidebar = useCallback(() => {
    if (sidebarHoverTimeoutRef.current) {
      clearTimeout(sidebarHoverTimeoutRef.current);
      sidebarHoverTimeoutRef.current = null;
    }

    if (isSidebarPersistent) {
      setIsSidebarPersistent(false);
      setIsSidebarOpen(false);
    } else {
      setIsSidebarPersistent(true);
      setIsSidebarOpen(true);
    }
  }, [isSidebarPersistent, setIsSidebarPersistent, setIsSidebarOpen]);
  return {
    handleSidebarHoverEnter,
    handleSidebarHoverLeave,
    handleToggleSidebar,
  };
}
