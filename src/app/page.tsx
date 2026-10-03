"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { DateNav } from "@/components/day/DateNav";
import { DaySummary } from "@/components/day/DaySummary";
import { MealSection } from "@/components/day/MealSection";
import { AddFoodSheet } from "@/components/day/AddFoodSheet";
import { EditEntrySheet } from "@/components/day/EditEntrySheet";
import { CopyToSheet, SaveTemplateSheet } from "@/components/day/MealDialogs";
import { copyEntries, prefetchDay, useDay } from "@/lib/client/day-store";
import { MEAL_CATEGORIES, MEAL_LABELS, type MealCategory, type MealItem } from "@/lib/domain";
import { addDays, isDateString, todayLocal } from "@/lib/dates";
import { toast } from "@/components/ui/Toast";

function suggestMeal(): MealCategory {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function DashboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlDate = params.get("date");
  const date = urlDate && isDateString(urlDate) ? urlDate : todayLocal();
  const { day, error, refresh } = useDay(date);

  const [adding, setAdding] = useState<MealCategory | null>(null);
  const [editing, setEditing] = useState<MealItem | null>(null);
  const [saving, setSaving] = useState<{ category: MealCategory; entries: MealItem[] } | null>(null);
  const [copying, setCopying] = useState<{ category: MealCategory; entries: MealItem[] } | null>(null);

  const setDate = useCallback(
    (d: string) => {
      router.replace(d === todayLocal() ? pathname : `${pathname}?date=${d}`, { scroll: false });
    },
    [router, pathname]
  );

  // Neighbouring days are warmed so ←/→ feels instant.
  useEffect(() => {
    prefetchDay(addDays(date, -1));
    prefetchDay(addDays(date, 1));
  }, [date]);

  // Keyboard shortcuts: N = add food, ←/→ = change day, T = today (only when not typing in inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (adding || editing || saving || copying) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setAdding(suggestMeal());
      } else if (e.key === "ArrowLeft") {
        setDate(addDays(date, -1));
      } else if (e.key === "ArrowRight") {
        setDate(addDays(date, 1));
      } else if (e.key === "t" || e.key === "T") {
        setDate(todayLocal());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [date, setDate, adding, editing, saving, copying]);

  const byMeal = useMemo(() => {
    const m: Record<MealCategory, MealItem[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of day?.entries ?? []) (m[e.mealCategory] ?? m.snack).push(e);
    return m;
  }, [day]);

  const copyYesterday = async (c: MealCategory) => {
    try {
      const created = await copyEntries({ fromDate: addDays(date, -1), toDate: date, fromMealCategory: c, toMealCategory: c });
      toast(
        created.length
          ? `Copied ${created.length} item${created.length === 1 ? "" : "s"} from yesterday's ${MEAL_LABELS[c]}`
          : `Nothing was logged for ${MEAL_LABELS[c]} yesterday`,
        { kind: created.length ? "success" : "info" }
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't copy", { kind: "error" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <DateNav date={date} onChange={setDate} />
        <button
          type="button"
          onClick={() => setAdding(suggestMeal())}
          className="btn btn-primary h-9 px-3.5 text-xs font-semibold shadow-xs"
          aria-label="Add food"
        >
          <Plus className="h-4 w-4" /> Add food
          <span className="kbd ml-1.5 hidden md:inline text-[10px]">N</span>
        </button>
      </header>

      {/* Error state */}
      {error && !day && (
        <div className="card flex items-center justify-between gap-3 px-4 py-3 text-sm" role="alert">
          <span className="text-fg-2">Couldn&apos;t load this day: {error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => refresh()}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state skeleton */}
      {!day ? (
        !error && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading food log">
            <div className="skeleton h-56 rounded-xl" />
            {MEAL_CATEGORIES.map((c) => (
              <div key={c} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        )
      ) : (
        <>
          {/* Daily Nutrition Summary */}
          <DaySummary day={day} />

          {/* Meals List */}
          <div className="space-y-3">
            {MEAL_CATEGORIES.map((c) => (
              <MealSection
                key={c}
                category={c}
                entries={byMeal[c]}
                onAdd={setAdding}
                onEdit={setEditing}
                onCopyYesterday={copyYesterday}
                onSaveTemplate={(category, entries) => setSaving({ category, entries })}
                onCopyTo={(category, entries) => setCopying({ category, entries })}
              />
            ))}
          </div>
        </>
      )}

      {/* Dialogs & Sheets */}
      <AddFoodSheet
        open={adding !== null}
        onClose={() => setAdding(null)}
        date={date}
        initialMeal={adding ?? "lunch"}
      />
      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />
      <SaveTemplateSheet
        entries={saving?.entries ?? null}
        category={saving?.category ?? "lunch"}
        onClose={() => setSaving(null)}
      />
      <CopyToSheet
        entries={copying?.entries ?? null}
        category={copying?.category ?? "lunch"}
        fromDate={date}
        onClose={() => setCopying(null)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="skeleton h-56 rounded-xl" />}>
      <DashboardInner />
    </Suspense>
  );
}
