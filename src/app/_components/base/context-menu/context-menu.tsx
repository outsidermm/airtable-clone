"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface ContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
}

export function ContextMenu({ position, onClose, children }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  // Adjust position to keep menu within viewport
  const style = {
    top: position.y,
    left: position.x,
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}

interface MenuItemProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

export function MenuItem({
  label,
  onClick,
  icon,
  danger,
  disabled,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm ${
        disabled
          ? "cursor-not-allowed text-gray-300"
          : danger
            ? "text-red-600 hover:bg-red-50"
            : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {icon && <span className="h-4 w-4">{icon}</span>}
      {label}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-gray-100" />;
}
