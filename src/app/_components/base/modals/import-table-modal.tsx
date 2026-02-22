import React from "react";
import {
  ClipboardIcon,
  DocumentIcon,
  ExcelIcon,
  GSheetIcon,
  TeamIcon,
} from "../../ui/icons";
import { MenuBadge, MenuItem } from "../../ui/menu";

interface ImportTableModalProps {
  setIsImportSubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeMenu: () => void;
}

export function ImportTableModal({
  setIsImportSubOpen,
  closeMenu,
}: ImportTableModalProps) {
  return (
    <>
      <div
        onMouseEnter={() => setIsImportSubOpen(true)}
        onMouseLeave={() => setIsImportSubOpen(false)}
        className="absolute top-0 left-full ml-0.5 w-56 rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-lg"
      >
        <MenuItem
          label="Airtable base"
          icon={<TeamIcon className="h-2.5 w-2.5 text-gray-400" />}
          onClick={closeMenu}
          rightElement={
            <MenuBadge variant="blue">
              <TeamIcon className="h-2.5 w-2.5" />
              Team
            </MenuBadge>
          }
          className="text-sm!"
        />
        <MenuItem
          label="CSV file"
          icon={<DocumentIcon className="h-4 w-4 text-gray-400" />}
          onClick={closeMenu}
          className="text-sm!"
        />
        <MenuItem
          label="Microsoft Excel"
          icon={<ExcelIcon className="h-4 w-4 text-green-700" />}
          onClick={closeMenu}
          className="text-sm!"
        />
        <MenuItem
          label="Google Sheets"
          icon={<GSheetIcon className="h-4 w-4" />}
          onClick={closeMenu}
          className="text-sm!"
        />
        <MenuItem
          label="Paste table data"
          icon={<ClipboardIcon className="h-4 w-4 text-gray-400" />}
          onClick={closeMenu}
          className="text-sm!"
        />
      </div>
    </>
  );
}
