"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface AddTableModalProps {
  onConfirm: () => void;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

export function AddTableModal({
  onConfirm,
  onClose,
  anchorEl,
}: AddTableModalProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [anchorEl]);

  const handleConfirm = () => {
    onConfirm();
  };

  const isDropdown = !!anchorEl && !!position;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        style={{ background: isDropdown ? "transparent" : "rgba(0,0,0,0.5)" }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-xl ${
          isDropdown
            ? "fixed"
            : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
        style={
          isDropdown ? { top: position.top, left: position.left } : undefined
        }
      >
        <div className="px-4 py-4">
          <p className="mb-1 px-2 text-xs text-gray-500">Add a blank table</p>
          <button
            className="flex w-full items-center justify-between rounded-xs px-2 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50"
            onClick={handleConfirm}
          >
            Start from scratch
          </button>
          <div className="my-2 h-px bg-gray-100" />

          <p className="mb-1 px-2 text-xs text-gray-500">Build with Omni</p>
          <button className="flex w-full items-center justify-between rounded-xs px-2 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">
            New table
          </button>
          <button className="flex w-full items-center justify-between rounded-xs px-2 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              New table with web data
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-500">
              Beta
            </span>
          </button>
          <div className="my-2 h-px bg-gray-100" />

          <p className="mb-1 px-2 text-xs text-gray-500">
            Add from other sources
          </p>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <Image
                src="/airtable-color.svg"
                alt="Airtable"
                width={16}
                height={16}
              />
              Airtable base
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
              <svg
                className="h-2.5 w-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Team
            </span>
          </button>

          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              CSV file
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              ></svg>
              Google Calendar
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
              <svg
                className="h-2.5 w-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Team
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              {/* Google Sheets icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                  fill="#0F9D58"
                />
                <path d="M14 2v6h6" fill="#87CEAC" />
                <rect
                  x="7"
                  y="12"
                  width="10"
                  height="7"
                  rx="0.5"
                  fill="white"
                />
                <line
                  x1="7"
                  y1="14.5"
                  x2="17"
                  y2="14.5"
                  stroke="#0F9D58"
                  strokeWidth="0.5"
                />
                <line
                  x1="7"
                  y1="16.5"
                  x2="17"
                  y2="16.5"
                  stroke="#0F9D58"
                  strokeWidth="0.5"
                />
                <line
                  x1="11"
                  y1="12"
                  x2="11"
                  y2="19"
                  stroke="#0F9D58"
                  strokeWidth="0.5"
                />
              </svg>
              Google Sheets
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              {/* Excel icon */}
              <svg
                className="h-4 w-4 text-green-700"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM7.5 17.5L10 14l-2.5-3.5h1.75L10.75 13l1.5-2.5H14L11.5 14l2.5 3.5h-1.75l-1.5-2.5-1.5 2.5H7.5z" />
              </svg>
              Microsoft Excel
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              ></svg>
              Salesforce
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
              <svg
                className="h-2.5 w-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Business
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              ></svg>
              Smartsheet
            </span>
          </button>

          <button className="flex w-full items-center justify-between rounded-xs px-2 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              ></svg>
              26 more sources...
            </span>
            <svg
              className="h-3.5 w-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
