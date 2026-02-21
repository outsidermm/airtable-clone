"use client";

import React from "react";
import { useBase } from "../base/base-context";

interface MenuContainerProps {
  children: React.ReactNode;
  position?: { top: number; left: number };
  width?: string | number; // e.g., 'w-64' or 256
  onClose: () => void;
  className?: string;
}

/**
 * Wrapper for all menus (Context menus, Dropdowns, etc.)
 */
export function MenuContainer({
  children,
  position,
  width = "w-64",
  onClose,
  className = "",
}: MenuContainerProps) {
  const style = position ? { top: position.top, left: position.left } : {};

  return (
    <>
      {/* Universal Backdrop */}
      <div
        className="fixed inset-0 z-40 h-full w-full bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      {/* The Menu Panel */}
      <div
        className={`fixed z-50 overflow-hidden rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl ${
          typeof width === "string" ? width : ""
        } ${className}`}
        style={{
          ...style,
          width: typeof width === "number" ? width : undefined,
        }}
      >
        {children}
      </div>
    </>
  );
}

interface MenuItemProps {
  label: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode; // For "Beta" tags, "Team" badges, or Chevron
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MenuItem({
  label,
  icon,
  rightElement,
  onClick,
  danger,
  disabled,
  className = "",
}: MenuItemProps) {
  const { setContextMenu } = useBase();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (onClick) onClick();
    setContextMenu(null); // Close context menus on click
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`group flex w-full items-center justify-between text-xs px-3 py-1.5 transition-all hover:bg-gray-100 ${
        disabled
          ? "cursor-not-allowed text-gray-300"
          : danger
            ? "text-red-700"
            : "text-gray-700"
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        {icon && (
          <span className={`h-4 w-4 shrink-0 ${disabled ? "opacity-30" : ""}`}>
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </div>

      {rightElement && (
        <div className="ml-2 flex shrink-0 items-center">{rightElement}</div>
      )}
    </button>
  );
}

export function MenuSectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-2 mb-1 px-2 text-[11px] tracking-wider text-gray-500 first:mt-1">
      {label}
    </div>
  );
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-gray-100" />;
}

/**
 * Reusable Badge for "Beta", "Team", etc.
 */
export function MenuBadge({
  children,
  variant = "blue",
}: {
  children: React.ReactNode;
  variant?: "blue" | "yellow" | "gray";
}) {
  const variants = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`flex items-center gap-1 rounded-xl border px-1.5 py-0.5 text-[10px] font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
