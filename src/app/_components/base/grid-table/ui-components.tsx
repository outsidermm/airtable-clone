/**
 * UI Components for grid table
 * Reusable UI elements like drag handles and highlighted text
 */

import React from "react";

/**
 * Drag handle SVG icon for reordering rows
 */
export function DragHandle({
  className,
  ...props
}: { className?: string } & React.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      className={className ?? "h-3 w-3 cursor-grab text-gray-300"}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

/**
 * Component for highlighting search query matches in text
 */
export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-400 font-medium">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}
