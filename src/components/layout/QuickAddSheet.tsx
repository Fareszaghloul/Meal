"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Droplet, PencilLine, Plus, RotateCcw, Scale } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { fmt } from "@/components/ui/primitives";
import { MEAL_CATEGORIES, MEAL_LABELS, type MealCategory } from "@/lib/domain";
import { addDays, todayLocal } from "@/lib/dates";
import { addWater, copyEntries, useDay } from "@/lib/client/day-store";
import { sumNutrients } from "@/lib/nutrition/core";
import { formatWeight } from "@/lib/weight-units";
import { suggestMeal } from "@/lib/meal-suggest";
import { cn } from "@/lib/utils";

const liters = (ml: number) => String(Number((ml / 1000).toFixed(2)));

/** The "+" in the tab bar. Everything here reads the same cached day data the Today screen uses. */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add" size="sm">
      <QuickAddBody onClose={onClose} />
    </Sheet>
  );
}

function QuickAddBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const today = todayLocal();
  const yesterday = addDays(today, -1);
  const [meal, setMeal] = useState<MealCategory>(() => suggestMeal());
  const { day } = useDay(today);
  const { day: yesterdayDay } = useDay(yesterday);
  const [repeating, setRepeating] = useState(false);

  // Yesterday's entries for the chosen meal: the repeat row only exists when there is something to repeat.
  const yesterdayMeal = useMemo(() => (yesterdayDay?.entries ?? []).filter((e) => e.mealCategory === meal), [yesterdayDay, meal]);
  const yesterdayTotals = useMemo(() => sumNutrients(yesterdayMeal), [yesterdayMeal]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const repeatYesterday = async () => {
    setRepeating(true);
    try {
      const created = await copyEntries({ fromDate: yesterday, toDate: today, fromMealCategory: meal, toMealCategory: meal });
      toast(`Added ${created.length} item${created.length === 1 ? "" : "s"} from yesterday's ${MEAL_LABELS[meal]}`, { kind: "success" });
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't repeat that meal", { kind: "error" });
    } finally {
      setRepeating(false);
    }
  };

  const quickWater = (ml: number) => {
    addWater(today, ml);
    toast(`Added ${ml} ml water`, { kind: "success" });
  };

  const weight = day?.weight;
  const row = "flex min-h-[64px] w-full items-center gap-3.5 border-t border-line py-2 text-left";
  const icon = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2";

  return (
    <div className="-mx-1 space-y-4">
      <section aria-label="Meal">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Add to</h3>
          <span className="text-xs text-fg-3">Suggested by time of day</span>
        </div>
        <div role="radiogroup" aria-label="Meal" className="flex gap-1.5">
          {MEAL_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={meal === c}
              onClick={() => setMeal(c)}
              className={cn("min-h-[44px] flex-1 rounded-full px-1 text-sm transition-colors", meal === c ? "bg-fg font-semibold text-bg" : "bg-surface-2 font-medium text-fg-2")}
            >
              {MEAL_LABELS[c]}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => go(`/?add=${meal}`)} className="flex min-h-[96px] flex-col justify-between rounded-3xl bg-accent p-4 text-left text-on-accent">
          <Plus className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
          <span className="text-[17px] font-bold tracking-tight">Add food</span>
        </button>
        <button type="button" onClick={() => go(`/?add=${meal}&manual=1`)} className="flex min-h-[96px] flex-col justify-between rounded-3xl bg-surface-2 p-4 text-left text-fg">
          <PencilLine className="h-6 w-6" aria-hidden="true" />
          <span className="text-[17px] font-bold tracking-tight">Enter manually</span>
        </button>
      </div>

      <section aria-label="Quick log">
        <h3 className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-3">Quick log</h3>
        <div className={row}>
          <span className={cn(icon, "text-[var(--water)]")}>
            <Droplet className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Water</span>
            <span className="tabular block text-[13px] text-fg-3">{day ? `${liters(day.water.totalMl)} of ${liters(day.water.goalMl)} L today` : "—"}</span>
          </span>
          <button type="button" onClick={() => quickWater(250)} aria-label="Add 250 ml water" className="tabular min-h-[44px] min-w-[60px] rounded-full bg-surface-2 px-3 text-sm font-bold">
            +250
          </button>
          <button type="button" onClick={() => quickWater(500)} aria-label="Add 500 ml water" className="tabular min-h-[44px] min-w-[60px] rounded-full bg-surface-2 px-3 text-sm font-bold">
            +500
          </button>
        </div>
        <button type="button" onClick={() => go("/weight")} className={row}>
          <span className={icon}>
            <Scale className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Weight</span>
            <span className="tabular block text-[13px] text-fg-3">{weight && weight.latestKg !== null ? `Last: ${formatWeight(weight.latestKg, weight.unit)} ${weight.unit}` : "No weight logged yet"}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-fg-3" aria-hidden="true" />
        </button>
        {yesterdayMeal.length > 0 && (
          <div className={row}>
            <span className={icon}>
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold">Repeat yesterday&rsquo;s {MEAL_LABELS[meal].toLowerCase()}</span>
              <span className="tabular block text-[13px] text-fg-3">
                {fmt.int(yesterdayTotals.calories)} kcal · {yesterdayMeal.length} {yesterdayMeal.length === 1 ? "item" : "items"}
              </span>
            </span>
            <button type="button" onClick={repeatYesterday} disabled={repeating} className="btn btn-secondary min-h-[44px] px-4 font-bold">
              Add
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
