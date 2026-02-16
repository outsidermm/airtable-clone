"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ChevronRightIcon,
  DocumentIcon,
  ExcelIcon,
  GCalendarIcon,
  GSheetIcon,
  SalesforceIcon,
  TeamIcon,
} from "~/components/icons";

interface AddTableModalProps {
  onConfirm: () => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
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
        style={{ background: "transparent" }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-xl"
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
            <span className="flex items-center gap-2.5">New table</span>
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
          </button>

          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <DocumentIcon className="h-4 w-4 text-gray-400" />
              CSV file
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <GCalendarIcon className="h-4 w-4" />
              Google Calendar
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <GSheetIcon className="h-4 w-4" />
              Google Sheets
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <ExcelIcon className="h-4 w-4 text-green-700" />
              Microsoft Excel
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <SalesforceIcon className="h-4 w-4" />
              Salesforce
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
              <TeamIcon className="h-2.5 w-2.5" />
              Business
            </span>
          </button>
          <button className="flex w-full items-center justify-between px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <Image
                src="/SmartSheet.svg"
                alt="Notion"
                width={12}
                height={12}
                className="ml-1"
              />
              Smartsheet
            </span>
          </button>

          <button className="flex w-full items-center justify-between rounded-xs px-2 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">
            <span className="flex items-center gap-2.5">
              <DocumentIcon className="h-4 w-4 text-gray-400" />
              26 more sources...
            </span>
            <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>
      </div>
    </>
  );
}
