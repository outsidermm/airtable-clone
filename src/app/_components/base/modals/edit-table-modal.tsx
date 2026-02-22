import type { Table } from "~/types/table";
import {
  ImportIcon,
  ChevronRightIcon,
  RenameIcon,
  HideIcon,
  TextIcon,
  TeamIcon,
  DuplicateIcon,
  CalendarIcon,
  PencilIcon,
  LockIcon,
  XIcon,
  TrashIcon,
} from "../../ui/icons";
import { MenuItem, MenuDivider, MenuBadge } from "../../ui/menu";
import { ImportTableModal } from "./import-table-modal";

interface EditTableModalProps {
  table: Table;
  tables: Table[];
  setRenamingTableId: (id: number | null) => void;
  setDeleteConfirmTableId: (id: number | null) => void;
  isImportSubOpen: boolean;
  setIsImportSubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeMenu: () => void;
}

export function EditTableModal({
  table,
  tables,
  setRenamingTableId,
  setDeleteConfirmTableId,
  isImportSubOpen,
  setIsImportSubOpen,
  closeMenu,
}: EditTableModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={closeMenu} />
      <div className="absolute top-full left-0 z-100 mt-0.5 w-80 rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-lg">
        <div className="relative">
          <MenuItem
            label="Import data"
            icon={<ImportIcon className="h-4 w-4 text-gray-400" />}
            onMouseEnter={() => setIsImportSubOpen(true)}
            onMouseLeave={() => setIsImportSubOpen(false)}
            rightElement={
              <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
            }
            className="text-sm!"
          />

          {isImportSubOpen && (
            <ImportTableModal
              setIsImportSubOpen={setIsImportSubOpen}
              closeMenu={closeMenu}
            />
          )}
        </div>

        <MenuDivider />

        <MenuItem
          label="Rename table"
          icon={<RenameIcon className="h-4 w-4 text-gray-400" />}
          onClick={() => {
            closeMenu();
            setRenamingTableId(table.id);
          }}
          className="text-sm!"
        />
        <MenuItem
          label="Hide table"
          icon={<HideIcon className="h-4 w-4 text-gray-400" />}
          onClick={closeMenu}
          className="text-sm!"
        />
        <MenuItem
          label="Manage fields"
          icon={<TextIcon className="h-4 w-4 text-gray-400" />}
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
          label="Duplicate table"
          icon={<DuplicateIcon className="h-4 w-4 text-gray-400" />}
          onClick={closeMenu}
          className="text-sm!"
        />
        <MenuDivider />
        <MenuItem
          label="Configure date dependencies"
          icon={<CalendarIcon className="h-4 w-4 text-gray-400" />}
          onClick={closeMenu}
          rightElement={
            <MenuBadge variant="blue">
              <TeamIcon className="h-2.5 w-2.5" />
              Team
            </MenuBadge>
          }
          className="text-sm!"
        />
        <MenuDivider />
        <MenuItem
          label="Edit table description"
          icon={<PencilIcon className="h-4 w-4 text-gray-400" />}
          onClick={closeMenu}
          className="text-sm!"
        />
        <MenuItem
          label="Edit table permissions"
          icon={<LockIcon className="h-4 w-4 text-gray-400" />}
          onClick={closeMenu}
          rightElement={
            <MenuBadge variant="blue">
              <TeamIcon className="h-2.5 w-2.5" />
              Team
            </MenuBadge>
          }
          className="text-sm!"
        />
        <MenuDivider />
        <MenuItem
          label="Clear data"
          icon={<XIcon className="h-4 w-4 text-gray-400" />}
          onClick={closeMenu}
          className="text-sm!"
        />
        <MenuItem
          label="Delete table"
          icon={<TrashIcon className="h-4 w-4 text-gray-400" />}
          onClick={() => {
            setDeleteConfirmTableId(table.id);
            closeMenu();
          }}
          disabled={tables.length === 1}
          className={`text-sm! ${tables.length === 1 ? "text-gray-400" : ""}`}
        />
      </div>
    </>
  );
}
