"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useBase } from "../base-context";

interface ContextMenuProps {
  children: React.ReactNode;
}

export function ContextMenu({ children }: ContextMenuProps) {
  const { contextMenu, setContextMenu } = useBase();
  const menuRef = useRef<HTMLDivElement>(null);
  const position = contextMenu?.position;

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    },
    [setContextMenu],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    },
    [setContextMenu],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  if (!position) return null;

  // Adjust position to keep menu within viewport
  const style = {
    top: position.y,
    left: position.x,
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
