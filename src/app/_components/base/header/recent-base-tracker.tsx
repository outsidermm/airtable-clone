"use client";

import { useEffect } from "react";

interface RecentBase {
  id: string;
  name: string;
  timestamp: number;
}

interface RecentBaseTrackerProps {
  baseId: string;
  baseName: string;
}

export function RecentBaseTracker({ baseId, baseName }: RecentBaseTrackerProps) {
  useEffect(() => {
    // Load existing recent bases
    const stored = localStorage.getItem("recentBases");
    let recentBases: RecentBase[] = [];

    if (stored) {
      try {
        recentBases = JSON.parse(stored) as RecentBase[];
      } catch {
        recentBases = [];
      }
    }

    // Remove existing entry for this base (if any)
    recentBases = recentBases.filter((base) => base.id !== baseId);

    // Add current base at the beginning
    recentBases.unshift({
      id: baseId,
      name: baseName,
      timestamp: Date.now(),
    });

    // Keep only last 5 bases
    recentBases = recentBases.slice(0, 5);

    // Save back to localStorage
    localStorage.setItem("recentBases", JSON.stringify(recentBases));
  }, [baseId, baseName]);

  return null;
}
