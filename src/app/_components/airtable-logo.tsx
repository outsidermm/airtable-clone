import React from "react";

interface AirtableLogoProps {
  className?: string;
  showText?: boolean;
}

export function AirtableLogo({
  className = "",
  showText = true,
}: AirtableLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Airtable Icon */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Yellow cube */}
        <path
          d="M100 30 L140 50 L140 90 L100 110 L60 90 L60 50 Z"
          fill="#FCB400"
        />
        {/* Cyan base */}
        <path
          d="M60 90 L100 110 L100 150 L60 130 Z"
          fill="#18BFFF"
        />
        {/* Red flag */}
        <path
          d="M100 110 L140 90 L140 130 L100 150 Z"
          fill="#F82B60"
        />
      </svg>

      {/* Airtable Text */}
      {showText && (
        <span className="text-2xl font-semibold tracking-tight text-gray-900">
          Airtable
        </span>
      )}
    </div>
  );
}
