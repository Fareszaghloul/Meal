"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Copy, Layers } from "lucide-react";
import { DateNav } from "@/components/day/DateNav";
import { DaySummary } from "@/components/day/DaySummary";
import { DayVitals } from "@/components/day/DayVitals";
import { WeekStrip } from "@/components/day/WeekStrip";
import { MealSection } from "@/components/day/MealSection";
import { AddFoodSheet } from "@/components/day/AddFoodSheet";
import { EditEntrySheet } from "@/components/day/EditEntrySheet";
import { CopyToSheet, SaveTemplateSheet, CopyDaySheet } from "@/components/day/MealDialogs";
import { ApplyDayTemplateSheet, SaveDayTemplateSheet } from "@/components/day/DayTemplateDialogs";
import { WhatShouldIEatModal } from "@/components/day/WhatShouldIEatModal";
import { copyEntries, prefetchDay, useDay } from "@/lib/client/day-store";
import { MEAL_CATEGORIES, MEAL_LABELS, isMealCategory, type MealCategory, type MealItem } from "@/lib/domain";
import { suggestMeal } from "@/lib/meal-suggest";
import { addDays, isDateString, todayLocal } from "@/lib/dates";
import { toast } from "@/components/ui/Toast";
import { Menu } from "@/components/ui/primitives";

function DashboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlDate = params.get("date");
  const date = urlDate && isDateString(urlDate) ? urlDate : todayLocal();
  const { day, error, refresh } = useDay(date);

  const [adding, setAdding] = useState<MealCategory | null>(null);
  const [addingView, setAddingView] = useState<"search" | "manual">("search");
  const [editing, setEditing] = useState<MealItem | null>(null);
  const [saving, setSaving] = useState<{ category: MealCategory; entries: MealItem[] } | null>(null);
  const [copying, setCopying] = useState<{ category: MealCategory; entries: MealItem[] } | null>(null);
  const [copyingDayOpen, setCopyingDayOpen] = useState(false);
  const [applyingTemplateOpen, setApplyingTemplateOpen] = useState(false);
  const [savingDayTemplateOpen, setSavingDayTemplateOpen] = useState(false);
  const [whatShouldIEatOpen, setWhatShouldIEatOpen] = useState(false);

  const setDate = useCallback(
    (d: string) => {
      router.replace(d === todayLocal() ? pathname : `${pathname}?date=${d}`, { scroll: false });
    },
    [router, pathname]
  );

  // The tab bar's "+" menu links here as /?add=<meal>[&manual=1]: open the sheet once, then drop the params.
  const addParam = params.get("add");
  const manualParam = params.get("manual");
  useEffect(() => {
    if (!addParam || !isMealCategory(addParam)) return;
    setAddingView(manualParam === "1" ? "manual" : "search");
    setAdding(addParam);
    const next = new URLSearchParams(params.toString());
    next.delete("add");
    next.delete("manual");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [addParam, manualParam, params, pathname, router]);

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
        setAddingView("search");
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
    <div className="space-y-6">
      {/* Top Header */}
      <header className="space-y-3">
        <DateNav date={date} onChange={setDate} />
        {/* Desktop keeps every day action visible. Phones use the tab bar's "+" and the Meals menu below. */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => {
              setAddingView("search");
              setAdding(suggestMeal());
            }}
            className="btn btn-primary h-9 px-4 text-xs font-semibold"
            aria-label="Add food"
          >
            <Plus className="h-4 w-4" /> Add food
            <span className="kbd ml-1.5 hidden text-[10px] lg:inline">N</span>
          </button>
          <button
            type="button"
            onClick={() => setApplyingTemplateOpen(true)}
            className="btn btn-secondary h-9 px-3 text-xs font-medium"
            aria-label="Apply day template"
            title="Populate day from a saved day template"
          >
            <Layers className="mr-1 h-3.5 w-3.5" /> Template
          </button>
          {Boolean(day?.entries.length) && (
            <button
              type="button"
              onClick={() => setSavingDayTemplateOpen(true)}
              className="btn btn-secondary h-9 px-3 text-xs font-medium"
              aria-label="Save day as template"
              title="Save this day as a template"
            >
              Save day
            </button>
          )}
          <button
            type="button"
            onClick={() => setCopyingDayOpen(true)}
            className="btn btn-secondary h-9 px-3 text-xs font-medium"
            aria-label="Copy entire day"
            title="Copy all entries from another day"
          >
            <Copy className="mr-1 h-3.5 w-3.5" /> Copy day
          </button>
        </div>
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
            <div className="skeleton h-72 rounded-3xl" />
            {MEAL_CATEGORIES.map((c) => (
              <div key={c} className="skeleton h-14 rounded-2xl" />
            ))}
          </div>
        )
      ) : (
        <>
          <DaySummary day={day} onWhatToEat={() => setWhatShouldIEatOpen(true)} />

          <WeekStrip
            date={date}
            today={todayLocal()}
            goalCalories={day.goals.calories}
            live={{ calories: day.totals.calories, protein: day.totals.protein }}
            onSelectDate={setDate}
          />

          {/* Meals: one grouped card */}
          <section aria-label="Meals">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Meals</h2>
              <div className="md:hidden">
                <Menu
                  label="More day actions"
                  items={[
                    { label: "Apply day template", icon: <Layers className="h-4 w-4" />, onClick: () => setApplyingTemplateOpen(true) },
                    ...(day.entries.length ? [{ label: "Save day as template", onClick: () => setSavingDayTemplateOpen(true) }] : []),
                    { label: "Copy another day", icon: <Copy className="h-4 w-4" />, onClick: () => setCopyingDayOpen(true) },
                  ]}
                />
              </div>
            </div>
            <div className="card overflow-hidden">
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
          </section>

          <DayVitals day={day} />
        </>
      )}

      {/* Dialogs & Sheets */}
      <AddFoodSheet
        open={adding !== null}
        onClose={() => setAdding(null)}
        date={date}
        initialMeal={adding ?? "lunch"}
        initialView={addingView}
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
      <CopyDaySheet
        open={copyingDayOpen}
        toDate={date}
        existingCount={day?.entries.length ?? 0}
        onClose={() => setCopyingDayOpen(false)}
      />
      <ApplyDayTemplateSheet
        open={applyingTemplateOpen}
        date={date}
        existingCount={day?.entries.length ?? 0}
        onClose={() => setApplyingTemplateOpen(false)}
      />
      <SaveDayTemplateSheet
        open={savingDayTemplateOpen}
        day={day}
        onClose={() => setSavingDayTemplateOpen(false)}
      />
      <WhatShouldIEatModal
        isOpen={whatShouldIEatOpen}
        onClose={() => setWhatShouldIEatOpen(false)}
        date={date}
        onLogged={refresh}
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
