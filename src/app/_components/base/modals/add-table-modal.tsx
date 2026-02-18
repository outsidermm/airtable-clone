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
} from "~/app/_components/ui/icons";
import { useBase } from "../base-context";
import { MenuItem, MenuDivider, MenuSectionHeader } from "../../ui/menu";

interface AddTableModalProps {
  onAddTable: () => void;
  anchorEl: HTMLElement | null;
}

export function AddTableModal({ onAddTable, anchorEl }: AddTableModalProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const { openModal } = useBase();

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
    onAddTable();
    openModal(null);
  };

  const isDropdown = !!anchorEl && !!position;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={() => openModal(null)}
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
        <div className="p-4">
          <MenuSectionHeader label="Add a blank table" />
          <MenuItem label="Start from scratch" onClick={handleConfirm} />
          <MenuDivider />
          <MenuSectionHeader label="Build with Omni" />
          <MenuItem label="New table" />
          <MenuItem
            label="New table with web data"
            rightElement={
              <span className="flex items-center gap-1 rounded-xl bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-500">
                Beta
              </span>
            }
          />
          <MenuDivider />
          <MenuSectionHeader label="Add from other sources" />
          <MenuItem
            label="Airtable base"
            icon={
              <Image
                src="/airtable-color.svg"
                alt="Airtable"
                width={16}
                height={16}
              />
            }
          />
          <MenuItem
            label="CSV file"
            icon={<DocumentIcon className="h-4 w-4 text-gray-400" />}
          />
          <MenuItem
            label="Google Calendar"
            icon={<GCalendarIcon className="h-4 w-4" />}
          />
          <MenuItem
            label="Google Sheets"
            icon={<GSheetIcon className="h-4 w-4 text-green-700" />}
          />
          <MenuItem
            label="Microsoft Excel"
            icon={<ExcelIcon className="h-4 w-4 text-green-700" />}
          />
          <MenuItem
            label="Salesforce"
            icon={<SalesforceIcon className="h-4 w-4" />}
            rightElement={
              <span className="flex items-center gap-1 rounded-xl bg-blue-100 px-1.5 py-0.5 text-xs text-blue-500">
                <TeamIcon className="h-2.5 w-2.5" />
                Business
              </span>
            }
          />
          <MenuItem
            label="Smartsheet"
            icon={
              <Image
                src="/SmartSheet.svg"
                alt="Notion"
                width={12}
                height={12}
                className="ml-1"
              />
            }
          />
          <MenuItem
            label="26 more sources..."
            icon={<DocumentIcon className="h-4 w-4 text-gray-400" />}
            rightElement={
              <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
            }
          />
        </div>
      </div>
    </>
  );
}
