interface EditBaseModalProps {
  handleDuplicateBase: () => void;
  handleDeleteBase: () => void;
  setShowBaseSubMenu: React.Dispatch<React.SetStateAction<boolean>>;
}

import { DuplicateIcon, SlackIcon, TrashIcon } from "../../ui/icons";

export function EditBaseModal({
  handleDuplicateBase,
  handleDeleteBase,
  setShowBaseSubMenu,
}: EditBaseModalProps) {
  return (
    <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-lg">
      <button
        onClick={handleDuplicateBase}
        className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
      >
        <DuplicateIcon className="h-4 w-4 text-gray-500" />
        Duplicate base
      </button>
      <button
        onClick={() => setShowBaseSubMenu(false)}
        className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
      >
        <SlackIcon className="h-4 w-4 text-gray-500" />
        Slack notifications
      </button>
      <button
        onClick={handleDeleteBase}
        className="flex w-full items-center gap-2 px-3 py-2 text-red-800 hover:bg-gray-50"
      >
        <TrashIcon className="h-4 w-4 text-gray-500" />
        Delete base
      </button>
    </div>
  );
}
