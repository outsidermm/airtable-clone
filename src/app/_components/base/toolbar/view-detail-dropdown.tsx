import { useViewMutations } from "../../hooks/use-view-mutations";
import {
  ChevronRightIcon,
  DownloadIcon,
  DuplicateIcon,
  GalleryIcon,
  PencilIcon,
  PrintIcon,
  TrashIcon,
  UsersIcon,
} from "../../ui/icons";
import { useBase } from "../base-context";
import { MenuDivider, MenuItem } from "../../ui/menu";

interface ViewDetailDropdownProps {
  viewCount: number;
  closeDropdown: () => void;
}
export function ViewDetailDropdown({
  viewCount,
  closeDropdown,
}: ViewDetailDropdownProps) {
  const { activeTableId, activeViewId, setActiveViewId } = useBase();
  const viewMutations = useViewMutations(
    activeTableId,
    activeViewId,
    setActiveViewId,
  );
  return (
    <>
      <div role="presentation" className="fixed inset-0 z-30" onClick={closeDropdown} onKeyDown={closeDropdown} />
      <div className="absolute top-full left-0 z-45 mt-1 w-91 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <button
          className="flex w-full flex-col items-start justify-between gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
          onClick={closeDropdown}
        >
          <div className="flex w-full items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              <UsersIcon className="h-4 w-4" />
              Collaborative view
            </div>
            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
          </div>
          <span className="text-xs text-gray-500">
            Editors and up can edit the view configuration
          </span>
        </button>
        <MenuDivider />
        <MenuItem
          label="Rename view"
          icon={<PencilIcon className="h-4 w-4" />}
          onClick={closeDropdown}
          className="text-sm!"
        />
        <MenuItem
          label="Edit view description"
          icon={<GalleryIcon className="h-4 w-4" />}
          onClick={closeDropdown}
          className="text-sm!"
        />
        <MenuDivider />
        <MenuItem
          label="Duplicate view"
          icon={<DuplicateIcon className="h-4 w-4" />}
          onClick={() => {
            viewMutations.handleDuplicateView(activeViewId!);
            closeDropdown();
          }}
          className="text-sm!"
        />
        <MenuDivider />
        <MenuItem
          label="Download csv"
          icon={<DownloadIcon className="h-4 w-4" />}
          onClick={closeDropdown}
          className="text-sm!"
        />
        <MenuItem
          label="Print view"
          icon={<PrintIcon className="h-4 w-4" />}
          onClick={closeDropdown}
          className="text-sm!"
        />
        <MenuItem
          label="Delete view"
          icon={<TrashIcon className="h-4 w-4 text-gray-700" />}
          danger
          disabled={viewCount <= 1}
          onClick={() => {
            if (viewCount <= 1) {
              alert("You must have at least one view");
              return;
            }
            if (activeViewId) {
              viewMutations.handleDeleteView(activeViewId);
            }
            closeDropdown();
          }}
          className={`text-sm! text-red-600 ${viewCount <= 1 ? "cursor-not-allowed opacity-50" : ""}`}
        />
      </div>
    </>
  );
}
