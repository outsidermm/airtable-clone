"use client";
import { RowHeightMediumIcon, RowHeightShortIcon, RowHeightExtraTallIcon, RowHeightTallIcon, WrapHeadersIcon } from "~/app/_components/ui/icons";
import type { RowHeightOption } from "~/types/row";

interface RowHeightDropdownProps {
  activeRowHeight: RowHeightOption;
  onUpdateRowHeight: (option: RowHeightOption) => void;
  onClose: () => void;
}

export function RowHeightDropdown({
  activeRowHeight,
  onClose,
  onUpdateRowHeight,
}: RowHeightDropdownProps) {

  const rowHeightOptions: { label: string; value: RowHeightOption; icon:
    React.ComponentType<{ className?: string }>
   }[] = [
    { label: "Short", value: "short", icon: RowHeightShortIcon},
    { label: "Medium", value: "medium" ,icon: RowHeightMediumIcon },
    { label: "Tall", value: "tall" , icon: RowHeightTallIcon},
    { label: "Extra Tall", value: "extraTall", icon: RowHeightExtraTallIcon },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute top-full right-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-3 shadow-lg">
        <div className="px-3 pb-1.5 text-xs text-gray-500">
          Select a row height
        </div>
        {rowHeightOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onUpdateRowHeight(option.value)}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-gray-50 ${
              activeRowHeight === option.value
                ? "text-blue-600"
                : "text-gray-600"
            }`}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </button>
        ))}
        <div className="my-1 border-t border-gray-200 mx-2" />
        <button
          onClick={onClose}
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <WrapHeadersIcon className="h-4 w-4 pt-0.5" />
          Wrap headers
        </button>
      </div>
    </>
  );
}
