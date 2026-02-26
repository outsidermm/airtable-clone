"use client";

import React, { useEffect, useRef, useState } from "react";

interface PopoverProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  zIndex?: number;
  overlayZIndex?: number; // Kept for backwards compatibility
  overlayStyle?: React.CSSProperties; // Kept for backwards compatibility
  anchorEl?: HTMLElement | null; // Triggers fixed collision-aware positioning
  dependency?: unknown; // Re-run positioning if content changes size (e.g. searching)
}

export function Popover({
  onClose,
  children,
  className = "",
  align = "left",
  zIndex = 50,
  anchorEl,
  dependency,
}: PopoverProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Handle Click Outside (Replaces the blocking invisible overlay)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        document.contains(e.target as Node) // Ensure target wasn't just unmounted
      ) {
        onClose();
      }
    };

    // Delay attachment by 1 tick to avoid immediately capturing the click that opened the popover
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("touchend", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("touchend", handleClickOutside);
    };
  }, [onClose]);

  // Handle Anchor Math & Screen Collision
  useEffect(() => {
    if (anchorEl && modalRef.current) {
      const rect = anchorEl.getBoundingClientRect();
      const modalWidth = modalRef.current.offsetWidth || 300;
      const modalHeight = modalRef.current.offsetHeight || 300;
      const padding = 8;

      let top = rect.bottom + 4;
      let left = align === "left" ? rect.left : rect.right - modalWidth;

      // Screen edge collision detection
      if (left + modalWidth > window.innerWidth - padding) {
        left = window.innerWidth - modalWidth - padding;
      }
      if (left < padding) left = padding;
      if (top + modalHeight > window.innerHeight - padding) {
        top = rect.top - modalHeight - 4; // pop upwards if clipping bottom
      }

      setPosition({ top, left });
    }
  }, [anchorEl, align, dependency]); // Re-run if a dependency like search changes height

  const isFixed = !!anchorEl;

  return (
    <div
      ref={modalRef}
      className={`${isFixed ? "fixed" : "absolute top-full mt-1"} rounded-lg border border-gray-200 bg-white shadow-xl ${
        !isFixed && align === "right" ? "right-0" : ""
      } ${!isFixed && align === "left" ? "left-0" : ""} ${className}`}
      style={{
        zIndex,
        ...(position ?? {}),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
