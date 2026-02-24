"use client";
import {
  RowHeightMediumIcon,
  RowHeightShortIcon,
  RowHeightExtraTallIcon,
  RowHeightTallIcon,
  WrapHeadersIcon,
} from "~/app/_components/ui/icons";
import type { RowHeightOption } from "~/types/row";
import { Popover } from "../../ui/popover";

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
  const rowHeightOptions: {
    label: string;
    value: RowHeightOption;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { label: "Short", value: "short", icon: RowHeightShortIcon },
    { label: "Medium", value: "medium", icon: RowHeightMediumIcon },
    { label: "Tall", value: "tall", icon: RowHeightTallIcon },
    { label: "Extra Tall", value: "extraTall", icon: RowHeightExtraTallIcon },
  ];

  return (
    <Popover onClose={onClose} align="right" className="w-48 py-3">
      <div className="px-3 pb-1.5 text-xs text-gray-500">
        Select a row height
      </div>
      {rowHeightOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onUpdateRowHeight(option.value)}
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-gray-50 ${
            activeRowHeight === option.value ? "text-blue-600" : "text-gray-600"
          }`}
        >
          <option.icon className="h-4 w-4" />
          {option.label}
        </button>
      ))}
      <div className="mx-2 my-1 border-t border-gray-200" />
      <button
        onClick={onClose}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        <WrapHeadersIcon className="h-4 w-4 pt-0.5" />
        Wrap headers
      </button>
    </Popover>
  );
}
