"use client";

import { useState, useCallback, useRef } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  AIIcon,
  ChevronDownIcon,
  NumberIcon,
  PlusIcon,
  QuestionIcon,
  TextIcon,
  TrashIcon,
} from "~/app/_components/ui/icons";
import type { FilterConfig } from "~/server/api/routers/view";
import type { GridColumn } from "~/types/grid";
import { SortableGeneralItem } from "../../ui/sortable-general-item";
import { SearchableSelect } from "../../ui/searchable-select";
import { Popover } from "../../ui/popover";
import { SortableList } from "../../ui/sortable-list";

interface FilterDropdownProps {
  columns: GridColumn[];
  filters: FilterConfig[];
  filterGroupLogic?: "AND" | "OR";
  onUpdateFilters: (
    filters: FilterConfig[],
    filterGroupLogic: "AND" | "OR",
  ) => void;
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
  filterGroupLogic = "AND",
  onUpdateFilters,
  onClose,
}: FilterDropdownProps) {
  const [localFilters, setLocalFilters] = useState<FilterConfig[]>(() => {
    return filters.map((f) => {
      const col = columns.find((c) => c.id === f.columnId);
      if (col?.type === "NUMBER") {
        const val = f.value;
        if (typeof val === "number") {
          return {
            ...f,
            value: Number.isInteger(val) ? val.toFixed(1) : String(val),
          };
        } else if (val && !isNaN(Number(val))) {
          const num = Number(val);
          if (Number.isInteger(num) && !String(val).includes(".")) {
            return { ...f, value: num.toFixed(1) };
          }
        }
      }
      return f;
    });
  });

  const [conjunction, setConjunction] = useState<"and" | "or">(
    filterGroupLogic === "OR" ? "or" : "and",
  );

  const [openMenu, setOpenMenu] = useState<{
    index: number;
    type: "column" | "operator" | "conjunction";
  } | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const conjunctionLogic = (c: "and" | "or"): "AND" | "OR" =>
    c === "or" ? "OR" : "AND";

  const updateBackend = useCallback(
    (newFilters: FilterConfig[], logic: "AND" | "OR") => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const sanitizedFilters = newFilters.map((f) => {
          const col = columns.find((c) => c.id === f.columnId);
          if (col?.type === "NUMBER") {
            if (f.value === "" || f.value === undefined) {
              return { ...f, value: "" };
            }
            const num = parseFloat(String(f.value));
            return { ...f, value: isNaN(num) ? "" : num };
          }
          return f;
        });
        onUpdateFilters(sanitizedFilters, logic);
      }, 300);
    },
    [onUpdateFilters, columns],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = Number(active.id);
      const newIndex = Number(over.id);

      setLocalFilters((prev) => {
        const updated = arrayMove(prev, oldIndex, newIndex);
        updateBackend(updated, conjunctionLogic(conjunction));
        return updated;
      });
    },
    [conjunction, updateBackend],
  );

  const addFilter = useCallback(() => {
    const targetCol = columns.find((c) => c.primary) ?? columns[0];
    if (!targetCol) return;

    const newFilter: FilterConfig = {
      columnId: targetCol.id,
      operator: targetCol.type === "NUMBER" ? "equals" : "contains",
      value: "",
    };

    setLocalFilters((prev) => [...prev, newFilter]);
  }, [columns]);

  const updateFilter = useCallback(
    (index: number, patch: Partial<FilterConfig>) => {
      setLocalFilters((prev) => {
        const updated = prev.map((f, i) =>
          i === index ? { ...f, ...patch } : f,
        );

        const filter = updated[index]!;
        const needsValue = !NO_VALUE_OPERATORS.has(filter.operator);
        if (
          !needsValue ||
          (filter.value !== "" && filter.value !== undefined)
        ) {
          updateBackend(updated, conjunctionLogic(conjunction));
        }

        return updated;
      });
      setOpenMenu(null);
    },
    [conjunction, updateBackend],
  );

  const updateFilterValue = useCallback(
    (index: number, value: string | number) => {
      setLocalFilters((prev) => {
        const updated = prev.map((f, i) => (i === index ? { ...f, value } : f));

        const filter = updated[index]!;
        const needsValue = !NO_VALUE_OPERATORS.has(filter.operator);

        if (
          !needsValue ||
          (filter.value !== "" && filter.value !== undefined)
        ) {
          updateBackend(updated, conjunctionLogic(conjunction));
        }

        return updated;
      });
    },
    [conjunction, updateBackend],
  );

  const handleBlur = (index: number, columnType?: string) => {
    if (columnType !== "NUMBER") return;

    setLocalFilters((prev) => {
      const filter = prev[index];
      if (!filter) return prev;

      const valStr = String(filter.value);
      if (valStr === "" || valStr === undefined) return prev;

      const num = parseFloat(valStr);
      if (isNaN(num)) return prev;

      const formatted = Number.isInteger(num) ? num.toFixed(1) : String(num);

      if (formatted === valStr) return prev;

      const updated = prev.map((item, i) =>
        i === index ? { ...item, value: formatted } : item,
      );

      updateBackend(updated, conjunctionLogic(conjunction));
      return updated;
    });
  };

  const removeFilter = useCallback(
    (index: number) => {
      setLocalFilters((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        updateBackend(updated, conjunctionLogic(conjunction));
        return updated;
      });
    },
    [conjunction, updateBackend],
  );

  const getOperators = (col: GridColumn | undefined) => {
    if (!col) return TEXT_OPERATORS;
    return col.type === "NUMBER" ? NUMBER_OPERATORS : TEXT_OPERATORS;
  };

  const containerWidthClass = localFilters.length === 0 ? "w-84" : "w-148";

  return (
    <Popover
      onClose={onClose}
      align="right"
      className={`px-4 py-4 ${containerWidthClass}`}
    >
      <div className="pb-2">
        <h3 className="pb-2 text-[13px] text-gray-600">Filter</h3>
        <div className="flex items-center gap-2 rounded border border-gray-100 p-2">
          <AIIcon className="h-4 w-4 text-green-800" />
          <span className="text-[13px] text-gray-400">
            Describe what you want to see
          </span>
        </div>
      </div>

      {localFilters.length === 0 ? (
        <div className="py-2 text-xs text-gray-500">
          No filter conditions are applied
          <QuestionIcon className="ml-1 inline h-3.5 w-3.5" />
        </div>
      ) : (
        <SortableList
          items={localFilters.map((_, i) => String(i))}
          onDragEnd={handleDragEnd}
        >
          <div className="max-h-80 space-y-2 overflow-visible pt-1 pb-2">
            <p className="mb-2 text-xs text-gray-600">
              In this view, show records
            </p>
            {localFilters.map((filter, index) => {
              const col = columns.find((c) => c.id === filter.columnId);
              const operators = getOperators(col);
              const needsValue = !NO_VALUE_OPERATORS.has(filter.operator);
              const currentOpLabel =
                operators.find((op) => op.value === filter.operator)?.label ??
                filter.operator;

              return (
                <SortableGeneralItem
                  key={String(index)}
                  id={String(index)}
                  dragHandleClassName="border border-gray-200 p-1.75 rounded-r"
                >
                  <div className="flex w-full items-center">
                    <div className="relative mr-2 w-16 shrink-0 text-xs text-gray-500">
                      {index === 0 ? (
                        <span className="px-1">Where</span>
                      ) : index === 1 ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenu(
                                openMenu?.index === index &&
                                  openMenu.type === "conjunction"
                                  ? null
                                  : { index, type: "conjunction" },
                              );
                            }}
                            className="flex w-full items-center justify-between rounded border border-gray-200 px-1 py-1.5 hover:bg-gray-50"
                          >
                            {conjunction}
                            <ChevronDownIcon className="h-3 w-3" />
                          </button>

                          {openMenu?.index === index &&
                            openMenu.type === "conjunction" && (
                              <div className="absolute top-full left-0 z-50 w-16 rounded border border-gray-200 bg-white p-1 shadow-xl">
                                <button
                                  onClick={() => {
                                    setConjunction("and");
                                    setOpenMenu(null);
                                    setLocalFilters((prev) => {
                                      updateBackend(prev, "AND");
                                      return prev;
                                    });
                                  }}
                                  className="block w-full rounded px-2 py-1 text-left text-xs"
                                >
                                  and
                                </button>
                                <button
                                  onClick={() => {
                                    setConjunction("or");
                                    setOpenMenu(null);
                                    setLocalFilters((prev) => {
                                      updateBackend(prev, "OR");
                                      return prev;
                                    });
                                  }}
                                  className="block w-full rounded px-2 py-1 text-left text-xs"
                                >
                                  or
                                </button>
                              </div>
                            )}
                        </>
                      ) : (
                        <span className="px-1">{conjunction}</span>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(
                            openMenu?.index === index &&
                              openMenu.type === "column"
                              ? null
                              : { index, type: "column" },
                          );
                        }}
                        className="flex w-full items-center justify-between rounded-l border border-gray-200 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span className="truncate">
                          {col ? col.name : "Select field..."}
                        </span>
                        <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 text-gray-400" />
                      </button>

                      {openMenu?.index === index &&
                        openMenu.type === "column" && (
                          <SearchableSelect
                            widthClass="w-56"
                            searchPlaceholder="Find a field"
                            options={columns.map((c) => ({
                              id: c.id,
                              label: c.name,
                              icon:
                                c.type === "NUMBER" ? (
                                  <NumberIcon className="h-3.5 w-3.5 text-gray-400" />
                                ) : (
                                  <TextIcon className="h-3.5 w-3.5 text-gray-400" />
                                ),
                            }))}
                            onSelect={(opt) => {
                              const selectedId = Number(opt.id);
                              const newCol = columns.find(
                                (c) => c.id === selectedId,
                              );
                              updateFilter(index, {
                                columnId: selectedId,
                                operator:
                                  newCol?.type === "NUMBER"
                                    ? "equals"
                                    : "contains",
                                value: "",
                              });
                            }}
                            onClose={() => setOpenMenu(null)}
                          />
                        )}
                    </div>

                    <div className="relative w-40 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(
                            openMenu?.index === index &&
                              openMenu.type === "operator"
                              ? null
                              : { index, type: "operator" },
                          );
                        }}
                        className="flex w-full items-center justify-between border border-gray-200 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span className="truncate">{currentOpLabel}</span>
                        <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 text-gray-400" />
                      </button>

                      {openMenu?.index === index &&
                        openMenu.type === "operator" && (
                          <SearchableSelect
                            widthClass="w-48"
                            searchPlaceholder="Find an operator"
                            options={operators.map((op) => ({
                              id: op.value,
                              label: op.label,
                            }))}
                            onSelect={(opt) => {
                              updateFilter(index, {
                                operator: opt.id as FilterConfig["operator"],
                                ...(NO_VALUE_OPERATORS.has(
                                  opt.id as string,
                                ) && {
                                  value: "",
                                }),
                              });
                            }}
                            onClose={() => setOpenMenu(null)}
                          />
                        )}
                    </div>

                    <div className="w-48 shrink-0">
                      <input
                        type={col?.type === "NUMBER" ? "number" : "text"}
                        step="any"
                        value={filter.value ?? ""}
                        disabled={!needsValue}
                        onChange={(e) =>
                          updateFilterValue(index, e.target.value)
                        }
                        onBlur={() => handleBlur(index, col?.type)}
                        placeholder="Enter a value"
                        className="w-full [appearance:textfield] border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none placeholder:text-gray-400 invalid:border-red-600 focus:border-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>

                    <div className="flex shrink-0 items-center border border-gray-200">
                      <button
                        onClick={() => removeFilter(index)}
                        className="p-1.75 text-gray-400 hover:bg-gray-100"
                        title="Remove condition"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </SortableGeneralItem>
              );
            })}
          </div>
        </SortableList>
      )}

      <div className="flex flex-row items-start gap-4 pt-3">
        <button
          onClick={addFilter}
          className="flex items-center text-xs text-gray-600 hover:text-gray-900"
        >
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          Add condition
        </button>
        <button
          onClick={addFilter}
          className="flex items-center text-xs text-gray-600 hover:text-gray-900"
        >
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          Add condition group
          <QuestionIcon className="ml-1 h-3.5 w-3.5" />
        </button>
      </div>
    </Popover>
  );
}
