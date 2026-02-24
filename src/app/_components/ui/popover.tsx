// src/app/_components/ui/popover.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

interface PopoverProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  zIndex?: number;
  overlayZIndex?: number;
  overlayStyle?: React.CSSProperties;
  anchorEl?: HTMLElement | null; // Triggers fixed collision-aware positioning
  dependency?: unknown; // Re-run positioning if content changes size (e.g. searching)
}

export function Popover({
  onClose,
  children,
  className = "",
  align = "left",
  zIndex = 50,
  overlayZIndex = 40,
  overlayStyle,
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
    <>
      <div
        role="presentation"
        className="fixed inset-0"
        style={{ zIndex: overlayZIndex, ...overlayStyle }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
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
    </>
  );
}
