import { getBaseColor } from "./base-icon-utils";

const STORAGE_KEY = "baseColors";

type BaseColorMap = Record<string, string>;

export function getStoredBaseColor(baseId: string): string {
  if (typeof window === "undefined") return getBaseColor(baseId);

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getBaseColor(baseId);

    const colorMap = JSON.parse(stored) as BaseColorMap;
    return colorMap[baseId] ?? getBaseColor(baseId);
  } catch {
    return getBaseColor(baseId);
  }
}

export function setStoredBaseColor(baseId: string, color: string): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const colorMap: BaseColorMap = stored ? (JSON.parse(stored) as BaseColorMap) : {};
    colorMap[baseId] = color;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colorMap));
  } catch {
    // Silently fail if localStorage is not available
  }
}
