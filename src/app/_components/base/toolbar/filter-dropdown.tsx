"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  ChevronDownIcon,
  NumberIcon,
  PlusIcon,
  QuestionIcon,
  TextIcon,
  TrashIcon,
} from "~/app/_components/ui/icons";
import type { FilterConfig } from "~/server/api/routers/view";
import type { GridColumn } from "~/types/grid";
import { SortableItem } from "./sortable-item";

interface FilterDropdownProps {
  columns: GridColumn[];
  filters: FilterConfig[];
  filterGroupLogic?: "AND" | "OR";
  onUpdateFilters: (filters: FilterConfig[], filterGroupLogic: "AND" | "OR") => void;
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
  const [localFilters, setLocalFilters] = useState<FilterConfig[]>(filters);
  const [conjunction, setConjunction] = useState<"and" | "or">(
    filterGroupLogic === "OR" ? "or" : "and",
  );

  const [openMenu, setOpenMenu] = useState<{
    index: number;
    type: "column" | "operator" | "conjunction";
  } | null>(null);

  const valueDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const conjunctionLogic = (c: "and" | "or"): "AND" | "OR" =>
    c === "or" ? "OR" : "AND";

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = Number(active.id);
      const newIndex = Number(over.id);

      const updated = arrayMove(localFilters, oldIndex, newIndex);
      setLocalFilters(updated);
      onUpdateFilters(updated, conjunctionLogic(conjunction));
    },
    [localFilters, onUpdateFilters, conjunction],
  );

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
    onUpdateFilters(updated, conjunctionLogic(conjunction));

    // Automatically open the column picker for the new filter
    setOpenMenu({ index: updated.length - 1, type: "column" });
  }, [columns, localFilters, onUpdateFilters, conjunction]);

  const updateFilter = useCallback(
    (index: number, patch: Partial<FilterConfig>) => {
      const updated = localFilters.map((f, i) =>
        i === index ? { ...f, ...patch } : f,
      );
      setLocalFilters(updated);
      onUpdateFilters(updated, conjunctionLogic(conjunction));
      setOpenMenu(null);
    },
    [localFilters, onUpdateFilters, conjunction],
  );

  const updateFilterValue = useCallback(
    (index: number, value: string | number) => {
      const updated = localFilters.map((f, i) =>
        i === index ? { ...f, value } : f,
      );
      setLocalFilters(updated);
      if (valueDebounceRef.current) clearTimeout(valueDebounceRef.current);
      valueDebounceRef.current = setTimeout(() => {
        onUpdateFilters(updated, conjunctionLogic(conjunction));
      }, 300);
    },
    [localFilters, onUpdateFilters, conjunction],
  );

  const removeFilter = useCallback(
    (index: number) => {
      const updated = localFilters.filter((_, i) => i !== index);
      setLocalFilters(updated);
      onUpdateFilters(updated, conjunctionLogic(conjunction));
    },
    [localFilters, onUpdateFilters, conjunction],
  );

  const getOperators = (col: GridColumn | undefined) => {
    if (!col) return TEXT_OPERATORS;
    return col.type === "NUMBER" ? NUMBER_OPERATORS : TEXT_OPERATORS;
  };

  const containerWidthClass =
    localFilters.length === 0 ? "w-80" : "w-[44rem] max-w-[90vw]";

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className={`absolute top-full right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-lg transition-all ${containerWidthClass}`}
      >
        <div className="pb-2">
          <h3 className="text-sm font-medium text-gray-900">Filter</h3>
        </div>

        {localFilters.length === 0 ? (
          <div className="py-2 text-xs text-gray-500">
            No filter conditions are applied
            <QuestionIcon className="ml-1 inline h-3.5 w-3.5" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localFilters.map((_, i) => String(i))}
              strategy={verticalListSortingStrategy}
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
                    operators.find((op) => op.value === filter.operator)
                      ?.label ?? filter.operator;

                  return (
                    <SortableItem
                      key={String(index)}
                      id={String(index)}
                      dragHandleClassName="border border-gray-200 p-1.5 rounded-r"
                      hideDragHandle={localFilters.length === 1}
                    >
                      <div className="flex w-full items-center">
                        {/* 1. Conjunction (Where / And / Or) */}
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
                                        onUpdateFilters(localFilters, "AND");
                                      }}
                                      className="block w-full rounded px-2 py-1 text-left text-xs"
                                    >
                                      and
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConjunction("or");
                                        setOpenMenu(null);
                                        onUpdateFilters(localFilters, "OR");
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

                        {/* 2. Column Picker */}
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
                              <FilterColumnPickerMenu
                                columns={columns}
                                onSelect={(colId) => {
                                  const newCol = columns.find(
                                    (c) => c.id === colId,
                                  );
                                  updateFilter(index, {
                                    columnId: colId,
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

                        {/* 3. Operator Picker */}
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
                              <FilterOperatorPickerMenu
                                operators={operators}
                                onSelect={(opValue) => {
                                  updateFilter(index, {
                                    operator:
                                      opValue as FilterConfig["operator"],
                                    ...(NO_VALUE_OPERATORS.has(opValue) && {
                                      value: "",
                                    }),
                                  });
                                }}
                                onClose={() => setOpenMenu(null)}
                              />
                            )}
                        </div>

                        {/* 4. Value Input */}
                        <div className="w-48 shrink-0">
                          {needsValue ? (
                            <input
                              type={col?.type === "NUMBER" ? "number" : "text"}
                              value={filter.value ?? ""}
                              onChange={(e) =>
                                updateFilterValue(
                                  index,
                                  col?.type === "NUMBER"
                                    ? Number(e.target.value)
                                    : e.target.value,
                                )
                              }
                              placeholder="Enter a value"
                              className="w-full border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-400"
                            />
                          ) : (
                            <div className="h-7" />
                          )}
                        </div>

                        {/* 5. Actions (Trash left, Drag Handle right) */}
                        <div className="flex shrink-0 items-center border border-gray-200">
                          <button
                            onClick={() => removeFilter(index)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100"
                            title="Remove condition"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div
          className={`mt-2 flex items-start gap-4 border-t border-gray-100 pt-3 ${
            localFilters.length === 0 ? "flex-col gap-2" : "flex-row"
          }`}
        >
          <button
            onClick={addFilter}
            className="flex items-center text-xs text-gray-600 hover:font-medium hover:text-gray-900"
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add condition
          </button>
          <button
            onClick={addFilter}
            className="flex items-center text-xs text-gray-600 hover:font-medium hover:text-gray-900"
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add condition group
            <QuestionIcon className="ml-1 h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

// --- Sub-component for the searchable column menu ---
interface FilterColumnPickerMenuProps {
  columns: GridColumn[];
  onSelect: (id: number) => void;
  onClose: () => void;
}

function FilterColumnPickerMenu({
  columns,
  onSelect,
  onClose,
}: FilterColumnPickerMenuProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = columns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="fixed inset-0 z-60" onClick={onClose} />
      <div className="absolute top-full left-0 z-70 mt-1 w-56 rounded-md border border-gray-200 bg-white p-1 shadow-xl">
        <div className="mb-1 flex items-center gap-2 px-2 pt-1 pb-1.5">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
            placeholder="Find a field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filtered.map((col) => (
            <button
              key={col.id}
              onClick={() => onSelect(col.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
            >
              {col.type === "NUMBER" ? (
                <NumberIcon className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <TextIcon className="h-3.5 w-3.5 text-gray-400" />
              )}
              <span className="truncate">{col.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-2 text-xs text-gray-400">No results</div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Sub-component for the searchable operator menu ---
interface FilterOperatorPickerMenuProps {
  operators: readonly { value: string; label: string }[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

function FilterOperatorPickerMenu({
  operators,
  onSelect,
  onClose,
}: FilterOperatorPickerMenuProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = operators.filter((op) =>
    op.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="fixed inset-0 z-60" onClick={onClose} />
      <div className="absolute top-full left-0 z-70 mt-1 w-48 rounded-md border border-gray-200 bg-white p-1 shadow-xl">
        <div className="mb-1 flex items-center gap-2 px-2 pt-1 pb-1.5">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
            placeholder="Find an operator"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filtered.map((op) => (
            <button
              key={op.value}
              onClick={() => onSelect(op.value)}
              className="flex w-full items-center px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
            >
              <span className="truncate">{op.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-2 text-xs text-gray-400">No results</div>
          )}
        </div>
      </div>
    </>
  );
}
