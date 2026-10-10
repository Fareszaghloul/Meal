"use client";

import React, { useState } from "react";
import { Copy, Plus, Bookmark, ArrowRightLeft, Pencil, Trash2, CopyPlus, ChevronDown } from "lucide-react";
import type { MealCategory, MealItem } from "@/lib/domain";
import { MEAL_CATEGORIES, MEAL_LABELS } from "@/lib/domain";
import { sumNutrients } from "@/lib/nutrition/core";
import { fmt, Menu, type MenuItem } from "@/components/ui/primitives";
import { deleteEntry, duplicateEntry, updateEntry } from "@/lib/client/day-store";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

function describeQuantity(e: MealItem) {
  const unit = e.servingUnit === "serving" ? (e.servings === 1 ? "serving" : "servings") : e.servingUnit;
  return `${fmt.qty(e.servings)} ${unit}`;
}

export function EntryRow({ entry, onEdit }: { entry: MealItem; onEdit: (e: MealItem) => void }) {
  const moveTargets = MEAL_CATEGORIES.filter((c) => c !== entry.mealCategory);

  const items: MenuItem[] = [
    {
      label: "Edit portion",
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: () => onEdit(entry),
    },
    {
      label: "Repeat",
      icon: <CopyPlus className="h-3.5 w-3.5" />,
      onClick: () => {
        duplicateEntry(entry);
        toast(`Repeated ${entry.name}`);
      },
    },
    ...moveTargets.map((c) => ({
      label: `Move to ${MEAL_LABELS[c]}`,
      icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
      onClick: () => {
        updateEntry(entry, { mealCategory: c });
        toast(`Moved to ${MEAL_LABELS[c]}`);
      },
    })),
    {
      label: "Delete",
      danger: true,
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: () => {
        deleteEntry(entry);
        toast(`Removed ${entry.name}`, {
          action: {
            label: "Undo",
            onClick: () => duplicateEntry(entry),
          },
        });
      },
    },
  ];

  return (
    <li
      className={cn(
        "group flex items-center justify-between gap-2 py-1 pl-5 pr-2 transition-colors hover:bg-surface-2/40",
        entry._pending === "saving" && "opacity-75",
        entry._pending === "failed" && "bg-negative-soft/20 opacity-60"
      )}
    >
      <button
        type="button"
        onClick={() => onEdit(entry)}
        className="min-h-[52px] min-w-0 flex-1 py-1 text-left focus-visible:outline-hidden"
        aria-label={`Edit ${entry.name}, ${describeQuantity(entry)}, ${fmt.int(entry.calories)} kcal`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-medium text-fg">{entry.name}</span>
          <span className="tabular shrink-0 text-[15px] font-semibold text-fg">{fmt.int(entry.calories)}</span>
        </div>
        <div className="tabular mt-0.5 flex items-baseline justify-between gap-3 text-[13px] text-fg-3">
          <span className="truncate">{describeQuantity(entry)}</span>
          <span className="shrink-0 space-x-1.5">
            <span className="text-protein">{fmt.g(entry.protein)}P</span>
            <span className="text-carbs">{fmt.g(entry.carbs)}C</span>
            <span className="text-fat">{fmt.g(entry.fat)}F</span>
          </span>
        </div>
      </button>

      <div className="shrink-0">
        <Menu items={items} label={`Actions for ${entry.name}`} />
      </div>
    </li>
  );
}

interface MealSectionProps {
  category: MealCategory;
  entries: MealItem[];
  onAdd: (c: MealCategory) => void;
  onEdit: (e: MealItem) => void;
  onCopyYesterday: (c: MealCategory) => void;
  onSaveTemplate: (c: MealCategory, entries: MealItem[]) => void;
  onCopyTo: (c: MealCategory, entries: MealItem[]) => void;
}

/** One meal inside the grouped meals card; the page owns the card, so this is a plain section with a divider. */
export function MealSection({
  category,
  entries,
  onAdd,
  onEdit,
  onCopyYesterday,
  onSaveTemplate,
  onCopyTo,
}: MealSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const totals = sumNutrients(entries);

  const menu: MenuItem[] = [
    {
      label: "Copy from yesterday",
      icon: <Copy className="h-3.5 w-3.5" />,
      onClick: () => onCopyYesterday(category),
    },
    {
      label: "Save as meal",
      icon: <Bookmark className="h-3.5 w-3.5" />,
      onClick: () => onSaveTemplate(category, entries),
      disabled: entries.length === 0,
    },
    {
      label: "Copy to another day…",
      icon: <CopyPlus className="h-3.5 w-3.5" />,
      onClick: () => onCopyTo(category, entries),
      disabled: entries.length === 0,
    },
  ];

  return (
    <section className="border-t border-line first:border-t-0" aria-labelledby={`meal-${category}`}>
      <header className="flex items-center justify-between gap-2 py-2.5 pl-5 pr-2">
        <div className="flex min-w-0 items-center gap-2">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="btn btn-ghost btn-icon btn-sm -ml-2 h-9 w-9 text-fg-3 hover:text-fg"
              aria-label={collapsed ? `Expand ${MEAL_LABELS[category]}` : `Collapse ${MEAL_LABELS[category]}`}
              aria-expanded={!collapsed}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", collapsed && "-rotate-90")} />
            </button>
          )}

          <h2 id={`meal-${category}`} className="text-base font-bold tracking-tight text-fg">
            {MEAL_LABELS[category]}
          </h2>

          <div className="tabular flex items-baseline gap-1.5 text-[13px] text-fg-3">
            {entries.length > 0 ? (
              <>
                <span>{fmt.int(totals.calories)} kcal</span>
                <span className="hidden sm:inline">
                  · {fmt.g(totals.protein)}P · {fmt.g(totals.carbs)}C · {fmt.g(totals.fat)}F
                </span>
                {collapsed && (
                  <span className="ml-1 rounded-full bg-surface-3 px-1.5 text-[10px] text-fg-3">
                    {entries.length} {entries.length === 1 ? "item" : "items"}
                  </span>
                )}
              </>
            ) : (
              <span>0 kcal</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onAdd(category)}
            className="btn btn-ghost btn-sm h-9 text-[13px] font-semibold text-fg hover:text-fg"
            aria-label={`Add food to ${MEAL_LABELS[category]}`}
          >
            <Plus className="mr-0.5 h-4 w-4" /> Add
          </button>
          <Menu items={menu} label={`${MEAL_LABELS[category]} actions`} />
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="flex items-center justify-between px-5 pb-3 text-[13px] text-fg-3">
          <span>Nothing logged yet.</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onCopyYesterday(category)} className="min-h-[36px] text-fg-2 transition-colors hover:text-fg hover:underline">
              Copy yesterday
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => onAdd(category)} className="min-h-[36px] font-medium text-fg transition-colors hover:underline">
              + Add food
            </button>
          </div>
        </div>
      ) : (
        !collapsed && (
          <ul className="pb-1">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} onEdit={onEdit} />
            ))}
          </ul>
        )
      )}
    </section>
  );
}
