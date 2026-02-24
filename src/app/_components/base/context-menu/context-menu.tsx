"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { useBase } from "../base-context";

interface ContextMenuProps {
  children: React.ReactNode;
}

export function ContextMenu({ children }: ContextMenuProps) {
  const { contextMenu, setContextMenu } = useBase();
  const menuRef = useRef<HTMLDivElement>(null);
  const position = contextMenu?.position;

  const [style, setStyle] = useState<React.CSSProperties>({
    opacity: 0,
    pointerEvents: "none",
    top: position?.y ?? 0,
    left: position?.x ?? 0,
  });

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

  useLayoutEffect(() => {
    if (!position || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const padding = 16; // Minimum space from window edges

    let newTop = position.y;
    let newLeft = position.x;

    // Adjust if it goes out of the bottom bound
    if (newTop + rect.height > window.innerHeight - padding) {
      newTop = position.y - rect.height;
    }

    // Adjust if it goes out of the right bound
    if (newLeft + rect.width > window.innerWidth - padding) {
      newLeft = window.innerWidth - rect.width - padding;
    }

    // Final safety boundary checks to ensure it doesn't go off the top or left edges
    newTop = Math.max(padding, newTop);
    newLeft = Math.max(padding, newLeft);

    setStyle({
      top: newTop,
      left: newLeft,
      opacity: 1,
      pointerEvents: "auto",
    });
  }, [position]);

  if (!position) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-60 min-w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
