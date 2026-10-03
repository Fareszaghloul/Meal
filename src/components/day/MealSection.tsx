"use client";

import React from "react";
import { Copy, Plus, Bookmark, ArrowRightLeft, Pencil, Trash2, CopyPlus } from "lucide-react";
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
    { label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => onEdit(entry) },
    {
      label: "Duplicate",
      icon: <CopyPlus className="h-3.5 w-3.5" />,
      onClick: () => {
        duplicateEntry(entry);
      },
    },
    ...moveTargets.map((c) => ({
      label: `Move to ${MEAL_LABELS[c]}`,
      icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
      onClick: () => updateEntry(entry, { mealCategory: c }),
    })),
    {
      label: "Delete",
      danger: true,
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: () => {
        deleteEntry(entry);
        toast(`Removed ${entry.name}`, {
          action: { label: "Undo", onClick: () => duplicateEntry(entry) },
        });
      },
    },
  ];
  return (
    <li className={cn("group flex items-center gap-2 py-2 pl-4 pr-1 md:pl-5", entry._pending === "failed" && "opacity-60")}>
      <button type="button" onClick={() => onEdit(entry)} className="min-w-0 flex-1 rounded-sm text-left">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm text-fg">{entry.name}</span>
          <span className="shrink-0 text-sm tabular text-fg">{fmt.int(entry.calories)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-xs tabular text-fg-3">
          <span className="truncate">{describeQuantity(entry)}</span>
          <span className="shrink-0">
            {fmt.g(entry.protein)}P · {fmt.g(entry.carbs)}C · {fmt.g(entry.fat)}F
          </span>
        </div>
      </button>
      <Menu items={items} label={`Actions for ${entry.name}`} />
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

export function MealSection({ category, entries, onAdd, onEdit, onCopyYesterday, onSaveTemplate, onCopyTo }: MealSectionProps) {
  const totals = sumNutrients(entries);
  const menu: MenuItem[] = [
    { label: "Copy from yesterday", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => onCopyYesterday(category) },
    { label: "Save as meal", icon: <Bookmark className="h-3.5 w-3.5" />, onClick: () => onSaveTemplate(category, entries), disabled: entries.length === 0 },
    { label: "Copy to another day…", icon: <CopyPlus className="h-3.5 w-3.5" />, onClick: () => onCopyTo(category, entries), disabled: entries.length === 0 },
  ];
  return (
    <section className="card overflow-hidden" aria-labelledby={`meal-${category}`}>
      <header className="flex items-center justify-between gap-2 border-b border-line py-2 pl-4 pr-1 md:pl-5">
        <div className="flex items-baseline gap-2">
          <h2 id={`meal-${category}`} className="text-sm font-semibold text-fg">
            {MEAL_LABELS[category]}
          </h2>
          {entries.length > 0 && (
            <span className="text-xs tabular text-fg-3">
              {fmt.int(totals.calories)} kcal · {fmt.g(totals.protein)}P · {fmt.g(totals.carbs)}C · {fmt.g(totals.fat)}F
            </span>
          )}
        </div>
        <div className="flex items-center">
          <button type="button" onClick={() => onAdd(category)} className="btn btn-ghost btn-sm" aria-label={`Add food to ${MEAL_LABELS[category]}`}>
            <Plus className="h-4 w-4" /> Add
          </button>
          <Menu items={menu} label={`${MEAL_LABELS[category]} actions`} />
        </div>
      </header>
      {entries.length === 0 ? (
        <div className="flex items-center justify-between px-4 py-3 md:px-5">
          <p className="text-sm text-fg-3">Nothing logged yet.</p>
          <button type="button" onClick={() => onCopyYesterday(category)} className="text-xs text-fg-2 hover:text-fg hover:underline">
            Copy yesterday
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} onEdit={onEdit} />
          ))}
        </ul>
      )}
    </section>
  );
}
