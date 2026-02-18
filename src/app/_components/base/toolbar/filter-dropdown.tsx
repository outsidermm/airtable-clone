"use client";

import { useState, useCallback } from "react";
import { PlusIcon, QuestionIcon, TrashIcon } from "~/app/_components/ui/icons";
import type { FilterConfig } from "~/server/api/routers/view";
import type { GridColumn } from "~/types/grid";

interface FilterDropdownProps {
  columns: GridColumn[];
  filters: FilterConfig[];
  onUpdateFilters: (filters: FilterConfig[]) => void;
  onClose: () => void;
}

const TEXT_OPERATORS = [
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "equals", label: "is" },
  { value: "not_equals", label: "is not" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
] as const;

const NUMBER_OPERATORS = [
  { value: "equals", label: "=" },
  { value: "not_equals", label: "!=" },
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
  { value: "greater_than_or_equal", label: ">=" },
  { value: "less_than_or_equal", label: "<=" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
] as const;

const NO_VALUE_OPERATORS = new Set(["is_empty", "is_not_empty"]);

export function FilterDropdown({
  columns,
  filters,
  onUpdateFilters,
  onClose,
}: FilterDropdownProps) {
  const [localFilters, setLocalFilters] = useState<FilterConfig[]>(filters);

  const addFilter = useCallback(() => {
    const firstCol = columns[0];
    if (!firstCol) return;
    const newFilter: FilterConfig = {
      columnId: firstCol.id,
      operator: firstCol.type === "NUMBER" ? "equals" : "contains",
      value: "",
    };
    const updated = [...localFilters, newFilter];
    setLocalFilters(updated);
    onUpdateFilters(updated);
  }, [columns, localFilters, onUpdateFilters]);

  const updateFilter = useCallback(
    (index: number, patch: Partial<FilterConfig>) => {
      const updated = localFilters.map((f, i) =>
        i === index ? { ...f, ...patch } : f,
      );
      setLocalFilters(updated);
      onUpdateFilters(updated);
    },
    [localFilters, onUpdateFilters],
  );

  const removeFilter = useCallback(
    (index: number) => {
      const updated = localFilters.filter((_, i) => i !== index);
      setLocalFilters(updated);
      onUpdateFilters(updated);
    },
    [localFilters, onUpdateFilters],
  );

  const getOperators = (col: GridColumn | undefined) => {
    if (!col) return TEXT_OPERATORS;
    return col.type === "NUMBER" ? NUMBER_OPERATORS : TEXT_OPERATORS;
  };

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute top-full -right-20 z-50 mt-1 w-148 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-lg">
        <div className="pb-2">
          <h3 className="text-sm font-medium text-gray-900">Filter</h3>
        </div>

        {localFilters.length === 0 ? (
          <div className="py-2 text-xs text-gray-500">
            No filter conditions are applied
            <QuestionIcon className="ml-1 inline h-3.5 w-3.5" />
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            <p className="text-xs text-gray-600">In this view, show records</p>
            {localFilters.map((filter, index) => {
              const col = columns.find((c) => c.id === filter.columnId);
              const operators = getOperators(col);
              const needsValue = !NO_VALUE_OPERATORS.has(filter.operator);

              return (
                <div key={index} className="flex items-center gap-1.5 px-2">
                  <span className="shrink-0 text-xs text-gray-500">
                    {index === 0 ? "Where" : "And"}
                  </span>
                  <div className="flex w-full items-center">
                    {/* Column select */}
                    <select
                      value={filter.columnId}
                      onChange={(e) => {
                        const newCol = columns.find(
                          (c) => c.id === Number(e.target.value),
                        );
                        updateFilter(index, {
                          columnId: Number(e.target.value),
                          operator:
                            newCol?.type === "NUMBER" ? "equals" : "contains",
                          value: "",
                        });
                      }}
                      className="rounded-l border border-gray-200 py-1 text-xs text-gray-700"
                    >
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {/* Operator select */}
                    <select
                      value={filter.operator}
                      onChange={(e) =>
                        updateFilter(index, {
                          operator: e.target.value as FilterConfig["operator"],
                        })
                      }
                      className="border border-gray-200 px-1.5 py-1 text-xs text-gray-700"
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value input */}
                    {needsValue && (
                      <input
                        type={col?.type === "NUMBER" ? "number" : "text"}
                        value={filter.value ?? ""}
                        onChange={(e) =>
                          updateFilter(index, {
                            value:
                              col?.type === "NUMBER"
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                        placeholder="value"
                        className="w-20 flex-1 border border-gray-200 px-1.5 py-1 text-xs text-gray-700 outline-none"
                      />
                    )}
                    {/* Remove */}
                    <button
                      onClick={() => removeFilter(index)}
                      className="shrink-0 border border-gray-200 p-1 text-gray-700 hover:bg-gray-300"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          className={`flex items-start gap-2 ${
            filters.length === 0 ? "flex-col" : "flex-row"
          }`}
        >
          <button
            onClick={addFilter}
            className="py-1 text-xs text-gray-600 hover:font-medium hover:text-gray-800"
          >
            <PlusIcon className="mr-1 inline h-3.5 w-3.5" />
            Add condition
          </button>
          <button
            onClick={addFilter}
            className="py-1 text-xs text-gray-600 hover:font-medium hover:text-gray-800"
          >
            <PlusIcon className="mr-1 inline h-3.5 w-3.5" />
            Add condition group
            <QuestionIcon className="ml-1 inline h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
